"""Generates docs/ARCHITECTURE.docx and docs/KANBAN.xlsx for the Africa 2050 build.

Re-run any time the plan or feature list changes:
    python docs/_generate_docs.py

The kanban is overwritten on each run, so move it to KANBAN.xlsx.bak first
if you've manually edited statuses you want to preserve.
"""

from pathlib import Path

from docx import Document
from docx.shared import Pt, RGBColor
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

DOCS_DIR = Path(__file__).parent


# ---------------------------------------------------------------------------
# ARCHITECTURE.docx
# ---------------------------------------------------------------------------

def build_architecture_doc(path: Path) -> None:
    doc = Document()

    title = doc.add_heading("Africa's Urbanisation Dynamics 2050", level=0)
    subtitle = doc.add_paragraph()
    run = subtitle.add_run("Architecture & build specification")
    run.italic = True
    run.font.size = Pt(12)
    owner = doc.add_paragraph()
    owner_run = owner.add_run("Owner: Matthew Kuch, Co-Founder, BK-Advisors  ·  ")
    owner_run.font.size = Pt(10)
    link_run = owner.add_run("https://bk-advisors.github.io/")
    link_run.font.size = Pt(10)
    link_run.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)

    doc.add_heading("1. Background & inspiration", level=1)
    doc.add_paragraph(
        "This build re-creates Nadieh Bremer's 2015 narrative D3 visualization of East "
        "Asian urbanization (2000–2010), but applied to Africa using UN World Urbanization "
        "Prospects 2025 data, with narrative framing inspired by the OECD/AfDB/UNOPS-Cities "
        "Alliance/UCLG Africa (2025) report \"Africa's Urbanisation Dynamics 2025: "
        "Planning for Urban Expansion\"."
    )
    doc.add_paragraph(
        "Time horizon: 2025 → 2035 (10 years), matching Nadieh's original 2000 → 2010 "
        "span and keeping projections in a range audiences can easily imagine."
    )
    doc.add_paragraph(
        "Data source: UN WUP 2025 uses the EU Degree of Urbanization (DEGURBA) methodology, "
        "which produces conservative city-proper figures (Cairo ~26 M in 2025, Lagos ~13 M). "
        "An earlier prototype used Africapolis, but its spatial-fusion projections (Nairobi "
        "reaching 57 M by 2050) were too jarring for general audiences. The OECD report's "
        "three primary metrics — urban population, urban land area, and population density — "
        "remain the radio-button switcher dimensions, mirroring Nadieh's pattern."
    )

    doc.add_heading("2. High-level architecture", level=1)
    doc.add_paragraph(
        "Both apps share a scene-dispatcher pattern: a counter (0–9) drives a step "
        "function that calls one scene module per value. The new build modernizes the "
        "pattern with ES modules, D3 v7, and AbortController-based scene cancellation."
    )
    bullets = [
        "Scene dispatcher: js/main.js owns the global state object {counter, modus, rVar} "
        "and dispatches to one scene module per counter value.",
        "Scene cancellation: each transition gets an AbortSignal; scene changes abort the "
        "previous controller, which interrupts any in-flight d3.transition().",
        "Mode switch: three radio buttons (population / land / density) re-render the "
        "active scene via a small registry keyed by modus.",
        "Data: bundled as ES modules so the site stays static (no fetch except basemap).",
        "Deploy: GitHub Pages from the gh-pages branch; root index.html is a landing page "
        "linking both apps.",
    ]
    for b in bullets:
        doc.add_paragraph(b, style="List Bullet")

    doc.add_heading("3. Module map (apps/africa-2050/)", level=1)
    table = doc.add_table(rows=1, cols=2)
    table.style = "Light List Accent 1"
    hdr = table.rows[0].cells
    hdr[0].text = "File"
    hdr[1].text = "Responsibility"
    rows = [
        ("index.html", "Entry point; defines DOM scaffolding (chart, callouts, stepper)."),
        ("js/main.js", "SVG setup, global state, order() dispatcher, button wiring."),
        ("js/helpers.js", "Number formatters, bar-chart factory, callout-table updater, stepper."),
        ("js/scenes/introText.js", "Step 0 — opening narrative."),
        ("js/scenes/startBar.js", "Step 1 — two-bar comparison of 2025 vs 2035 totals."),
        ("js/scenes/introduceCities.js", "Step 1/2 transition — fade cities onto map."),
        ("js/scenes/totalAreaMap.js", "Step 2 — map of cities sized by metric."),
        ("js/scenes/introSlope.js", "Step 3 — setup for slope graph."),
        ("js/scenes/slopeGraph.js", "Step 4 — top-N cities slope 2025 → 2035."),
        ("js/scenes/introDotHistogram.js", "Step 5 — setup for dot histogram."),
        ("js/scenes/dotHistogram.js", "Step 6 — % growth distribution across cities."),
        ("js/scenes/introUrbanScatter.js", "Step 7 — setup for country scatter."),
        ("js/scenes/urbanPopDot.js", "Step 8 — country-level scatter."),
        ("js/scenes/finalText.js", "Step 9 — closing narrative on governance & finance."),
        ("data/cities.js", "Per-city WUP 2025 records (ES module export)."),
        ("data/countries.js", "54-country aggregates."),
        ("data/africa_countries.geojson", "Africa basemap GeoJSON."),
    ]
    for f, r in rows:
        row = table.add_row().cells
        row[0].text = f
        row[1].text = r

    doc.add_heading("4. Data schema", level=1)
    doc.add_paragraph("cities[] — one record per African city ≥300K in 2025 (~328 cities):")
    schema = [
        ("name", "string", "City name (UN WUP / DEGURBA)"),
        ("iso3", "ISO3", "Country code, e.g. NGA, EGY"),
        ("lng / lat", "number", "Population-weighted centroid (degrees)"),
        ("pop_2025 / pop_2035", "number", "Population in thousands"),
        ("land_2025 / land_2035", "number", "Urban functional area in km²"),
        ("density_2025 / density_2035", "number", "people / km², derived"),
        ("capital", "bool", "National capital flag"),
    ]
    t = doc.add_table(rows=1, cols=3)
    t.style = "Light List Accent 1"
    h = t.rows[0].cells
    h[0].text = "Field"; h[1].text = "Type"; h[2].text = "Notes"
    for f, ty, n in schema:
        r = t.add_row().cells
        r[0].text = f; r[1].text = ty; r[2].text = n

    doc.add_heading("5. Build & deploy", level=1)
    doc.add_paragraph(
        "Static site; no build pipeline. Local dev: python -m http.server 8000 at the "
        "repo root, then browse to http://localhost:8000/. Deploy by committing to the "
        "gh-pages branch — GitHub Pages serves the root index.html and both apps."
    )

    doc.add_heading("6. Phase plan", level=1)
    phases = [
        ("Phase 0", "Repo restructure & hygiene — move original to apps/east-asia-2010/, "
                    "scaffold apps/africa-2050/, write landing page, set up docs/."),
        ("Phase 1", "Acquire Africapolis open data (or fall back to PDF-extracted subset). "
                    "Produce agglomerations.js, countries.js, africa_countries.json."),
        ("Phase 2", "Port engine from D3 v3 to v7. main.js owns state + dispatcher; "
                    "helpers.js holds shared utilities; scene cancellation via AbortController."),
        ("Phase 3", "Author the 10 scene modules one by one, in counter order, so the app "
                    "is always demonstrable end-to-end."),
        ("Phase 4", "Styling, responsive viewBox, cross-browser smoke test, push to gh-pages."),
        ("Phase 5", "Maintain ARCHITECTURE.docx + KANBAN.xlsx throughout (living docs)."),
    ]
    for name, desc in phases:
        p = doc.add_paragraph(style="List Bullet")
        run = p.add_run(name + ": "); run.bold = True
        p.add_run(desc)

    doc.add_heading("7. Verification", level=1)
    doc.add_paragraph(
        "After each phase: serve locally, click through every scene, confirm Back rewinds "
        "correctly and mode-switch re-renders. Final deploy verified at "
        "https://bk-advisors.github.io/urbanization/."
    )

    doc.save(path)


# ---------------------------------------------------------------------------
# KANBAN.xlsx
# ---------------------------------------------------------------------------

STATUS_FILLS = {
    "Backlog":     PatternFill("solid", fgColor="EFEFEF"),
    "In Progress": PatternFill("solid", fgColor="FFE699"),
    "Blocked":     PatternFill("solid", fgColor="F4B6B6"),
    "Done":        PatternFill("solid", fgColor="C6EFCE"),
}

KANBAN_ROWS = [
    # (Phase, Feature, Status, Notes)
    ("0", "Add .gitignore (PDFs, Office lock files)", "Done", ""),
    ("0", "git mv original viz into apps/east-asia-2010/", "Done", "history preserved via rename detection"),
    ("0", "Scaffold apps/africa-2050/ skeleton", "Done", "index.html, css/, js/, data/"),
    ("0", "Create landing index.html at repo root", "Done", "Two-card layout linking both apps"),
    ("0", "Update README.md as repo overview", "Done", ""),
    ("0", "Update CLAUDE.md for new multi-app layout", "Done", ""),
    ("0", "Generate ARCHITECTURE.docx + KANBAN.xlsx", "In Progress", "Living docs, re-runnable via _generate_docs.py"),
    ("0", "Smoke test: serve repo, verify archive still works", "Backlog", ""),
    ("1", "Acquire Africapolis data (deprecated by pivot)", "Done", "Numbers too jarring for audience; switched to UN WUP"),
    ("1", "Pivot to UN WUP 2025 (city-proper, 2025–2035)", "Done", "F21 + F25 + F01 from population.un.org/wup"),
    ("1", "Source Africa basemap (Natural Earth GeoJSON)", "Done", "51 features at 1:110m"),
    ("1", "Bundle cities as ES module (UN WUP)", "Done", "~328 African cities ≥300K"),
    ("1", "Bundle country aggregates as ES module", "Done", "54 ISO3 countries"),
    ("1", "Build data/_check.html QA page", "Done", "Visible at /apps/africa-2050/data/_check.html"),
    ("2", "Port SVG setup + global state object", "Backlog", ""),
    ("2", "Port order() dispatcher with AbortController", "Backlog", "Replaces v3 clearTimeout hack"),
    ("2", "Port helpers.js (formatters, callout, stepper)", "Backlog", ""),
    ("2", "Port barChart.js as reusable factory", "Backlog", ""),
    ("2", "D3 v3 → v7 API translations (geo, scale, axis, event)", "Backlog", ""),
    ("2", "Wire Continue/Back buttons + step circles", "Backlog", ""),
    ("2", "Wire three-button mode switch (pop/land/density)", "Backlog", ""),
    ("3", "Scene 0: introText (hero + basemap background)", "Done", ""),
    ("3", "Scene 1: startBar (2025 vs 2035 totals)", "Done", ""),
    ("3", "Scene 2: totalAreaMap (dual-layer dots, mode switch, hover)", "Done", ""),
    ("3", "Scene 3: introSlope (with mini-slope teaser)", "Done", ""),
    ("3", "Scene 4: slopeGraph (top 22 cities)", "Done", ""),
    ("3", "Scene 5: introDotHistogram (with mini-histogram teaser)", "Done", ""),
    ("3", "Scene 6: dotHistogram (% growth distribution)", "Done", ""),
    ("3", "Scene 7: introUrbanScatter (with mini-scatter teaser)", "Done", ""),
    ("3", "Scene 8: urbanPopDot (country scatter)", "Done", ""),
    ("3", "Scene 9: finalText (hero + basemap background)", "Done", ""),
    ("3.5", "Narration: all text moved to right panel (no chart overlap)", "Done", "Tufte/Cairo/Few proximity principle"),
    ("3.5", "Bridge scenes: mini-teasers added (slope/histogram/scatter)", "Done", ""),
    ("3.5", "Stepper labels fixed via HTML/CSS (no JS positioning)", "Done", ""),
    ("3.5", "Viewport-aware grid layout (no scrolling)", "Done", ""),
    ("4", "Polish: favicon + OG meta tags for social sharing", "Done", ""),
    ("4", "Polish: keyboard navigation (← → + 1/2/3 metric keys)", "Done", ""),
    ("4", "Polish: dead-code sweep (timeline/progress helpers removed)", "Done", ""),
    ("4", "Confirm colour palette with user", "In Progress", "Muted ochre 2025 / terra 2035 — ask before deploy"),
    ("4", "Cross-browser smoke test (Chrome/Firefox/Edge)", "Backlog", ""),
    ("4", "Create new GitHub repo: bk-advisors/africa-2050", "Backlog", "Public URL: https://bk-advisors.github.io/africa-2050/"),
    ("4", "git subtree split apps/africa-2050 → deploy branch", "Backlog", "Extracts only the Africa viz with full history"),
    ("4", "Push deploy branch to new repo + enable Pages", "Backlog", "Requires user confirmation — publishes the live site"),
]


def build_kanban_xlsx(path: Path) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "Kanban"

    headers = ["Phase", "Feature", "Owner", "Status", "Notes", "Date updated"]
    ws.append(headers)
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="44546A")
    for col_idx, _ in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="left", vertical="center")

    for phase, feature, status, notes in KANBAN_ROWS:
        ws.append([phase, feature, "Matthew Kuch", status, notes, ""])
        row_idx = ws.max_row
        status_cell = ws.cell(row=row_idx, column=4)
        status_cell.fill = STATUS_FILLS.get(status, STATUS_FILLS["Backlog"])
        status_cell.alignment = Alignment(horizontal="center")

    widths = [8, 56, 12, 14, 50, 14]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:F{ws.max_row}"

    wb.save(path)


if __name__ == "__main__":
    build_architecture_doc(DOCS_DIR / "ARCHITECTURE.docx")
    build_kanban_xlsx(DOCS_DIR / "KANBAN.xlsx")
    print("Generated ARCHITECTURE.docx and KANBAN.xlsx in", DOCS_DIR)
