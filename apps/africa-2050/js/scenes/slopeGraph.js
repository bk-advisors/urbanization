// Scene 4 — slope graph: top-N African cities, 2025 → 2035, selected metric.

import {
  clearGroups, clearNarration, hideCallout, METRIC,
  setSection, showModeSwitch, updateCallout,
} from "../helpers.js";

const TOP_N = 22;
const W = 1000, H = 710;
const PAD_TOP = 80, PAD_BOTTOM = 60;
const X_LEFT = 340, X_RIGHT = 660;
const LABEL_LEFT_X = X_LEFT - 16;
const LABEL_RIGHT_X = X_RIGHT + 16;

export default async function slopeGraph({ state, groups, signal }) {
  clearGroups(groups, ["slope"]);
  clearNarration();
  hideCallout();
  showModeSwitch(true);

  const m = METRIC[state.rVar];

  const f25 = m.field_2025, f35 = m.field_2035;
  const valid = state.cities
    .filter((c) => c[f25] != null && c[f25] > 0 && c[f35] != null && c[f35] > 0);
  const top = valid.slice().sort((a, b) => b[f25] - a[f25]).slice(0, TOP_N);
  const steepest = top.slice().map((c) => ({ ...c, gr: c[f35] / c[f25] - 1 }))
    .sort((a, b) => b.gr - a.gr)[0];
  const flattest = top.slice().map((c) => ({ ...c, gr: c[f35] / c[f25] - 1 }))
    .sort((a, b) => a.gr - b.gr)[0];

  setSection({
    title: `Top ${TOP_N} cities &mdash; ${m.label.toLowerCase()}`,
    body: `
      Africa's largest cities, ranked by ${m.label.toLowerCase()}.
      <span style="color:#d4a373;font-weight:600;">2025 on the left</span>,
      <span style="color:#bc4749;font-weight:600;">2035 on the right</span>.
      <br/><br/>
      <strong>${steepest.name}</strong> rises fastest of the top ${TOP_N}
      (+${d3.format(".0%")(steepest.gr)} in ${m.label.toLowerCase()}).
      <br/>
      <strong>${flattest.name}</strong> changes the least
      (${d3.format("+.0%")(flattest.gr)}).
      <br/><br/>
      Switch the metric (above) to re-rank.
      <em style="color:#888;">Hover any line to focus.</em>
    `,
  });

  if (signal.aborted) return;

  const maxV = d3.max(top, (c) => Math.max(c[f25], c[f35]));
  const y = d3.scaleLinear().domain([0, maxV]).range([H - PAD_BOTTOM, PAD_TOP]);

  const g = groups.slope.style("opacity", 1);
  g.selectAll("*").remove();

  g.append("text").attr("x", X_LEFT).attr("y", PAD_TOP - 30)
    .attr("text-anchor", "middle")
    .style("font", "400 22px 'Oswald',system-ui,sans-serif")
    .style("fill", "#d4a373").text("2025");
  g.append("text").attr("x", X_RIGHT).attr("y", PAD_TOP - 30)
    .attr("text-anchor", "middle")
    .style("font", "400 22px 'Oswald',system-ui,sans-serif")
    .style("fill", "#bc4749").text("2035");

  const lines = g.append("g").attr("class", "slope-lines");
  const pointsL = g.append("g").attr("class", "slope-points-l");
  const pointsR = g.append("g").attr("class", "slope-points-r");
  const labelsL = g.append("g").attr("class", "slope-labels-l");
  const labelsR = g.append("g").attr("class", "slope-labels-r");

  const line = lines.selectAll("line.slope").data(top, (d) => d.id).enter().append("line")
    .attr("class", "slope")
    .attr("x1", X_LEFT).attr("x2", X_RIGHT)
    .attr("y1", (d) => y(d[f25])).attr("y2", (d) => y(d[f25]))
    .attr("stroke", "#bc4749").attr("stroke-width", 1.5)
    .attr("opacity", 0)
    .style("cursor", "pointer");

  pointsL.selectAll("circle").data(top, (d) => d.id).enter().append("circle")
    .attr("cx", X_LEFT).attr("cy", (d) => y(d[f25]))
    .attr("r", 4).attr("fill", "#d4a373").attr("opacity", 0);
  pointsR.selectAll("circle").data(top, (d) => d.id).enter().append("circle")
    .attr("cx", X_RIGHT).attr("cy", (d) => y(d[f35]))
    .attr("r", 4).attr("fill", "#bc4749").attr("opacity", 0);

  labelsL.selectAll("text").data(top, (d) => d.id).enter().append("text")
    .attr("x", LABEL_LEFT_X).attr("y", (d) => y(d[f25]) + 4)
    .attr("text-anchor", "end")
    .style("font", "11px 'Open Sans',system-ui,sans-serif")
    .style("fill", "#555")
    .style("opacity", 0)
    .text((d) => `${d.name} · ${m.short(d[f25])}`);
  labelsR.selectAll("text").data(top, (d) => d.id).enter().append("text")
    .attr("x", LABEL_RIGHT_X).attr("y", (d) => y(d[f35]) + 4)
    .attr("text-anchor", "start")
    .style("font", "11px 'Open Sans',system-ui,sans-serif")
    .style("fill", "#555")
    .style("opacity", 0)
    .text((d) => `${m.short(d[f35])} · ${d.name}`);

  pointsL.selectAll("circle").transition().duration(500).attr("opacity", 1);
  pointsR.selectAll("circle").transition().delay(300).duration(500).attr("opacity", 1);
  line.transition().duration(900).delay(100)
    .attr("y2", (d) => y(d[f35]))
    .attr("opacity", 0.45);
  labelsL.selectAll("text").transition().delay(500).duration(400).style("opacity", 0.85);
  labelsR.selectAll("text").transition().delay(500).duration(400).style("opacity", 0.85);

  line.on("mouseover", (_e, d) => focus(d)).on("mouseout", unfocus);
  function focus(d) {
    line.attr("opacity", (x) => x.id === d.id ? 0.9 : 0.08);
    pointsL.selectAll("circle").attr("opacity", (x) => x.id === d.id ? 1 : 0.15);
    pointsR.selectAll("circle").attr("opacity", (x) => x.id === d.id ? 1 : 0.15);
    labelsL.selectAll("text").style("opacity", (x) => x.id === d.id ? 1 : 0.15);
    labelsR.selectAll("text").style("opacity", (x) => x.id === d.id ? 1 : 0.15);
    updateCallout({
      name: `${d.name} <span style="color:#888;font-weight:400;">— ${d.iso3}</span>`,
      pop_2025: d.pop_2025, pop_2035: d.pop_2035,
      land_2025: d.land_2025, land_2035: d.land_2035,
      density_2025: d.density_2025, density_2035: d.density_2035,
    });
  }
  function unfocus() {
    line.attr("opacity", 0.45);
    pointsL.selectAll("circle").attr("opacity", 1);
    pointsR.selectAll("circle").attr("opacity", 1);
    labelsL.selectAll("text").style("opacity", 0.85);
    labelsR.selectAll("text").style("opacity", 0.85);
    hideCallout();
  }
}
