// Scene 3 — small-multiples grid of MMR trajectories 2000-2023 (solid) +
// 2024-2030 projection (dashed). Mode-switch toggles which projection.

import {
  clearGroups, clearNarration, hideCallout, METRIC, setSection,
  showModeSwitch, updateCallout,
} from "../helpers.js";
import { WIDTH, HEIGHT, SDG_TARGET, BASE_YEAR, TARGET_YEAR, seriesByIso } from "../main.js";

const COLS = 4, ROWS = 3;
const TOP_N = COLS * ROWS;  // 12 panels
const PAD_TOP = 75, PAD_BOTTOM = 70, PAD_LEFT = 30, PAD_RIGHT = 30;
const GUTTER_X = 18, GUTTER_Y = 30;

export default async function trendSmallMultiples({ state, groups, signal }) {
  clearGroups(groups, ["multiples"]);
  clearNarration();
  hideCallout();
  showModeSwitch(true);

  const m = METRIC[state.rVar];

  // Pick the 12 highest-burden countries by 2023 MMR.
  const top = state.countries.slice()
    .sort((a, b) => b.mmr_2023 - a.mmr_2023)
    .slice(0, TOP_N);

  // Best-performing of the 12 over the long run.
  const bestImprover = top.slice().sort((a, b) => (b.arr_long ?? -1) - (a.arr_long ?? -1))[0];
  const worstStaller = top.slice().sort((a, b) => (a.arr_long ?? 1) - (b.arr_long ?? 1))[0];

  setSection({
    title: `12 highest-burden countries, ${m.short.toLowerCase()}`,
    body: `
      For each of the 12 countries with the highest maternal mortality today,
      the line shows what actually happened
      (<span style="color:#242852;font-weight:600;">2000-2023</span>)
      and a <span style="color:#bc4749;font-weight:600;">dashed projection</span>
      to 2030 under the active scenario:
      <strong>${m.label}</strong>.
      <br/><br/>
      ${m.description}
      <br/><br/>
      Over the long run, <strong>${bestImprover.name}</strong> reduced fastest
      (<span style="color:#005CB9;">-${Math.round((bestImprover.arr_long ?? 0) * 100)}% per year</span>),
      while <strong>${worstStaller.name}</strong> reduced slowest
      (<span style="color:#bc4749;">${Math.round((worstStaller.arr_long ?? 0) * 100)}% per year</span>).
      <br/><br/>
      The amber line is the SDG&nbsp;3.1 target of
      <strong>${SDG_TARGET}</strong>. Toggle the pace above to see how
      different reduction rates land each country in 2030.
    `,
  });

  if (signal.aborted) return;

  const g = groups.multiples.style("opacity", 1);
  g.selectAll("*").remove();

  const usableW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const usableH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const panelW = (usableW - (COLS - 1) * GUTTER_X) / COLS;
  const panelH = (usableH - (ROWS - 1) * GUTTER_Y) / ROWS;

  // Shared y-domain across panels — emphasises the relative gap to target.
  const yMax = d3.max(top, (d) => Math.max(d.mmr_2000 ?? d.mmr_2023, d.mmr_2023));

  // Shared x-domain.
  const x = d3.scaleLinear().domain([2000, TARGET_YEAR]).range([0, panelW - 12]);

  // Header.
  g.append("text").attr("x", WIDTH / 2).attr("y", 28).attr("text-anchor", "middle")
    .style("font", "400 16px 'Oswald',system-ui,sans-serif").style("fill", "#242852")
    .text("MMR trajectories: 2000-2023 actual, 2024-2030 projected");

  top.forEach((d, i) => {
    const col = i % COLS, row = Math.floor(i / COLS);
    const px = PAD_LEFT + col * (panelW + GUTTER_X);
    const py = PAD_TOP + row * (panelH + GUTTER_Y);

    const panel = g.append("g")
      .attr("class", "panel")
      .attr("transform", `translate(${px},${py})`)
      .style("cursor", "pointer")
      .on("mouseover", () => updateCallout(d, {
        proj2030: state.rVar === "required" ? SDG_TARGET : d[m.field],
        projLabel: m.short,
      }))
      .on("mouseout", hideCallout);

    const y = d3.scaleLinear().domain([0, yMax]).range([panelH - 14, 4]);

    // Background card.
    panel.append("rect").attr("x", 0).attr("y", 0)
      .attr("width", panelW).attr("height", panelH)
      .attr("fill", "#fafaf6").attr("stroke", "#eee").attr("stroke-width", 0.6).attr("rx", 3);

    // SDG target horizontal line.
    panel.append("line")
      .attr("x1", 0).attr("x2", panelW)
      .attr("y1", y(SDG_TARGET)).attr("y2", y(SDG_TARGET))
      .attr("stroke", "#F8A623").attr("stroke-width", 1).attr("stroke-dasharray", "3 3").attr("opacity", 0.7);

    // Country name.
    panel.append("text").attr("x", 8).attr("y", 14)
      .style("font", "600 12px 'Open Sans',system-ui,sans-serif").style("fill", "#242852")
      .text(d.name.length > 22 ? d.name.slice(0, 20) + "…" : d.name);

    // 2023 value (top-right of panel).
    panel.append("text").attr("x", panelW - 8).attr("y", 14)
      .attr("text-anchor", "end")
      .style("font", "600 12px 'Open Sans',system-ui,sans-serif").style("fill", "#bc4749")
      .text(Math.round(d.mmr_2023));

    // Observed line (2000-2023).
    const obs = (seriesByIso.get(d.iso3) ?? []).filter((p) => p.year >= 2000 && p.year <= BASE_YEAR);
    if (obs.length > 1) {
      const line = d3.line().x((p) => x(p.year)).y((p) => y(p.mmr));
      panel.append("path").datum(obs)
        .attr("fill", "none").attr("stroke", "#242852").attr("stroke-width", 1.6)
        .attr("d", line)
        .attr("stroke-dasharray", function () { return this.getTotalLength(); })
        .attr("stroke-dashoffset", function () { return this.getTotalLength(); })
        .transition().delay(150 + i * 60).duration(900)
        .attr("stroke-dashoffset", 0);
    }

    // Projection segment (2023 → 2030).
    let proj2030;
    if (state.rVar === "required") proj2030 = SDG_TARGET;
    else proj2030 = d[m.field];
    if (proj2030 != null) {
      panel.append("line")
        .attr("x1", x(BASE_YEAR)).attr("y1", y(d.mmr_2023))
        .attr("x2", x(BASE_YEAR)).attr("y2", y(d.mmr_2023))
        .attr("stroke", "#bc4749").attr("stroke-width", 1.6).attr("stroke-dasharray", "4 3")
        .transition().delay(800 + i * 60).duration(600)
        .attr("x2", x(TARGET_YEAR)).attr("y2", y(proj2030));

      // Endpoint marker.
      panel.append("circle")
        .attr("cx", x(TARGET_YEAR)).attr("cy", y(proj2030))
        .attr("r", 0).attr("fill", proj2030 <= SDG_TARGET ? "#005CB9" : "#bc4749")
        .transition().delay(1300 + i * 60).duration(300).attr("r", 3);
    }

    // X-axis label (year ticks).
    [2000, 2010, 2020, 2030].forEach((yr) => {
      panel.append("text").attr("x", x(yr)).attr("y", panelH - 2)
        .attr("text-anchor", yr === 2030 ? "end" : "middle")
        .style("font", "9px 'Open Sans',system-ui,sans-serif").style("fill", "#888")
        .text(yr);
    });
  });

  // Footer note about the active mode.
  g.append("text").attr("x", WIDTH / 2).attr("y", HEIGHT - 20)
    .attr("text-anchor", "middle")
    .style("font", "11px 'Open Sans',system-ui,sans-serif").style("fill", "#888")
    .text(`Dashed projection: ${m.label}. Amber line = SDG 3.1 target (${SDG_TARGET}).`);
}
