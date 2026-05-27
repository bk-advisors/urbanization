# africa-mmr-2030

D3 v7 scrolly-tell on African countries' maternal-mortality trajectories from 2023 to 2030. Companion to the static [`africa-mmr`](https://bk-advisors.github.io/africa-mmr/) bar chart; this one adds the forward-looking question: **which countries will actually hit SDG 3.1 (MMR < 70 per 100,000 live births) by 2030?**

Built from the `apps/africa-2050/` urbanization template — same engine (D3 v7, ES modules, AbortController per scene, click-by-click narration), new story.

## Headlines

- 54 African countries; **8** are at or below the SDG 3.1 line today; **10** are projected to land at or below it by 2030 at their long-run pace.
- The other **44** countries are off track. (Mauritius is currently below 70 but trending the wrong way, so it's not counted as on-track to 2030.)
- Cumulative excess maternal deaths 2024-2030 under status-quo trajectory: roughly **530,000** mothers (plausible range 450,000-600,000). Nigeria alone accounts for over half.

## Scenes

| # | Scene | Visual |
|---|---|---|
| 0 | `birthCohortIntro` | Faded Africa basemap + single-life narrative hook |
| 1 | `baselineChoropleth` | Africa choropleth, MMR 2023, SDG target marked on the legend |
| 2 | `targetBar` | Top-22 countries ranked, SDG target=70 reference line |
| 3 | `trendSmallMultiples` | 12-panel grid: 2000-2023 observed + 2024-2030 dashed projection. **Mode-switch**: long pace / post-2016 pace / on-pace |
| 4 | `raceTo2030` | Beeswarm "race" — every country a dot animated across years. Play / pause / scrub. The in-viz money shot. |
| 5 | `arrScatter` | Observed ARR (X) vs Required ARR (Y), y=x diagonal splits on-track/off-track. Bubble size = annual live births. **Mode-switch**: long / post-2016 |
| 6 | `gapTower` | Dot-towers — 1 dot = 1,000 cumulative excess deaths. Nigeria is a skyscraper. **Mode-switch**: long / post-2016 |
| 7 | `finalText` | Closing narration + **download share card** button (1200×630 PNG for LinkedIn) |

## URL parameters

- `?country=NGA` — opens the viz at the ARR scatter (scene 5) with the named country highlighted by a navy ring. The share-card on scene 7 then generates a country-specific 1200×630 PNG.

## Data

- **Source:** World Bank `SH.STA.MMRT` (= WHO/UNICEF/UNFPA/WBG/UNDESA Joint Estimates — MMEIG 2025 release). Wikipedia-canonical series.
- **Cohort sizing:** WB `SP.DYN.CBRT.IN` × total population.
- **Snapshotted** at build time into `data/raw/` to avoid CORS / rate-limit on GitHub Pages.
- **Projection math** (standard MMEIG):
  ```
  ARR_observed  = 1 - (MMR_2023 / MMR_2000)^(1/23)
  ARR_required  = 1 - (70 / MMR_2023)^(1/7)
  MMR_2030_long = MMR_2023 * (1 - ARR_observed)^7
  on_track      = ARR_observed ≥ ARR_required
  ```

## Build / refresh data

```bash
python apps/africa-mmr-2030/data/raw/_build_data.py
```

Fetches the WB API (caches raw JSON), recomputes ARRs + projections, writes `data/countries.js` + `data/mmr.js` (ES modules consumed by `js/main.js`). The script also runs a sanity audit against `../../../africa-mmr/data/africa_mmr.csv` if available.

## Local dev

From the urbanization repo root:

```bash
python -m http.server 8000
# then open http://localhost:8000/apps/africa-mmr-2030/
```

Keyboard nav: ←/→ navigate, 1/2/3 swap the active pace mode.

## Deploy

Mirroring the `africa-2035` pattern, this app ships to a separate public repo:

```bash
git subtree split --prefix=apps/africa-mmr-2030 -b mmr-2030-deploy
git push https://github.com/bk-advisors/africa-mmr-2030.git mmr-2030-deploy:main --force
```

Public URL once the repo exists: `https://bk-advisors.github.io/africa-mmr-2030/`.

## Palette

BKA brand — matches the existing `africa-mmr` piece visually so the two read as a series.

- `#242852` BKA navy (ink, "2023")
- `#F8A623` BKA amber (SDG target line, accent)
- `#005CB9` BKA blue (on-track)
- `#BC4749` brick red (off-track, "2030", urgency)

## Citation

> World Bank, World Development Indicators (`SH.STA.MMRT`). Underlying source: WHO, UNICEF, UNFPA, World Bank Group and UNDESA/Population Division, *Trends in maternal mortality 2000 to 2023*, Geneva: WHO, 2025.
