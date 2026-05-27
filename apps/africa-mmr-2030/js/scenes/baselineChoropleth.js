// Scene 1 — Africa choropleth, MMR 2023.

import {
  africaProjection, clearGroups, clearNarration, hideCallout, isoFromFeature,
  mmrColor, setSection, showModeSwitch, updateCallout,
} from "../helpers.js";
import { WIDTH, HEIGHT, SDG_TARGET } from "../main.js";

export default async function baselineChoropleth({ state, groups, signal }) {
  clearGroups(groups, ["choropleth"]);
  clearNarration();
  hideCallout();
  showModeSwitch(false);

  const idx = new Map(state.countries.map((c) => [c.iso3, c]));
  const belowTarget = state.countries.filter((c) => c.mmr_2023 <= SDG_TARGET);
  const worst3 = state.countries.slice().sort((a, b) => b.mmr_2023 - a.mmr_2023).slice(0, 3);

  setSection({
    title: "Africa today: maternal mortality, 2023",
    body: `
      Every African country, coloured by maternal deaths per 100,000 live
      births in <strong>2023</strong>. Amber marks the SDG 3.1 line at
      <strong>${SDG_TARGET}</strong>.
      <br/><br/>
      Only <strong>${belowTarget.length}</strong> of 54 countries sit at or
      below the line today: <strong>${belowTarget.map((c) => c.name).join(", ")}</strong>.
      <br/><br/>
      At the top of the ranking are <strong>${worst3[0].name}</strong>
      (${Math.round(worst3[0].mmr_2023)}),
      <strong>${worst3[1].name}</strong>
      (${Math.round(worst3[1].mmr_2023)}), and
      <strong>${worst3[2].name}</strong>
      (${Math.round(worst3[2].mmr_2023)}). Each sits more than
      <strong>10×</strong> the SDG target.
      <br/><br/>
      <em style="color:#888;">Hover any country for its full profile.</em>
    `,
  });

  if (signal.aborted) return;

  const projection = africaProjection(state.basemap, WIDTH, HEIGHT);
  const path = d3.geoPath(projection);

  const g = groups.choropleth.style("opacity", 1);
  g.selectAll("*").remove();

  // Draw country shapes.
  const sel = g.selectAll("path.country-shape").data(state.basemap.features);
  const enter = sel.enter().append("path").attr("class", "country-shape");
  enter.merge(sel)
    .attr("d", path)
    .attr("fill", (f) => {
      const c = idx.get(isoFromFeature(f));
      return c ? mmrColor(c.mmr_2023) : "#f0eee8";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.7)
    .attr("opacity", 0)
    .style("cursor", "pointer")
    .on("mouseover", (_e, f) => {
      const c = idx.get(isoFromFeature(f));
      if (c) {
        updateCallout(c, {});
        g.selectAll("path.country-shape").attr("opacity", (ff) =>
          isoFromFeature(ff) === c.iso3 ? 1 : 0.35);
      }
    })
    .on("mouseout", () => {
      hideCallout();
      g.selectAll("path.country-shape").attr("opacity", 1);
    })
    .transition().duration(700).attr("opacity", 1);

  // Colour legend (bottom-right of chart area).
  drawColorLegend(g);
}

function drawColorLegend(g) {
  // Bottom-left, well clear of Madagascar (which sits in the bottom-right of the Mercator).
  const LX = 30, LY = 650, LW = 220, LH = 12;
  const stops = [0, 70, 250, 500, 1000];
  const defs = g.append("defs");
  const gradId = "mmr-legend-grad";
  const grad = defs.append("linearGradient")
    .attr("id", gradId).attr("x1", "0%").attr("x2", "100%").attr("y1", "0%").attr("y2", "0%");
  stops.forEach((s) => {
    grad.append("stop").attr("offset", `${(s / 1000) * 100}%`).attr("stop-color", mmrColor(s));
  });

  g.append("rect")
    .attr("x", LX).attr("y", LY).attr("width", LW).attr("height", LH)
    .attr("fill", `url(#${gradId})`).attr("stroke", "#d8d4c8").attr("stroke-width", 0.6);

  // SDG target marker on the legend.
  const tx = LX + (70 / 1000) * LW;
  g.append("line")
    .attr("x1", tx).attr("x2", tx).attr("y1", LY - 4).attr("y2", LY + LH + 4)
    .attr("stroke", "#242852").attr("stroke-width", 1.2);
  g.append("text")
    .attr("x", tx).attr("y", LY - 8).attr("text-anchor", "middle")
    .style("font", "10px 'Open Sans',system-ui,sans-serif").style("fill", "#242852")
    .text("SDG 70");

  // Tick labels.
  [0, 250, 500, 1000].forEach((s) => {
    const x = LX + (s / 1000) * LW;
    g.append("text").attr("x", x).attr("y", LY + LH + 14).attr("text-anchor", "middle")
      .style("font", "10px 'Open Sans',system-ui,sans-serif").style("fill", "#666")
      .text(s);
  });
  g.append("text").attr("x", LX).attr("y", LY + LH + 28)
    .style("font", "10px 'Open Sans',system-ui,sans-serif").style("fill", "#888")
    .text("MMR (deaths per 100,000 live births), 2023");
}
