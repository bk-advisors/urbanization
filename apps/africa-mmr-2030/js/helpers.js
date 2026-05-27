// Africa & SDG 3.1 — shared utilities for main.js and the scene modules.

import { SDG_TARGET } from "./main.js";

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
  const id = {
    long: "popButton", recent: "landButton", required: "densButton",
  }[mode] ?? "popButton";
  d3.select(`#${id}`).classed("active", true);
}

// ---------------------------------------------------------------------------
// Right-panel narration
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
// Country callout (lower-left of chart)
// ---------------------------------------------------------------------------

const fmt0 = d3.format(",.0f");
const fmt1 = d3.format(".1f");
const fmtArr = d3.format("+.1%");

export function updateCallout(country, { proj2030, projLabel }) {
  d3.select("#callOutCity").html(
    `${country.name} <span style="color:#888;font-weight:400;">— ${country.iso3}</span>`
  );
  d3.select("#td-mmr-2023").html(fmt0(country.mmr_2023));
  d3.select("#td-arr").html(country.arr_long != null ? fmtArr(country.arr_long) : "—");
  d3.select("#td-gap-2023").html(country.mmr_2023 > SDG_TARGET
    ? `+${fmt0(country.mmr_2023 - SDG_TARGET)}` : `${fmt0(country.mmr_2023 - SDG_TARGET)}`);

  const p2030 = proj2030 ?? country.mmr_2030_long ?? null;
  d3.select("#td-mmr-2030").html(p2030 != null ? fmt0(p2030) : "—");
  d3.select("#td-arr-req").html(country.arr_required ? fmtArr(country.arr_required) : "—");
  d3.select("#td-gap-2030").html(p2030 != null
    ? (p2030 > SDG_TARGET ? `+${fmt0(p2030 - SDG_TARGET)}` : `${fmt0(p2030 - SDG_TARGET)}`)
    : "—");

  d3.select("#td-on-track")
    .html(country.on_track
      ? `<span class="on-track-yes">On track ${projLabel ? "(" + projLabel + ")" : ""}</span>`
      : `<span class="on-track-no">Off track — gap of ${fmt0((p2030 ?? country.mmr_2030_long) - SDG_TARGET)} above target</span>`)
    .attr("colspan", 3);

  d3.select("#callOut").style("visibility", "visible");
}

export function hideCallout() {
  d3.select("#callOut").style("visibility", "hidden");
}

// ---------------------------------------------------------------------------
// Scene cleanup
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
// Metric mapping — translate rVar into the right projection field + label.
// ---------------------------------------------------------------------------

export const METRIC = {
  long: {
    label:        "Long-run pace (2000-2023)",
    short:        "Long pace",
    field:        "mmr_2030_long",
    arr_field:    "arr_long",
    description:  "If each country keeps its 23-year reduction pace.",
  },
  recent: {
    label:        "Post-2016 pace",
    short:        "Recent pace",
    field:        "mmr_2030_recent",
    arr_field:    "arr_recent",
    description:  "If each country keeps its 2016-2023 pace (the slowdown era).",
  },
  required: {
    label:        "On-pace to SDG 3.1",
    short:        "On-pace",
    field:        "mmr_2030_onpace",  // virtual: target value 70
    arr_field:    "arr_required",
    description:  "If each country hits the required reduction rate to land at MMR 70.",
  },
};

// Return the projected MMR_2030 for a given country under the active rVar.
export function projection(country, rVar) {
  if (rVar === "required") return SDG_TARGET;
  return country[METRIC[rVar].field];
}

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
// Reusable: draw basemap into a group.
// ---------------------------------------------------------------------------

export function drawBasemap(group, basemap, projection, { fill = "#f2efe8", stroke = "#d8d4c8", strokeWidth = 0.6, opacity = 1, fadeMs = 500 } = {}) {
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
// MMR colour scale — used by both choropleth scenes.
//
// Anchored to: 0 (sand) → 70 (amber, SDG target) → 250 (brick) → 1000 (deep red).
// Above-target = warm; at-or-below = cool blue tint.
// ---------------------------------------------------------------------------

export const mmrColor = d3.scaleLinear()
  .domain([0, 70, 250, 700, 1200])
  .range(["#cfe0f3", "#F8A623", "#e88e6d", "#bc4749", "#7a1d1f"])
  .clamp(true);

// Convenience: pick a label color that contrasts with mmrColor at a given MMR.
export function contrastLabel(mmr) {
  return mmr > 350 ? "#fffaf2" : "#242852";
}

// Lookup country record by ISO3 (returns undefined if missing).
export function countryByIso(countries, iso3) {
  return countries.find((c) => c.iso3 === iso3);
}

// Lookup ISO3 → name from basemap properties (fallback in case our countries[] is missing one).
export function isoFromFeature(feat) {
  return feat.properties?.ISO_A3 || feat.properties?.iso_a3 || feat.properties?.ADM0_A3 || null;
}
