# Africa 2025→2035 — Data

Committed files (consumed by the viz):

| File | Records | Size | Notes |
|---|---:|---:|---|
| `cities.js` | ~328 | ~64 KB | African cities ≥300K (UN threshold), sorted by `pop_2025` desc |
| `countries.js` | 54 | ~11 KB | 54 sovereign African countries |
| `africa_countries.geojson` | 51 | ~56 KB | Natural Earth 1:110m basemap, Africa only |

Plus `_check.html` — a QA page to spot-check the slim outputs in a browser.

## Why UN WUP and not Africapolis

Africapolis (the OECD report's underlying dataset) projects spatial **fusion** of urban clusters — by 2050 Nairobi reaches 57 M only because surrounding clusters merge into a single mega-region. That's the OECD's analytical point, but for general audiences those numbers are jarring.

UN World Urbanization Prospects uses the EU **Degree of Urbanization (DEGURBA)** methodology, which is more conservative and produces the city-proper figures audiences recognize (Cairo ~26 M in 2025, Lagos ~13 M).

**Time horizon: 2025 → 2035** (10 years). Mirrors Nadieh Bremer's 2000 → 2010 horizon and keeps projections in range audiences can easily imagine.

## Schema

### `cities[]` (from `cities.js`)

```ts
{ id, name, iso3, lng, lat, capital,
  pop_2025,   pop_2035,       // thousands of people
  land_2025,  land_2035,      // km² (urban functional area)
  density_2025, density_2035  // people / km²
}
```

### `countries[]` (from `countries.js`)

```ts
{ iso3, name,
  urban_pop_2025, urban_pop_2035,    // thousands
  total_pop_2025, total_pop_2035,    // thousands
  urban_rate_2025, urban_rate_2035   // 0..1
}
```

## Regenerating the curated files

Raw upstream files (~20 MB) are gitignored. To rebuild:

```sh
mkdir -p apps/africa-2050/data/raw/wup2025
cd apps/africa-2050/data/raw/wup2025
curl -L -O "https://population.un.org/wup/assets/Download/Cities/WUP2025-F21-DEGURBA-Cities_Pop.xlsx"
curl -L -O "https://population.un.org/wup/assets/Download/Cities/WUP2025-F25-DEGURBA-Cities_AREA_km2.xlsx"
curl -L -O "https://population.un.org/wup/assets/Download/Countries%20and%20Aggregates/WUP2025-F01-Degree-of-Urbanization_Pop_by_category.xlsx"
cd ..
curl -L -o ne_110m_countries.geojson "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
cd ../../../..
python apps/africa-2050/data/_build_data.py
```

## Sources & licensing

- **UN WUP 2025** — UN DESA Population Division, *World Urbanization Prospects 2025*, <https://population.un.org/wup/>. Free reuse with attribution.
- **Natural Earth** — public domain, <https://www.naturalearthdata.com>.
- **Narrative inspiration** — OECD/AfDB/UNOPS-Cities Alliance/UCLG Africa (2025), *Africa's Urbanisation Dynamics 2025: Planning for Urban Expansion*, <https://doi.org/10.1787/2a47845c-en>.
