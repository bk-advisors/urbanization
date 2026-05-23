// Scene 2 — Africa map + dual-layer city dots. Single render; mode-switch
// re-runs the scene to recolour by the selected metric.

import {
  africaProjection, clearGroups, clearNarration, drawBasemap, hideCallout, METRIC,
  setSection, showModeSwitch, updateCallout,
} from "../helpers.js";
import { WIDTH, HEIGHT } from "../main.js";

export default async function totalAreaMap({ state, groups, signal }) {
  clearGroups(groups, ["map", "cities2025", "cities2035"]);
  clearNarration();
  hideCallout();
  showModeSwitch(true);

  const m = METRIC[state.rVar];

  // Pre-compute insights for the section body.
  const f25 = m.field_2025, f35 = m.field_2035;
  const valid = state.cities.filter((c) => c[f25] != null && c[f25] > 0);
  const biggest = [...valid].sort((a, b) => b[f25] - a[f25]).slice(0, 3);
  const fastest = [...valid]
    .filter((c) => c[f25] > 1000)
    .map((c) => ({ ...c, gr: (c[f35] ?? c[f25]) / c[f25] - 1 }))
    .sort((a, b) => b.gr - a.gr)
    .slice(0, 2);

  setSection({
    title: `African cities &mdash; ${m.label.toLowerCase()}`,
    body: `
      Every African city of 300,000+ people. Each shown twice:
      <span style="color:#d4a373;font-weight:600;">pale ring 2025</span>,
      <span style="color:#bc4749;font-weight:600;">solid dot 2035</span>.
      <br/><br/>
      Headline cluster: <strong>${biggest.map((c) => c.name).join(", ")}</strong>
      dominate by sheer size.
      <br/><br/>
      Fastest growing of the big cities:
      <strong>${fastest[0].name}</strong> (+${d3.format(".0%")(fastest[0].gr)})
      and <strong>${fastest[1].name}</strong> (+${d3.format(".0%")(fastest[1].gr)})
      over the next 10 years.
      <br/><br/>
      Switch the metric above to compare population, urban land, and density.
      <em style="color:#888;">Hover any city for details.</em>
    `,
  });

  if (signal.aborted) return;

  const projection = africaProjection(state.basemap, WIDTH, HEIGHT);
  drawBasemap(groups.map, state.basemap, projection, { opacity: 1, fadeMs: 500 });

  const max = d3.max(valid, (c) => Math.max(c[f25] ?? 0, c[f35] ?? 0));
  const r = d3.scaleSqrt().domain([0, max]).range([0, 38]);

  drawLayer(groups.cities2035, valid, f35, { fill: "#bc4749", opacity: 0.55 });
  drawLayer(groups.cities2025, valid, f25, { fill: "none", opacity: 1, stroke: "#d4a373", strokeWidth: 1.2 });

  function drawLayer(group, data, field, { fill, opacity, stroke, strokeWidth = 0 }) {
    const sel = group.style("opacity", 1)
      .selectAll("circle.city").data(data, (c) => c.id);
    const enter = sel.enter().append("circle").attr("class", "city")
      .attr("cx", (c) => projection([c.lng, c.lat])[0])
      .attr("cy", (c) => projection([c.lng, c.lat])[1])
      .attr("r", 0)
      .attr("fill", fill)
      .attr("fill-opacity", 0)
      .attr("stroke", stroke ?? "none")
      .attr("stroke-width", strokeWidth)
      .style("cursor", "pointer")
      .on("mouseover", (_e, d) => onHover(d))
      .on("mouseout", onLeave);
    enter.merge(sel).transition().duration(700)
      .attr("r", (c) => r(c[field] ?? 0))
      .attr("fill-opacity", opacity);
  }

  function onHover(d) {
    updateCallout({
      name: `${d.name}${d.capital ? " ★" : ""} <span style="color:#888;font-weight:400;">— ${d.iso3}</span>`,
      pop_2025: d.pop_2025, pop_2035: d.pop_2035,
      land_2025: d.land_2025, land_2035: d.land_2035,
      density_2025: d.density_2025, density_2035: d.density_2035,
    });
    groups.cities2025.selectAll("circle.city").attr("opacity", (c) => c.id === d.id ? 1 : 0.18);
    groups.cities2035.selectAll("circle.city").attr("opacity", (c) => c.id === d.id ? 1 : 0.18);
  }
  function onLeave() {
    hideCallout();
    groups.cities2025.selectAll("circle.city").attr("opacity", 1);
    groups.cities2035.selectAll("circle.city").attr("opacity", 1);
  }
}
