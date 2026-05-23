"""Curates raw UN World Urbanization Prospects 2025 + Natural Earth files into
slim ES modules + GeoJSON that the Africa viz consumes statically.

Why UN WUP and not Africapolis:
    Africapolis is an agglomeration-fusion dataset — its 2050 projections model
    spatial merging (Nairobi reaches 57 M only because surrounding clusters fuse
    into it). That's the OECD report's analytical point, but for general audiences
    those numbers are jarring. UN WUP uses the EU Degree of Urbanization (DEGURBA)
    methodology, which is more conservative and produces the city-proper figures
    audiences recognize (Cairo ~26 M in 2025, Lagos ~13 M, etc.).

Time horizon: 2025 → 2035 (10 years).
    Mirrors Nadieh Bremer's original 2000 → 2010 horizon, and 10-year-out
    projections are easier for audiences to imagine than 25-year-out ones.

Inputs (in data/raw/wup2025/, gitignored):
    WUP2025-F21-DEGURBA-Cities_Pop.xlsx           ~11 MB  city populations 1975-2050 (1000s)
    WUP2025-F25-DEGURBA-Cities_AREA_km2.xlsx       ~7 MB  city areas 1975-2050 (km²)
    WUP2025-F01-Degree-of-Urbanization_Pop_by_category.xlsx  ~2 MB  country urban/rural pop

Input (in data/raw/, gitignored):
    ne_110m_countries.geojson  Natural Earth admin-0 basemap

Outputs (in data/, committed):
    africa_countries.geojson  Slim GeoJSON: just Africa, trimmed props
    cities.js                 ES module exporting cities[] (~328 African cities ≥300K)
    countries.js              ES module exporting countries[] (54 African sovereigns)
"""

from __future__ import annotations

import json
from pathlib import Path

import openpyxl

DATA_DIR = Path(__file__).parent
RAW = DATA_DIR / "raw"
WUP = RAW / "wup2025"

SOVEREIGN_ISO = {
    "AGO", "BDI", "BEN", "BFA", "BWA", "CAF", "CIV", "CMR", "COD", "COG",
    "COM", "CPV", "DJI", "DZA", "EGY", "ERI", "ETH", "GAB", "GHA", "GIN",
    "GMB", "GNB", "GNQ", "KEN", "LBR", "LBY", "LSO", "MAR", "MDG", "MLI",
    "MOZ", "MRT", "MUS", "MWI", "NAM", "NER", "NGA", "RWA", "SDN", "SEN",
    "SLE", "SOM", "SSD", "STP", "SWZ", "SYC", "TCD", "TGO", "TUN", "TZA",
    "UGA", "ZAF", "ZMB", "ZWE",
}

BASE_YEAR = "2025"
PROJ_YEAR = "2035"
MIN_POP_2025_THOUSANDS = 300  # UN's standard inclusion threshold


def _column_index(header: list[str], name: str) -> int:
    return header.index(name)


def _load_sheet(path: Path, sheet: str) -> tuple[list[str], list[tuple]]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[sheet]
    rows_iter = ws.iter_rows(values_only=True)
    header = [str(c) if c is not None else "" for c in next(rows_iter)]
    rows = list(rows_iter)
    return header, rows


def build_basemap() -> None:
    src = json.loads((RAW / "ne_110m_countries.geojson").read_text(encoding="utf-8"))
    keep = {"ISO_A3", "ADM0_A3", "NAME", "NAME_LONG", "SUBREGION"}
    africa = []
    for f in src["features"]:
        if f["properties"].get("CONTINENT") != "Africa":
            continue
        africa.append({
            "type": "Feature",
            "properties": {k: f["properties"].get(k) for k in keep},
            "geometry": f["geometry"],
        })
    out = {"type": "FeatureCollection", "features": africa}
    (DATA_DIR / "africa_countries.geojson").write_text(
        json.dumps(out, separators=(",", ":")), encoding="utf-8"
    )
    print(f"  africa_countries.geojson: {len(africa)} features")


def build_cities() -> None:
    """Join F21 (pop) + F25 (area) by City_Code, filter to African sovereigns
    with pop_2025 ≥ 300K, output {id, name, iso3, lng, lat, pop_2025, pop_2035,
    land_2025, land_2035, density_2025, density_2035, capital}."""
    pop_header, pop_rows = _load_sheet(
        WUP / "WUP2025-F21-DEGURBA-Cities_Pop.xlsx", "Data"
    )
    area_header, area_rows = _load_sheet(
        WUP / "WUP2025-F25-DEGURBA-Cities_AREA_km2.xlsx", "Data"
    )

    def cols(header: list[str]) -> dict[str, int]:
        return {n: header.index(n) for n in (
            "City_Code", "City_Name", "ISO3_Code", "Capital",
            "PWCent_Longitude", "PWCent_Latitude", BASE_YEAR, PROJ_YEAR,
        )}

    pc, ac = cols(pop_header), cols(area_header)

    # Build area lookup by City_Code.
    area_by_id: dict[int, tuple] = {}
    for r in area_rows:
        cid = r[ac["City_Code"]]
        if cid is None:
            continue
        area_by_id[cid] = r

    cities: list[dict] = []
    for pr in pop_rows:
        iso = pr[pc["ISO3_Code"]]
        if iso not in SOVEREIGN_ISO:
            continue
        pop_2025 = pr[pc[BASE_YEAR]]
        pop_2035 = pr[pc[PROJ_YEAR]]
        if not isinstance(pop_2025, (int, float)) or pop_2025 < MIN_POP_2025_THOUSANDS:
            continue
        cid = pr[pc["City_Code"]]
        ar = area_by_id.get(cid)
        land_2025 = ar[ac[BASE_YEAR]] if ar else None
        land_2035 = ar[ac[PROJ_YEAR]] if ar else None

        # Density = pop (people) / area (km²). pop is in thousands, multiply by 1000.
        def density(pop_k, land):
            if not (isinstance(pop_k, (int, float)) and isinstance(land, (int, float)) and land > 0):
                return None
            return round(pop_k * 1000 / land, 0)

        cities.append({
            "id": cid,
            "name": pr[pc["City_Name"]],
            "iso3": iso,
            "lng": round(pr[pc["PWCent_Longitude"]], 4),
            "lat": round(pr[pc["PWCent_Latitude"]], 4),
            # populations stored in thousands, same as the UN file
            "pop_2025": round(pop_2025, 1),
            "pop_2035": round(pop_2035, 1) if isinstance(pop_2035, (int, float)) else None,
            "land_2025": round(land_2025, 1) if isinstance(land_2025, (int, float)) else None,
            "land_2035": round(land_2035, 1) if isinstance(land_2035, (int, float)) else None,
            "density_2025": density(pop_2025, land_2025),
            "density_2035": density(pop_2035, land_2035),
            "capital": bool(pr[pc["Capital"]]),
        })

    cities.sort(key=lambda x: x["pop_2025"], reverse=True)

    js = (
        "// Africa cities — slim per-city dataset, 2025 baseline + 2035 projection.\n"
        "// Source: UN DESA Population Division, World Urbanization Prospects 2025\n"
        "//         (DEGURBA methodology). https://population.un.org/wup/\n"
        f"// {len(cities)} African cities with population ≥ {MIN_POP_2025_THOUSANDS},000 in {BASE_YEAR}.\n"
        "// pop_* in thousands of people; land_* in km²; density_* in people/km².\n"
        "// Sorted by pop_2025 descending. Built by data/_build_data.py.\n\n"
        "export const cities = " + json.dumps(cities, separators=(",", ":")) + ";\n"
    )
    (DATA_DIR / "cities.js").write_text(js, encoding="utf-8")
    print(f"  cities.js: {len(cities)} records, "
          f"{(DATA_DIR / 'cities.js').stat().st_size / 1024:.0f} KB")


def build_countries() -> None:
    """For each African sovereign, derive country-level aggregates from F01:
    {iso3, name, urban_pop_2025, urban_pop_2035, total_pop_2025, total_pop_2035,
    urban_rate_2025, urban_rate_2035}. Populations are in thousands."""

    def by_iso(sheet_name: str) -> dict[str, dict[str, float]]:
        header, rows = _load_sheet(
            WUP / "WUP2025-F01-Degree-of-Urbanization_Pop_by_category.xlsx",
            sheet_name,
        )
        i_iso, i_name = header.index("ISO3_Code"), header.index("Location")
        i_b, i_p = header.index(BASE_YEAR), header.index(PROJ_YEAR)
        out: dict[str, dict] = {}
        for r in rows:
            iso = r[i_iso]
            if iso not in SOVEREIGN_ISO:
                continue
            out[iso] = {
                "name": r[i_name],
                BASE_YEAR: r[i_b] if isinstance(r[i_b], (int, float)) else 0.0,
                PROJ_YEAR: r[i_p] if isinstance(r[i_p], (int, float)) else 0.0,
            }
        return out

    cities = by_iso("Cities")        # population living in Cities (DEGURBA Level 1)
    cities_towns = by_iso("Cities and Towns")  # = urban population (UN definition)
    total = by_iso("Total")          # total population

    countries: list[dict] = []
    for iso in sorted(SOVEREIGN_ISO):
        c = cities_towns.get(iso) or cities.get(iso) or total.get(iso)
        if not c:
            continue
        upop_25 = (cities_towns.get(iso) or {}).get(BASE_YEAR, 0)
        upop_35 = (cities_towns.get(iso) or {}).get(PROJ_YEAR, 0)
        tpop_25 = (total.get(iso) or {}).get(BASE_YEAR, 0)
        tpop_35 = (total.get(iso) or {}).get(PROJ_YEAR, 0)
        countries.append({
            "iso3": iso,
            "name": c["name"],
            "urban_pop_2025": round(upop_25, 0),
            "urban_pop_2035": round(upop_35, 0),
            "total_pop_2025": round(tpop_25, 0),
            "total_pop_2035": round(tpop_35, 0),
            "urban_rate_2025": round(upop_25 / tpop_25, 4) if tpop_25 else 0,
            "urban_rate_2035": round(upop_35 / tpop_35, 4) if tpop_35 else 0,
        })

    countries.sort(key=lambda x: x["urban_pop_2035"], reverse=True)

    js = (
        "// Africa countries — country-level urbanisation aggregates, 2025 + 2035.\n"
        "// Source: UN DESA Population Division, World Urbanization Prospects 2025\n"
        "//         File F01 (DEGURBA Pop by category). https://population.un.org/wup/\n"
        f"// {len(countries)} sovereign African countries.\n"
        "// All populations in thousands of people; urban_rate as fraction 0..1.\n"
        "// Sorted by urban_pop_2035 descending. Built by data/_build_data.py.\n\n"
        "export const countries = " + json.dumps(countries, separators=(",", ":")) + ";\n"
    )
    (DATA_DIR / "countries.js").write_text(js, encoding="utf-8")
    print(f"  countries.js: {len(countries)} records, "
          f"{(DATA_DIR / 'countries.js').stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    print("Building curated data for apps/africa-2050/data/ …")
    build_basemap()
    build_cities()
    build_countries()
    print("Done.")
