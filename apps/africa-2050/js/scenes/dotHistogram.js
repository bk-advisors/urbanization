// Scene 6 — dot histogram of 2025 → 2035 growth across all cities.

import {
  clearGroups, clearNarration, hideCallout, METRIC,
  setSection, showModeSwitch, updateCallout,
} from "../helpers.js";

const W = 1000, H = 710;
const PAD_LEFT = 80, PAD_RIGHT = 80, PAD_TOP = 110, PAD_BOTTOM = 90;
const BIN_WIDTH = 0.05;
const DOT_R = 4;
const DOT_SPACING = 9;

export default async function dotHistogram({ state, groups, signal }) {
  clearGroups(groups, ["dotWrapper"]);
  clearNarration();
  hideCallout();
  showModeSwitch(true);

  const m = METRIC[state.rVar];

  const f25 = m.field_2025, f35 = m.field_2035;
  const valid = state.cities
    .filter((c) => c[f25] != null && c[f25] > 0 && c[f35] != null && c[f35] > 0)
    .map((c) => ({ ...c, growth: c[f35] / c[f25] - 1 }));
  const median = d3.median(valid, (d) => d.growth);
  const fastShare = valid.filter((d) => d.growth > 0.5).length / valid.length;

  setSection({
    title: `Growth distribution &mdash; ${m.label.toLowerCase()}`,
    body: `
      Each dot is one African city. X-position = its 2025 → 2035
      ${m.label.toLowerCase()} growth.
      <br/><br/>
      The median city grows by <strong>${d3.format(".0%")(median)}</strong>
      over 10 years. About <strong>${d3.format(".0%")(fastShare)}</strong> of
      cities grow by more than 50% &mdash; that's the long tail to the right.
      <br/><br/>
      <em style="color:#888;">Hover any dot for details.</em>
    `,
  });

  if (signal.aborted) return;

  const lo = -0.20, hi = 1.50;
  const clamp = (v) => Math.max(lo, Math.min(hi, v));

  const x = d3.scaleLinear().domain([lo, hi]).range([PAD_LEFT, W - PAD_RIGHT]);
  const binner = d3.bin().domain([lo, hi])
    .thresholds(d3.range(lo, hi + 0.001, BIN_WIDTH))
    .value((d) => clamp(d.growth));
  const bins = binner(valid);
  bins.forEach((bin) => bin.forEach((d, i) => { d._row = i; }));

  const g = groups.dotWrapper.style("opacity", 1);
  g.selectAll("*").remove();

  const yAxis = H - PAD_BOTTOM;
  const axis = g.append("g").attr("transform", `translate(0,${yAxis})`);
  axis.append("line").attr("x1", x(lo)).attr("x2", x(hi))
    .attr("stroke", "#999").attr("stroke-width", 0.6);

  const ticks = d3.range(0, hi + 0.01, 0.25).concat([lo, -0.10])
    .filter((t, i, a) => a.indexOf(t) === i);
  axis.selectAll("g.tick").data(ticks).enter().append("g").attr("class", "tick")
    .attr("transform", (t) => `translate(${x(t)},0)`)
    .each(function () {
      const sel = d3.select(this), t = sel.datum();
      sel.append("line").attr("y1", 0).attr("y2", 5).attr("stroke", "#999").attr("stroke-width", 0.6);
      sel.append("text").attr("y", 20).attr("text-anchor", "middle")
        .style("font", "11px 'Open Sans',system-ui,sans-serif").style("fill", "#666")
        .text(d3.format("+.0%")(t));
    });

  axis.append("text")
    .attr("x", (x(lo) + x(hi)) / 2).attr("y", 50)
    .attr("text-anchor", "middle")
    .style("font", "12px 'Open Sans',system-ui,sans-serif").style("fill", "#666")
    .text(`10-year growth in ${m.label.toLowerCase()}, 2025 → 2035`);

  g.append("line").attr("x1", x(0)).attr("x2", x(0))
    .attr("y1", PAD_TOP).attr("y2", yAxis)
    .attr("stroke", "#ccc").attr("stroke-dasharray", "2 3");

  const dots = g.append("g").selectAll("circle.dot")
    .data(valid, (d) => d.id).enter().append("circle")
    .attr("class", "dot")
    .attr("cx", (d) => x(clamp(d.growth)))
    .attr("cy", yAxis - DOT_R - 2)
    .attr("r", 0)
    .attr("fill", (d) => d.growth >= 0 ? "#bc4749" : "#7a8b9e")
    .attr("fill-opacity", 0.7)
    .style("cursor", "pointer")
    .on("mouseover", (_e, d) => focus(d))
    .on("mouseout", unfocus);

  dots.transition().duration(700).delay((d) => 200 + d._row * 8)
    .attr("cy", (d) => yAxis - DOT_R - 2 - d._row * DOT_SPACING)
    .attr("r", DOT_R);

  function focus(d) {
    dots.attr("fill-opacity", (x) => x.id === d.id ? 1 : 0.1);
    updateCallout({
      name: `${d.name} <span style="color:#888;font-weight:400;">— ${d.iso3}</span>`,
      pop_2025: d.pop_2025, pop_2035: d.pop_2035,
      land_2025: d.land_2025, land_2035: d.land_2035,
      density_2025: d.density_2025, density_2035: d.density_2035,
    });
  }
  function unfocus() { dots.attr("fill-opacity", 0.7); hideCallout(); }
}
