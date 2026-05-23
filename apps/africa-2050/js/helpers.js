// Africa 2025 → 2035 — shared utilities used by main.js and the scene modules.
//
// All narration text lives in the right-side #section panel — there are no
// floating overlays over the chart. Each scene calls setSection() once when
// it begins; the user advances click-by-click via Continue / Back / circles
// or the keyboard arrow keys.

// ---------------------------------------------------------------------------
// Step circles + mode-switch buttons
// ---------------------------------------------------------------------------

export function setActiveCircle(num) {
  d3.selectAll(".circleBase").classed("activeCircle", false);
  const el = d3.select(`#circle_${num}`);
  if (!el.empty()) el.classed("activeCircle", true);
}

export function setMode(mode) {
  d3.selectAll(".mode-btn").classed("active", false);
  const id = { pop: "popButton", land: "landButton", density: "densButton" }[mode] ?? "popButton";
  d3.select(`#${id}`).classed("active", true);
}

// ---------------------------------------------------------------------------
// Right-panel narration — the single source of all scene text.
//
//   setSection({ hero, title, body })  — write all three slots in one call
//   clearNarration()                   — empty all three
// ---------------------------------------------------------------------------

export function setSection({ hero = "", title = "", body = "" } = {}) {
  d3.select("#sectionHero").html(hero);
  d3.select("#sectionTitle").html(title);
  d3.select("#sectionText").html(body);
}

export function clearNarration() {
  d3.select("#sectionHero").html("");
  d3.select("#sectionTitle").html("");
  d3.select("#sectionText").html("");
}

export function showModeSwitch(show) {
  d3.select("#modeSwitch").style("display", show ? "" : "none");
}

// ---------------------------------------------------------------------------
// Callout (lower-left of chart) — fills the stats table on hover.
// ---------------------------------------------------------------------------

const numCommas = d3.format(",.0f");
const numOne    = d3.format(".1f");
const pctSign   = d3.format("+.1%");

export function updateCallout({ name, pop_2025, pop_2035, land_2025, land_2035, density_2025, density_2035 }) {
  d3.select("#callOutCity").html(name);
  d3.select("#td-pop-2025").html(pop_2025 != null ? numCommas(pop_2025) : "—");
  d3.select("#td-pop-2035").html(pop_2035 != null ? numCommas(pop_2035) : "—");
  d3.select("#td-land-2025").html(land_2025 != null ? numOne(land_2025) : "—");
  d3.select("#td-land-2035").html(land_2035 != null ? numOne(land_2035) : "—");
  d3.select("#td-density-2025").html(density_2025 != null ? numCommas(density_2025) : "—");
  d3.select("#td-density-2035").html(density_2035 != null ? numCommas(density_2035) : "—");
  d3.select("#td-pop-perc").html(growth(pop_2025, pop_2035));
  d3.select("#td-land-perc").html(growth(land_2025, land_2035));
  d3.select("#td-density-perc").html(growth(density_2025, density_2035));
  d3.select("#callOut").style("visibility", "visible");
}

export function hideCallout() {
  d3.select("#callOut").style("visibility", "hidden");
}

function growth(a, b) {
  if (!a || b == null) return "—";
  return pctSign(b / a - 1);
}

// ---------------------------------------------------------------------------
// Scene cleanup — fade out content from groups the new scene doesn't own.
// ---------------------------------------------------------------------------

export function clearGroups(groups, keep = []) {
  const keepSet = new Set(keep);
  for (const [name, g] of Object.entries(groups)) {
    if (name === "svg" || keepSet.has(name)) continue;
    g.interrupt();
    g.selectAll("*").interrupt();
    g.transition().duration(250).style("opacity", 0).end()
      .then(() => g.selectAll("*").remove())
      .catch(() => {});
  }
  for (const name of keep) {
    if (groups[name]) groups[name].style("opacity", 1);
  }
}

// ---------------------------------------------------------------------------
// Metric mapping — translate rVar ("pop" | "land" | "density") into data
// field names + display niceties.
// ---------------------------------------------------------------------------

export const METRIC = {
  pop: {
    label:   "Population",
    unit:    "people",
    field_2025: "pop_2025",
    field_2035: "pop_2035",
    format:  (v) => v == null ? "—" : (v >= 1000 ? `${d3.format(",.1f")(v / 1000)} M` : `${d3.format(",.0f")(v)} K`),
    short:   (v) => v == null ? "—" : (v >= 1000 ? `${d3.format(".1f")(v / 1000)}M` : `${d3.format(",.0f")(v)}K`),
  },
  land: {
    label:   "Urban land",
    unit:    "km²",
    field_2025: "land_2025",
    field_2035: "land_2035",
    format:  (v) => v == null ? "—" : `${d3.format(",.0f")(v)} km²`,
    short:   (v) => v == null ? "—" : `${d3.format(",.0f")(v)} km²`,
  },
  density: {
    label:   "Density",
    unit:    "people/km²",
    field_2025: "density_2025",
    field_2035: "density_2035",
    format:  (v) => v == null ? "—" : `${d3.format(",.0f")(v)} /km²`,
    short:   (v) => v == null ? "—" : `${d3.format(",.0f")(v)} /km²`,
  },
};

// ---------------------------------------------------------------------------
// Africa Mercator projection — memoised per (width, height).
// ---------------------------------------------------------------------------

let _projection = null;
let _projectionKey = "";
export function africaProjection(basemap, width, height) {
  const key = `${width}x${height}`;
  if (_projection && _projectionKey === key) return _projection;
  _projection = d3.geoMercator().fitSize([width, height], basemap);
  _projectionKey = key;
  return _projection;
}

// ---------------------------------------------------------------------------
// Reusable: draw the Africa basemap into a group. Used by Scene 0 (faded
// background) and Scene 2 (full opacity).
// ---------------------------------------------------------------------------

export function drawBasemap(group, basemap, projection, { fill = "#ebe0cf", stroke = "#c9beac", strokeWidth = 0.6, opacity = 1, fadeMs = 500 } = {}) {
  const path = d3.geoPath(projection);
  const sel = group.style("opacity", 1)
    .selectAll("path.country").data(basemap.features);
  const enter = sel.enter().append("path").attr("class", "country");
  enter.merge(sel)
    .attr("d", path)
    .attr("fill", fill)
    .attr("stroke", stroke)
    .attr("stroke-width", strokeWidth)
    .style("opacity", 0)
    .transition().duration(fadeMs)
    .style("opacity", opacity);
  sel.exit().remove();
}

// ---------------------------------------------------------------------------
// Bridge-scene teasers — small previews of the chart that's coming next, so
// the bridge slide isn't visually blank. Each draws into the supplied group
// using a handful of real records from `state` so the preview is honest.
// ---------------------------------------------------------------------------

const TEASER_W = 540, TEASER_H = 360;
const TEASER_X = 230, TEASER_Y = 175;  // centred inside the 1000×710 SVG

export function teaserSlope(group, cities) {
  const top = cities.slice().sort((a, b) => b.pop_2025 - a.pop_2025).slice(0, 6);
  const maxV = d3.max(top, (c) => Math.max(c.pop_2025, c.pop_2035));
  const y = d3.scaleLinear().domain([0, maxV]).range([TEASER_Y + TEASER_H - 30, TEASER_Y + 30]);
  const xL = TEASER_X + 140, xR = TEASER_X + TEASER_W - 140;

  const g = group.style("opacity", 1);
  g.selectAll("*").remove();

  g.append("text").attr("x", xL).attr("y", TEASER_Y).attr("text-anchor", "middle")
    .style("font", "400 18px 'Oswald',system-ui,sans-serif").style("fill", "#d4a373").text("2025");
  g.append("text").attr("x", xR).attr("y", TEASER_Y).attr("text-anchor", "middle")
    .style("font", "400 18px 'Oswald',system-ui,sans-serif").style("fill", "#bc4749").text("2035");

  const line = g.selectAll("line.tease").data(top).enter().append("line")
    .attr("class", "tease")
    .attr("x1", xL).attr("x2", xR)
    .attr("y1", (d) => y(d.pop_2025)).attr("y2", (d) => y(d.pop_2025))
    .attr("stroke", "#bc4749").attr("stroke-width", 1.4)
    .attr("opacity", 0);

  g.selectAll("circle.l").data(top).enter().append("circle").attr("class", "l")
    .attr("cx", xL).attr("cy", (d) => y(d.pop_2025))
    .attr("r", 4).attr("fill", "#d4a373").attr("opacity", 0)
    .transition().duration(400).attr("opacity", 1);
  g.selectAll("circle.r").data(top).enter().append("circle").attr("class", "r")
    .attr("cx", xR).attr("cy", (d) => y(d.pop_2035))
    .attr("r", 4).attr("fill", "#bc4749").attr("opacity", 0)
    .transition().delay(300).duration(400).attr("opacity", 1);

  line.transition().duration(700).delay(200)
    .attr("y2", (d) => y(d.pop_2035))
    .attr("opacity", 0.5);

  g.selectAll("text.lbl").data(top).enter().append("text").attr("class", "lbl")
    .attr("x", xL - 12).attr("y", (d) => y(d.pop_2025) + 4)
    .attr("text-anchor", "end")
    .style("font", "11px 'Open Sans',system-ui,sans-serif").style("fill", "#888")
    .text((d) => d.name)
    .style("opacity", 0)
    .transition().delay(500).duration(400).style("opacity", 0.8);
}

export function teaserHistogram(group, cities) {
  // 80 cities binned into 6 buckets — illustrate the "pile up" idea.
  const subset = cities.slice(0, 80)
    .filter((c) => c.pop_2025 > 0 && c.pop_2035 > 0)
    .map((c) => ({ ...c, growth: c.pop_2035 / c.pop_2025 - 1 }));

  const lo = -0.1, hi = 0.8;
  const x = d3.scaleLinear().domain([lo, hi])
    .range([TEASER_X + 50, TEASER_X + TEASER_W - 50]);
  const bins = d3.bin().domain([lo, hi])
    .thresholds(d3.range(lo, hi + 0.001, 0.15))
    .value((d) => Math.max(lo, Math.min(hi, d.growth)))(subset);

  const g = group.style("opacity", 1);
  g.selectAll("*").remove();

  const yBase = TEASER_Y + TEASER_H - 40;
  g.append("line")
    .attr("x1", x(lo)).attr("x2", x(hi)).attr("y1", yBase).attr("y2", yBase)
    .attr("stroke", "#aaa").attr("stroke-width", 0.6);

  [-0.1, 0, 0.3, 0.6].forEach((t) => {
    g.append("text").attr("x", x(t)).attr("y", yBase + 16)
      .attr("text-anchor", "middle")
      .style("font", "10px 'Open Sans',system-ui,sans-serif").style("fill", "#888")
      .text(d3.format("+.0%")(t));
  });

  bins.forEach((bin) => {
    bin.forEach((d, i) => {
      g.append("circle")
        .attr("cx", x((bin.x0 + bin.x1) / 2))
        .attr("cy", yBase - 6)
        .attr("r", 3)
        .attr("fill", d.growth >= 0 ? "#bc4749" : "#7a8b9e")
        .attr("fill-opacity", 0.65)
        .transition().duration(500).delay(150 + i * 18)
        .attr("cy", yBase - 6 - i * 7);
    });
  });
}

export function teaserScatter(group, countries) {
  // 10 representative countries.
  const top = countries.slice().sort((a, b) => b.urban_pop_2035 - a.urban_pop_2035).slice(0, 10);
  const data = top.map((c) => ({ ...c, growth: c.urban_pop_2035 / c.urban_pop_2025 - 1 }));

  const x = d3.scaleLinear().domain([0.1, 0.95]).range([TEASER_X + 50, TEASER_X + TEASER_W - 50]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, (d) => d.growth) * 1.1])
    .range([TEASER_Y + TEASER_H - 50, TEASER_Y + 30]);
  const r = d3.scaleSqrt()
    .domain([0, d3.max(data, (d) => d.urban_pop_2035)]).range([3, 22]);

  const g = group.style("opacity", 1);
  g.selectAll("*").remove();

  g.append("line").attr("x1", x.range()[0]).attr("x2", x.range()[1])
    .attr("y1", TEASER_Y + TEASER_H - 40).attr("y2", TEASER_Y + TEASER_H - 40)
    .attr("stroke", "#aaa").attr("stroke-width", 0.6);
  g.append("line").attr("x1", x.range()[0]).attr("x2", x.range()[0])
    .attr("y1", TEASER_Y + 30).attr("y2", TEASER_Y + TEASER_H - 40)
    .attr("stroke", "#aaa").attr("stroke-width", 0.6);

  g.append("text").attr("x", (x.range()[0] + x.range()[1]) / 2)
    .attr("y", TEASER_Y + TEASER_H - 20).attr("text-anchor", "middle")
    .style("font", "10px 'Open Sans',system-ui,sans-serif").style("fill", "#888")
    .text("urbanisation rate →");

  g.selectAll("circle.b").data(data).enter().append("circle").attr("class", "b")
    .attr("cx", (d) => x(d.urban_rate_2025))
    .attr("cy", (d) => y(d.growth))
    .attr("r", 0)
    .attr("fill", "#bc4749").attr("fill-opacity", 0.5)
    .attr("stroke", "#a83a28").attr("stroke-width", 0.6)
    .transition().duration(600).delay((_d, i) => i * 60)
    .attr("r", (d) => r(d.urban_pop_2035));

  g.selectAll("text.lbl").data(data.slice(0, 4)).enter().append("text").attr("class", "lbl")
    .attr("x", (d) => x(d.urban_rate_2025))
    .attr("y", (d) => y(d.growth) + r(d.urban_pop_2035) + 12)
    .attr("text-anchor", "middle")
    .style("font", "10px 'Open Sans',system-ui,sans-serif").style("fill", "#666")
    .text((d) => d.iso3)
    .style("opacity", 0)
    .transition().delay(700).duration(400).style("opacity", 1);
}
