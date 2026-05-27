// Scene 2 — top-N countries ranked by 2023 MMR with the SDG 3.1 target line.

import {
  clearGroups, clearNarration, hideCallout, mmrColor, setSection,
  showModeSwitch, updateCallout,
} from "../helpers.js";
import { WIDTH, HEIGHT, SDG_TARGET } from "../main.js";

const PAD_LEFT = 220, PAD_RIGHT = 80, PAD_TOP = 60, PAD_BOTTOM = 60;
const TOP_N = 22;

export default async function targetBar({ state, groups, signal }) {
  clearGroups(groups, ["bars"]);
  clearNarration();
  hideCallout();
  showModeSwitch(false);

  const top = state.countries.slice()
    .sort((a, b) => b.mmr_2023 - a.mmr_2023)
    .slice(0, TOP_N);

  const onTrack = state.countries.filter((c) => c.on_track);
  const onTrackNames = onTrack.map((c) => c.name).join(", ");

  setSection({
    title: `Top ${TOP_N} countries by MMR (2023)`,
    body: `
      Countries ranked by maternal mortality, with the SDG&nbsp;3.1 target
      (<span style="color:#F8A623;font-weight:600;">70</span>) marked in
      amber. Every bar to the right of the line is a country with work
      ahead.
      <br/><br/>
      <strong>${top[0].name}</strong> sits at the top
      (${Math.round(top[0].mmr_2023)} deaths per 100,000 live births),
      more than <strong>${Math.round(top[0].mmr_2023 / SDG_TARGET)}×</strong>
      the target.
      <br/><br/>
      Across all 54 countries, <strong>${onTrack.length}</strong> are on track
      to reach the line by 2030 at their long-run pace:
      <span style="color:#005CB9;">${onTrackNames}</span>.
      <br/><br/>
      <em style="color:#888;">Hover any bar for the country's projection
      to 2030.</em>
    `,
  });

  if (signal.aborted) return;

  const g = groups.bars.style("opacity", 1);
  g.selectAll("*").remove();

  const maxMmr = d3.max(top, (d) => d.mmr_2023);
  const x = d3.scaleLinear().domain([0, maxMmr * 1.05]).range([PAD_LEFT, WIDTH - PAD_RIGHT]);
  const y = d3.scaleBand().domain(top.map((d) => d.iso3))
    .range([PAD_TOP, HEIGHT - PAD_BOTTOM]).padding(0.18);

  // Bars
  const rows = g.selectAll("g.row").data(top, (d) => d.iso3).enter().append("g")
    .attr("class", "row")
    .attr("transform", (d) => `translate(0,${y(d.iso3)})`);

  rows.append("rect")
    .attr("x", PAD_LEFT).attr("y", 0)
    .attr("height", y.bandwidth()).attr("width", 0)
    .attr("fill", (d) => mmrColor(d.mmr_2023))
    .attr("opacity", 0.95)
    .style("cursor", "pointer")
    .on("mouseover", (_e, d) => {
      updateCallout(d, {});
      rows.selectAll("rect").attr("opacity", (dd) => dd.iso3 === d.iso3 ? 1 : 0.25);
      rows.selectAll("text.label").attr("opacity", (dd) => dd.iso3 === d.iso3 ? 1 : 0.25);
    })
    .on("mouseout", () => {
      hideCallout();
      rows.selectAll("rect").attr("opacity", 0.95);
      rows.selectAll("text.label").attr("opacity", 1);
    })
    .transition().duration(900).delay((_d, i) => i * 25)
    .attr("width", (d) => x(d.mmr_2023) - PAD_LEFT);

  // Country labels (left of bars).
  rows.append("text").attr("class", "label")
    .attr("x", PAD_LEFT - 8).attr("y", y.bandwidth() / 2 + 4)
    .attr("text-anchor", "end")
    .style("font", "12px 'Open Sans',system-ui,sans-serif")
    .style("fill", "#242852")
    .text((d) => d.name);

  // MMR values (right of bars). Position is set immediately; only opacity animates.
  rows.append("text").attr("class", "value")
    .attr("x", (d) => x(d.mmr_2023) + 6)
    .attr("y", y.bandwidth() / 2 + 4)
    .attr("text-anchor", "start")
    .style("font", "600 11px 'Open Sans',system-ui,sans-serif")
    .style("fill", "#242852")
    .style("opacity", 0)
    .text((d) => Math.round(d.mmr_2023))
    .transition().delay(700).duration(400)
    .style("opacity", 1);

  // Header text — pushed further right so the SDG label (near x=70) doesn't collide.
  g.append("text").attr("x", WIDTH - PAD_RIGHT).attr("y", PAD_TOP - 30)
    .attr("text-anchor", "end")
    .style("font", "400 12px 'Oswald',system-ui,sans-serif")
    .style("fill", "#888")
    .text("MMR (deaths per 100,000 live births) →");

  // SDG target reference line.
  const tx = x(SDG_TARGET);
  g.append("line").attr("class", "target-line")
    .attr("x1", tx).attr("x2", tx)
    .attr("y1", PAD_TOP - 8).attr("y2", HEIGHT - PAD_BOTTOM + 6)
    .attr("stroke", "#F8A623").attr("stroke-width", 1.8)
    .attr("stroke-dasharray", "5 3")
    .attr("opacity", 0)
    .transition().delay(1000).duration(600).attr("opacity", 1);

  // Two-line target label, anchored left of the line so it doesn't sit on top of the title row.
  g.append("text").attr("class", "target-label")
    .attr("x", tx + 6).attr("y", PAD_TOP - 30).attr("text-anchor", "start")
    .style("font", "600 11px 'Open Sans',system-ui,sans-serif")
    .style("fill", "#F8A623")
    .text(`SDG 3.1 target`)
    .style("opacity", 0)
    .transition().delay(1100).duration(400).style("opacity", 1);
  g.append("text").attr("class", "target-label")
    .attr("x", tx + 6).attr("y", PAD_TOP - 18).attr("text-anchor", "start")
    .style("font", "400 10px 'Open Sans',system-ui,sans-serif")
    .style("fill", "#F8A623")
    .text(`= ${SDG_TARGET} per 100k`)
    .style("opacity", 0)
    .transition().delay(1100).duration(400).style("opacity", 1);
}
