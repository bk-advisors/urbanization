"""Build data/mmr.js + data/countries.js from World Bank SH.STA.MMRT.

Snapshots the WB API responses to data/raw/ so the live viz never hits the
network. Cross-validates 2023 baselines against the existing africa-mmr CSV.

Run from the repo root:
    python apps/africa-mmr-2030/data/raw/_build_data.py
"""
from __future__ import annotations

import json
import math
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent              # .../data/raw
DATA = HERE.parent                                   # .../data
APP = DATA.parent                                    # .../africa-mmr-2030
URBAN_COUNTRIES_JS = APP.parent / "africa-2050" / "data" / "countries.js"
AUDIT_CSV = APP.parent.parent / "africa-mmr" / "data" / "africa_mmr.csv"
# Note: AUDIT_CSV lives outside this repo; only used for sanity-check if present.

SDG_TARGET = 70.0
BASE_YEAR = 2023
TARGET_YEAR = 2030
YEARS_AHEAD = TARGET_YEAR - BASE_YEAR  # 7

# --- 54 African ISO3 codes pulled from africa-2050/data/countries.js ---
AFRICA_ISO3 = [
    "DZA", "AGO", "BEN", "BWA", "BFA", "BDI", "CPV", "CMR", "CAF", "TCD",
    "COM", "COG", "COD", "CIV", "DJI", "EGY", "GNQ", "ERI", "SWZ", "ETH",
    "GAB", "GMB", "GHA", "GIN", "GNB", "KEN", "LSO", "LBR", "LBY", "MDG",
    "MWI", "MLI", "MRT", "MUS", "MAR", "MOZ", "NAM", "NER", "NGA", "RWA",
    "STP", "SEN", "SYC", "SLE", "SOM", "ZAF", "SSD", "SDN", "TZA", "TGO",
    "TUN", "UGA", "ZMB", "ZWE",
]

WB_BASE = "https://api.worldbank.org/v2"


def fetch_wb(indicator: str, date_range: str, cache_name: str) -> list[dict]:
    """Fetch a WB indicator for all countries; cache JSON response."""
    cache = HERE / cache_name
    if cache.exists():
        print(f"[cache] {cache.name}")
        with cache.open("r", encoding="utf-8") as f:
            payload = json.load(f)
    else:
        url = f"{WB_BASE}/country/all/indicator/{indicator}?format=json&date={date_range}&per_page=20000"
        print(f"[fetch] {url}")
        req = urllib.request.Request(url, headers={"User-Agent": "africa-mmr-2030/1.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        with cache.open("w", encoding="utf-8") as f:
            json.dump(payload, f)
    # WB returns [meta, [records]]
    if not isinstance(payload, list) or len(payload) < 2 or payload[1] is None:
        print(f"[error] unexpected payload shape for {indicator}", file=sys.stderr)
        sys.exit(1)
    return payload[1]


def index_by_country_year(records: list[dict]) -> dict[str, dict[int, float]]:
    """Reshape WB rows into {iso3: {year: value}}."""
    out: dict[str, dict[int, float]] = {}
    for r in records:
        iso3 = (r.get("countryiso3code") or "").strip()
        if iso3 not in AFRICA_ISO3:
            continue
        v = r.get("value")
        if v is None:
            continue
        year = int(r["date"])
        out.setdefault(iso3, {})[year] = float(v)
    return out


def load_urban_countries() -> dict[str, dict]:
    """Pull the country-name + total_pop_2025 lookup from africa-2050."""
    txt = URBAN_COUNTRIES_JS.read_text(encoding="utf-8")
    # Extract the array literal between [{ and }]; the file is JSON-compatible
    # inside the export.
    start = txt.find("[{")
    end = txt.rfind("}]") + 2
    arr = json.loads(txt[start:end])
    return {c["iso3"]: c for c in arr}


def main() -> None:
    # --- Fetch ---
    mmr_records = fetch_wb("SH.STA.MMRT", "2000:2023", "mmr_wb.json")
    cbrt_records = fetch_wb("SP.DYN.CBRT.IN", "2020:2023", "cbrt_wb.json")
    mmr_idx = index_by_country_year(mmr_records)
    cbrt_idx = index_by_country_year(cbrt_records)
    urban = load_urban_countries()

    # --- Per-country computed table ---
    countries_out = []
    for iso3 in AFRICA_ISO3:
        series = mmr_idx.get(iso3, {})
        if BASE_YEAR not in series:
            print(f"[skip] {iso3} — no {BASE_YEAR} MMR", file=sys.stderr)
            continue
        mmr_2023 = series[BASE_YEAR]

        # Long-run ARR (2000 → 2023)
        mmr_2000 = series.get(2000)
        arr_long = None
        if mmr_2000 and mmr_2023 > 0 and mmr_2000 > 0:
            arr_long = 1 - (mmr_2023 / mmr_2000) ** (1 / 23)

        # Recent ARR (2016 → 2023)
        mmr_2016 = series.get(2016)
        arr_recent = None
        if mmr_2016 and mmr_2023 > 0 and mmr_2016 > 0:
            arr_recent = 1 - (mmr_2023 / mmr_2016) ** (1 / 7)

        # Required ARR to hit SDG target from 2023 → 2030
        # Only meaningful when current MMR > target.
        if mmr_2023 > SDG_TARGET:
            arr_required = 1 - (SDG_TARGET / mmr_2023) ** (1 / YEARS_AHEAD)
        else:
            arr_required = 0.0  # already below target

        # Projected 2030 MMR under each trajectory
        proj_long = mmr_2023 * (1 - arr_long) ** YEARS_AHEAD if arr_long is not None else None
        proj_recent = mmr_2023 * (1 - arr_recent) ** YEARS_AHEAD if arr_recent is not None else None

        # On-track: projected to land at or below the SDG target by 2030 under
        # the long-run pace. Note this drops countries that are currently below
        # the line but trending the wrong way (e.g. Mauritius), which is the
        # honest reading — being currently fine while drifting worse is NOT
        # "on track to hit SDG 3.1 by 2030".
        on_track = proj_long is not None and proj_long <= SDG_TARGET

        # Annual live births: total pop × crude birth rate (per 1000)
        cbrt_series = cbrt_idx.get(iso3, {})
        cbrt = cbrt_series.get(2023) or cbrt_series.get(2022) or cbrt_series.get(2021) or cbrt_series.get(2020)
        total_pop_2025_k = urban.get(iso3, {}).get("total_pop_2025")  # in thousands
        births_2023_k = None  # thousands of births per year
        if cbrt is not None and total_pop_2025_k is not None:
            births_2023_k = total_pop_2025_k * cbrt / 1000.0

        # Cumulative excess maternal deaths 2024..2030 under long-run pace vs.
        # an on-pace trajectory (linear straight to target). Both use the same
        # constant births_2023 cohort (close enough at 7-year horizon).
        lives_gap = None
        if births_2023_k is not None and proj_long is not None:
            total = 0.0
            for yr_idx in range(1, YEARS_AHEAD + 1):  # 2024..2030
                t = yr_idx / YEARS_AHEAD
                mmr_observed_t = mmr_2023 * (1 - arr_long) ** yr_idx if arr_long is not None else mmr_2023
                mmr_onpace_t = mmr_2023 + (SDG_TARGET - mmr_2023) * t
                delta = max(mmr_observed_t - mmr_onpace_t, 0)
                deaths = births_2023_k * 1000.0 * delta / 1e5  # absolute deaths/year
                total += deaths
            lives_gap = total  # absolute deaths over 7 years

        # Same for "recent pace" — usually larger
        lives_gap_recent = None
        if births_2023_k is not None and proj_recent is not None:
            total = 0.0
            for yr_idx in range(1, YEARS_AHEAD + 1):
                t = yr_idx / YEARS_AHEAD
                mmr_observed_t = mmr_2023 * (1 - arr_recent) ** yr_idx if arr_recent is not None else mmr_2023
                mmr_onpace_t = mmr_2023 + (SDG_TARGET - mmr_2023) * t
                delta = max(mmr_observed_t - mmr_onpace_t, 0)
                deaths = births_2023_k * 1000.0 * delta / 1e5
                total += deaths
            lives_gap_recent = total

        countries_out.append({
            "iso3": iso3,
            "name": urban.get(iso3, {}).get("name", iso3),
            "mmr_2000": round(mmr_2000, 1) if mmr_2000 else None,
            "mmr_2016": round(mmr_2016, 1) if mmr_2016 else None,
            "mmr_2023": round(mmr_2023, 1),
            "arr_long": round(arr_long, 4) if arr_long is not None else None,
            "arr_recent": round(arr_recent, 4) if arr_recent is not None else None,
            "arr_required": round(arr_required, 4),
            "mmr_2030_long": round(proj_long, 1) if proj_long is not None else None,
            "mmr_2030_recent": round(proj_recent, 1) if proj_recent is not None else None,
            "on_track": on_track,
            "births_2023_k": round(births_2023_k, 1) if births_2023_k is not None else None,
            "lives_gap": round(lives_gap) if lives_gap is not None else None,
            "lives_gap_recent": round(lives_gap_recent) if lives_gap_recent is not None else None,
        })

    countries_out.sort(key=lambda c: c["mmr_2023"], reverse=True)

    # --- Full time-series for trends + race-to-2030 ---
    series_out = []
    for iso3 in AFRICA_ISO3:
        s = mmr_idx.get(iso3, {})
        name = urban.get(iso3, {}).get("name", iso3)
        for year, value in sorted(s.items()):
            series_out.append({"iso3": iso3, "name": name, "year": year, "mmr": round(value, 1)})

    # --- Write ES modules ---
    countries_js = DATA / "countries.js"
    mmr_js = DATA / "mmr.js"

    header = (
        "// Africa SDG 3.1 — maternal mortality 2023 baseline + 2030 projections.\n"
        "// Source: World Bank WDI SH.STA.MMRT (= MMEIG Joint Estimates).\n"
        "// https://data.worldbank.org/indicator/SH.STA.MMRT\n"
        "// Underlying: WHO, UNICEF, UNFPA, World Bank Group and UNDESA/Population Division,\n"
        '// "Trends in maternal mortality 2000 to 2023", Geneva: WHO, 2025.\n'
        "// Crude birth rate (for cohort sizing): WB SP.DYN.CBRT.IN.\n"
        "// Built by data/raw/_build_data.py.\n"
    )

    countries_js.write_text(
        header
        + "\n"
        + "// Fields:\n"
        + "//   mmr_2023        — baseline maternal mortality ratio (deaths/100,000 live births)\n"
        + "//   arr_long        — annual rate of reduction, 2000→2023 (fraction/year)\n"
        + "//   arr_recent      — annual rate of reduction, 2016→2023 (post-MDG slowdown era)\n"
        + "//   arr_required    — ARR needed 2023→2030 to land at MMR=70\n"
        + "//   mmr_2030_long   — projected 2030 MMR if long-run pace continues\n"
        + "//   mmr_2030_recent — projected 2030 MMR if post-2016 pace continues\n"
        + "//   on_track        — true iff long-run pace lands ≤70 by 2030\n"
        + "//   births_2023_k   — annual live births in thousands\n"
        + "//   lives_gap       — cumulative excess maternal deaths 2024-2030 (long-run pace vs. on-pace)\n"
        + "//   lives_gap_recent — same, using post-2016 pace\n\n"
        + "export const countries = "
        + json.dumps(countries_out, ensure_ascii=False)
        + ";\n",
        encoding="utf-8",
    )

    mmr_js.write_text(
        header
        + "\n"
        + "// Long-format time series, 2000-2023, all countries × all years where reported.\n\n"
        + "export const mmr = "
        + json.dumps(series_out, ensure_ascii=False)
        + ";\n",
        encoding="utf-8",
    )

    # --- Sanity-check against existing africa-mmr CSV (if accessible) ---
    if AUDIT_CSV.exists():
        import csv
        diffs = []
        with AUDIT_CSV.open("r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            audit = {row["country_code"]: float(row["mmr"]) for row in reader}
        for c in countries_out:
            other = audit.get(c["iso3"])
            if other is None:
                continue
            delta = abs(c["mmr_2023"] - other)
            pct = delta / other * 100 if other else 0
            if pct > 5:
                diffs.append((c["iso3"], c["mmr_2023"], round(other, 1), round(pct, 1)))
        if diffs:
            print("\n[audit] countries where our SH.STA.MMRT differs >5% from africa-mmr CSV:")
            for d in diffs:
                print(f"  {d[0]}: ours={d[1]} theirs={d[2]} ({d[3]}%)")
        else:
            print("\n[audit] all overlapping countries within 5% of africa-mmr CSV — ✓")

    # --- Summary ---
    on_track_list = [c for c in countries_out if c["on_track"]]
    below_target = [c for c in countries_out if c["mmr_2023"] <= SDG_TARGET]
    print(f"\nCountries: {len(countries_out)}/{len(AFRICA_ISO3)}")
    print(f"At/under SDG target in 2023: {len(below_target)} — "
          f"{', '.join(c['iso3'] for c in below_target)}")
    print(f"On-track to hit SDG 3.1 by 2030 (long-run pace): {len(on_track_list)} — "
          f"{', '.join(c['iso3'] for c in on_track_list)}")
    print(f"\nWrote: {countries_js}")
    print(f"Wrote: {mmr_js}")


if __name__ == "__main__":
    main()
