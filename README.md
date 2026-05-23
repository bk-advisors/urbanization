# urbanization

Two narrative D3.js storytelling visualizations about how the world's cities grow, sharing a common scene-dispatcher pattern.

**Owner:** Matthew Kuch, Co-Founder of [BK-Advisors](https://bk-advisors.github.io/) — this work will be added to the [BK-Advisors visualization collection](https://bk-advisors.github.io/).

| App | Period | Source report | Status |
|---|---|---|---|
| [apps/africa-2050/](apps/africa-2050/) | 2025 → 2035 | UN DESA — *World Urbanization Prospects 2025* (city-proper, DEGURBA); narrative inspired by the OECD/AfDB/UNOPS-Cities Alliance/UCLG Africa (2025) report | In progress |
| [apps/east-asia-2010/](apps/east-asia-2010/) | 2000 → 2010 | World Bank — *East Asia's Changing Urban Landscape* (PUMA) | Archive — original 2015 piece by Nadieh Bremer |

## Run locally

This is a static site — no build step.

```sh
python -m http.server 8000
```

Then open <http://localhost:8000/> for the landing page, or jump straight into an app:
- <http://localhost:8000/apps/africa-2050/>
- <http://localhost:8000/apps/east-asia-2010/>

## Deploy

The Africa viz is published from a separate repo `bk-advisors/africa-2035`. Public URL:

> **https://bk-advisors.github.io/africa-2035/**

The published repo holds the contents of [apps/africa-2050/](apps/africa-2050/) flattened to root (no `apps/` prefix). The east-asia archive and planning docs remain in this working repo. Redeploy mechanics in [CLAUDE.md](CLAUDE.md).

## Repo layout

```
.
├── index.html              # Landing page linking both apps
├── apps/
│   ├── africa-2050/        # New build — D3 v7, ES modules
│   └── east-asia-2010/     # Archived original — D3 v3
├── docs/                   # Architecture document + build kanban
└── source reports/         # PDFs (gitignored)
```

## Credits

- **Original visualization (East Asia 2010)** — Visuals by Nadieh Bremer ([VisualCinnamon.com](https://www.visualcinnamon.com)); text by Nadieh Bremer & Marlieke Ranzijn; inspired by the [World Bank report](http://www.worldbank.org/en/topic/urbandevelopment/publication/east-asias-changing-urban-landscape-measuring-a-decade-of-spatial-growth); data from [World Bank open & PUMA datasets](http://puma.worldbank.org/downloads).
- **Africa 2050 build** — Based on the Africapolis dataset and the OECD et al. (2025) report *Africa's Urbanisation Dynamics 2025: Planning for Urban Expansion*, [doi.org/10.1787/2a47845c-en](https://doi.org/10.1787/2a47845c-en).
