// Scene 6 — The gap as a tower of lives.
// For each country, render a vertical column of dots above the SDG line:
// each dot = 1,000 cumulative excess maternal deaths 2024-2030 under
// status-quo trajectory vs. an on-pace trajectory. Nigeria becomes a
// skyscraper. Tunisia is a flat line.

import {
  clearGroups, clearNarration, hideCallout, setSection,
  showModeSwitch,
} from "../helpers.js";
import { WIDTH, HEIGHT, SDG_TARGET } from "../main.js";

const PAD_LEFT = 60, PAD_RIGHT = 40, PAD_TOP = 120, PAD_BOTTOM = 110;
const DOT_VALUE = 1000;        // 1 dot = 1,000 lives
const DOT_R = 3.2;
const DOT_DY = 7;              // vertical spacing between dots

export default async function gapTower({ state, groups, signal }) {
  clearGroups(groups, ["tower"]);
  clearNarration();
  hideCallout();
  showModeSwitch(true);

  // Decide which pace to count under.
  const gapField = state.rVar === "recent" ? "lives_gap_recent" : "lives_gap";
  const paceLabel = state.rVar === "recent" ? "post-2016 pace" : "long-run pace";

  // Sort countries by gap (desc), drop those with zero gap or no data.
  const all = state.countries
    .filter((c) => c[gapField] != null && c[gapField] > 0)
    .sort((a, b) => b[gapField] - a[gapField]);
  const totalLives = d3.sum(all, (d) => d[gapField]);
  const totalCohort = d3.sum(state.countries, (d) => d.births_2023_k ?? 0);

  // Show top 25 to keep the chart readable.
  const top = all.slice(0, 25);

  // Round to nearest 10k for the headline so it doesn't imply false precision.
  const headlineLives = Math.round(totalLives / 10000) * 10000;

  setSection({
    hero: `Around <span style="color:#bc4749;">${headlineLives.toLocaleString()}</span> mothers.`,
    title: "The gap, in lives",
    body: `
      Each <span style="color:#bc4749;">red dot</span> above a country
      represents <strong>1,000 mothers</strong> projected to die between
      2024 and 2030 in excess of a counterfactual where the country was on
      pace to the SDG target.
      <br/><br/>
      Under the <strong>${paceLabel}</strong>, roughly
      ${headlineLives.toLocaleString()} lives are at stake across Africa
      over the next seven years.
      <br/><br/>
      <strong>${top[0].name}</strong> alone accounts for
      <strong>${Math.round(top[0][gapField] / totalLives * 100)}%</strong>
      of the gap. The bottom 25 countries combined account for less than
      ${Math.round((d3.sum(all.slice(25), (d) => d[gapField]) / totalLives) * 100)}%.
      <br/><br/>
      These aren't pessimistic projections. They are what happens if every
      country simply continues at the pace it has set for itself. The
      arithmetic of inaction.
      <br/><br/>
      <em style="color:#888;">Toggle the pace above to compare long-run
      (2000-2023) and post-2016 trajectories. Figures are derived from MMR
      gap × birth cohort; plausible range under standard methodology is
      roughly 450,000 to 600,000.</em>
    `,
  });

  if (signal.aborted) return;

  const g = groups.tower.style("opacity", 1);
  g.selectAll("*").remove();

  const usableW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const colW = usableW / top.length;

  // Ground line (the SDG target).
  const groundY = HEIGHT - PAD_BOTTOM;
  g.append("line")
    .attr("x1", PAD_LEFT - 10).attr("x2", WIDTH - PAD_RIGHT + 10)
    .attr("y1", groundY).attr("y2", groundY)
    .attr("stroke", "#F8A623").attr("stroke-width", 1.8).attr("stroke-dasharray", "5 3");
  g.append("text").attr("x", PAD_LEFT - 12).attr("y", groundY + 5).attr("text-anchor", "end")
    .style("font", "600 11px 'Open Sans',system-ui,sans-serif").style("fill", "#F8A623")
    .text(`SDG 70`);

  // Title + legend.
  g.append("text").attr("x", WIDTH / 2).attr("y", 42).attr("text-anchor", "middle")
    .style("font", "400 18px 'Oswald',system-ui,sans-serif").style("fill", "#242852")
    .text("Cumulative excess maternal deaths, 2024-2030");
  g.append("text").attr("x", WIDTH / 2).attr("y", 64).attr("text-anchor", "middle")
    .style("font", "12px 'Open Sans',system-ui,sans-serif").style("fill", "#888")
    .text(`1 dot = ${DOT_VALUE.toLocaleString()} lives · pace: ${paceLabel}`);

  // Tallest tower height = HEIGHT we have available
  const maxLives = d3.max(top, (d) => d[gapField]);
  const maxDots = Math.ceil(maxLives / DOT_VALUE);
  const available = groundY - PAD_TOP;
  const effectiveDy = Math.min(DOT_DY, available / maxDots);

  // Towers.
  const tower = g.selectAll("g.tower").data(top, (d) => d.iso3).enter().append("g")
    .attr("class", "tower")
    .attr("transform", (_d, i) => `translate(${PAD_LEFT + colW * (i + 0.5)},0)`);

  tower.each(function (d) {
    const dots = Math.round(d[gapField] / DOT_VALUE);
    const sel = d3.select(this);

    // Stack of dots growing upward from groundY.
    const grp = sel.append("g").attr("class", "stack");
    for (let k = 0; k < dots; k++) {
      grp.append("circle")
        .attr("cx", 0)
        .attr("cy", groundY)
        .attr("r", 0)
        .attr("fill", "#bc4749").attr("fill-opacity", 0.85);
    }
    grp.selectAll("circle")
      .transition()
      .delay((_e, k) => 100 + k * 8)
      .duration(180)
      .attr("cy", (_e, k) => groundY - (k + 1) * effectiveDy)
      .attr("r", DOT_R);

    // Country label below ground line.
    sel.append("text").attr("y", groundY + 22)
      .attr("text-anchor", "end")
      .attr("transform", `translate(2,${0}) rotate(-55,0,${groundY + 22})`)
      .style("font", "10px 'Open Sans',system-ui,sans-serif").style("fill", "#242852")
      .text(d.name);

    // Tower value (top).
    const topY = groundY - dots * effectiveDy - 8;
    sel.append("text").attr("x", 0).attr("y", topY).attr("text-anchor", "middle")
      .style("font", "600 10px 'Open Sans',system-ui,sans-serif").style("fill", "#bc4749")
      .style("opacity", 0)
      .text(`${(d[gapField] / 1000).toFixed(0)}K`)
      .transition().delay(100 + dots * 8 + 200).duration(300).style("opacity", 1);
  });

  // Total at top-right — rounded to nearest 10k to avoid false precision.
  const headlineLivesTotal = Math.round(totalLives / 10000) * 10000;
  g.append("text").attr("x", WIDTH - PAD_RIGHT).attr("y", 100).attr("text-anchor", "end")
    .style("font", "300 36px 'Oswald',system-ui,sans-serif").style("fill", "#bc4749")
    .text(`~${headlineLivesTotal.toLocaleString()}`);
  g.append("text").attr("x", WIDTH - PAD_RIGHT).attr("y", 118).attr("text-anchor", "end")
    .style("font", "11px 'Open Sans',system-ui,sans-serif").style("fill", "#888")
    .text(`preventable maternal deaths`);
  g.append("text").attr("x", WIDTH - PAD_RIGHT).attr("y", 132).attr("text-anchor", "end")
    .style("font", "11px 'Open Sans',system-ui,sans-serif").style("fill", "#888")
    .text(`2024 to 2030, vs. on-pace trajectory`);
}
