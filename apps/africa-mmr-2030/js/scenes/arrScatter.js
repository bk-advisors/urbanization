// Scene 5 — Observed ARR vs Required ARR scatter.
//   X = annual rate of reduction observed 2000-2023 (or post-2016)
//   Y = annual rate of reduction REQUIRED to hit 70 by 2030
// Countries below the y=x diagonal are on pace; above the diagonal are not.
// Bubble size = annual live births (cohort exposed to maternal risk).

import {
  clearGroups, clearNarration, hideCallout, setSection,
  showModeSwitch,
} from "../helpers.js";
import { WIDTH, HEIGHT, SDG_TARGET } from "../main.js";

const PAD_LEFT = 80, PAD_RIGHT = 80, PAD_TOP = 90, PAD_BOTTOM = 90;

export default async function arrScatter({ state, groups, signal }) {
  clearGroups(groups, ["scatter"]);
  clearNarration();
  hideCallout();
  showModeSwitch(true);

  const arrField = state.rVar === "recent" ? "arr_recent" : "arr_long";
  const arrLabel = state.rVar === "recent" ? "post-2016" : "2000-2023";

  // Only score countries that still need to reduce (arr_required > 0).
  const data = state.countries
    .filter((c) => c.arr_required > 0 && c[arrField] != null && c.births_2023_k != null)
    .map((c) => ({ ...c, _arr: c[arrField] }));

  // Domain bounds.
  const xMax = Math.max(0.12, d3.max(data, (d) => d._arr) ?? 0.1);
  const xMin = Math.min(-0.04, d3.min(data, (d) => d._arr) ?? -0.02);
  const yMax = Math.max(0.35, d3.max(data, (d) => d.arr_required) ?? 0.3);

  const onPace = data.filter((d) => d._arr >= d.arr_required);
  const offPace = data.filter((d) => d._arr < d.arr_required);
  const biggestGap = offPace.slice().sort((a, b) =>
    (b.arr_required - b._arr) * b.births_2023_k - (a.arr_required - a._arr) * a.births_2023_k
  )[0];

  setSection({
    title: `Observed ARR (${arrLabel}) vs required ARR to 2030`,
    body: `
      <strong>Horizontal axis</strong>: each country's actual annual rate of
      reduction in MMR over <strong>${arrLabel}</strong>.
      <br/>
      <strong>Vertical axis</strong>: the annual rate of reduction each
      country needs from 2023 to land at <strong>${SDG_TARGET}</strong> by 2030.
      <br/>
      <strong>Bubble size</strong>: annual live births (the cohort exposed).
      <br/><br/>
      The amber diagonal is <em>y&nbsp;=&nbsp;x</em>: where observed pace
      meets required pace. Countries below the line
      (<span style="color:#005CB9;">blue</span>) are reducing fast enough.
      Countries above
      (<span style="color:#bc4749;">red</span>) are not.
      <br/><br/>
      ${biggestGap ? `<strong>${biggestGap.name}</strong> has the largest combined gap: high required ARR, low observed ARR, and a cohort of <strong>${Math.round(biggestGap.births_2023_k).toLocaleString()}</strong> thousand births per year.` : ""}
      <br/><br/>
      Toggle the pace above between long-run (2000-2023) and the post-2016
      slowdown era.
    `,
  });

  if (signal.aborted) return;

  const g = groups.scatter.style("opacity", 1);
  g.selectAll("*").remove();

  const x = d3.scaleLinear().domain([xMin, xMax * 1.1]).range([PAD_LEFT, WIDTH - PAD_RIGHT]);
  const y = d3.scaleLinear().domain([0, yMax * 1.05]).range([HEIGHT - PAD_BOTTOM, PAD_TOP]);
  const r = d3.scaleSqrt()
    .domain([0, d3.max(data, (d) => d.births_2023_k) ?? 1])
    .range([4, 32]);

  // Axes.
  g.append("g").attr("transform", `translate(0,${HEIGHT - PAD_BOTTOM})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("+.0%")).ticks(7).tickSizeOuter(0))
    .call((s) => s.select(".domain").attr("stroke", "#aaa"))
    .call((s) => s.selectAll("text").style("font", "11px 'Open Sans',system-ui,sans-serif").style("fill", "#666"));
  g.append("g").attr("transform", `translate(${PAD_LEFT},0)`)
    .call(d3.axisLeft(y).tickFormat(d3.format("+.0%")).ticks(6).tickSizeOuter(0))
    .call((s) => s.select(".domain").attr("stroke", "#aaa"))
    .call((s) => s.selectAll("text").style("font", "11px 'Open Sans',system-ui,sans-serif").style("fill", "#666"));

  // Axis labels.
  g.append("text").attr("x", (PAD_LEFT + WIDTH - PAD_RIGHT) / 2).attr("y", HEIGHT - 35)
    .attr("text-anchor", "middle").style("font", "12px 'Open Sans',system-ui,sans-serif").style("fill", "#555")
    .text(`Observed annual rate of reduction, ${arrLabel} →`);
  g.append("text")
    .attr("transform", `translate(28,${(PAD_TOP + HEIGHT - PAD_BOTTOM) / 2}) rotate(-90)`)
    .attr("text-anchor", "middle").style("font", "12px 'Open Sans',system-ui,sans-serif").style("fill", "#555")
    .text("Required ARR to hit MMR 70 by 2030 ↑");

  // y = x diagonal.
  const diagXMin = Math.max(0, xMin);
  const diagXMax = Math.min(xMax * 1.1, yMax * 1.05);
  g.append("line")
    .attr("x1", x(diagXMin)).attr("y1", y(diagXMin))
    .attr("x2", x(diagXMax)).attr("y2", y(diagXMax))
    .attr("stroke", "#F8A623").attr("stroke-width", 1.8).attr("stroke-dasharray", "5 3");

  g.append("text").attr("x", x(diagXMax)).attr("y", y(diagXMax) - 10)
    .attr("text-anchor", "end")
    .style("font", "600 11px 'Open Sans',system-ui,sans-serif").style("fill", "#F8A623")
    .text("on pace (observed = required)");

  // Zone labels.
  g.append("text").attr("x", WIDTH - PAD_RIGHT - 20).attr("y", HEIGHT - PAD_BOTTOM - 30)
    .attr("text-anchor", "end")
    .style("font", "400 12px 'Oswald',system-ui,sans-serif").style("fill", "#005CB9")
    .text("ON-TRACK ZONE");
  g.append("text").attr("x", PAD_LEFT + 20).attr("y", PAD_TOP + 30)
    .style("font", "400 12px 'Oswald',system-ui,sans-serif").style("fill", "#bc4749")
    .text("OFF-TRACK ZONE");

  // Title.
  g.append("text").attr("x", WIDTH / 2).attr("y", 42).attr("text-anchor", "middle")
    .style("font", "400 18px 'Oswald',system-ui,sans-serif").style("fill", "#242852")
    .text(`Are countries reducing fast enough?`);

  // Bubbles.
  const country = d3.select("#callOutCountry");
  const wrap = d3.select("#callOutCountryWrapper").style("display", "none");
  country.html("");

  const bubble = g.selectAll("g.b").data(data, (d) => d.iso3).enter().append("g")
    .attr("class", "b")
    .attr("transform", (d) => `translate(${x(d._arr)},${y(d.arr_required)})`)
    .style("cursor", "pointer");

  bubble.append("circle")
    .attr("r", 0)
    .attr("fill", (d) => d._arr >= d.arr_required ? "#005CB9" : "#bc4749")
    .attr("fill-opacity", 0.6)
    .attr("stroke", (d) => d._arr >= d.arr_required ? "#004696" : "#a83a28")
    .attr("stroke-width", 0.8)
    .on("mouseover", (e, d) => {
      bubble.select("circle").attr("fill-opacity", (dd) => dd.iso3 === d.iso3 ? 0.9 : 0.15);
      const proj = state.rVar === "recent" ? d.mmr_2030_recent : d.mmr_2030_long;
      country.html(`<strong>${d.name}</strong> · ${d.iso3}<br/>
        <small>MMR 2023: <strong>${Math.round(d.mmr_2023)}</strong></small><br/>
        <small>Observed ARR (${arrLabel}): <strong>${d3.format("+.1%")(d._arr)}</strong></small><br/>
        <small>Required ARR: <strong>${d3.format("+.1%")(d.arr_required)}</strong></small><br/>
        <small>Projected 2030 MMR: <strong style="color:${proj <= SDG_TARGET ? "#005CB9" : "#bc4749"};">${Math.round(proj)}</strong></small><br/>
        <small>Births/yr: ${Math.round(d.births_2023_k).toLocaleString()}K</small>`);
      const rect = e.currentTarget.getBoundingClientRect();
      wrap.style("display", "block")
          .style("left", `${rect.left + window.scrollX + 14}px`)
          .style("top",  `${rect.top  + window.scrollY - 6}px`);
    })
    .on("mouseout", () => {
      bubble.select("circle").attr("fill-opacity", 0.6);
      country.html("");
      wrap.style("display", "none");
    })
    .transition().duration(900).delay((_d, i) => i * 25)
    .attr("r", (d) => r(d.births_2023_k));

  // ISO3 labels inside the bigger bubbles.
  bubble.filter((d) => r(d.births_2023_k) > 12)
    .append("text")
    .attr("text-anchor", "middle").attr("dy", "0.35em")
    .style("font", "11px 'Open Sans',system-ui,sans-serif")
    .style("fill", "#fff").style("pointer-events", "none")
    .style("opacity", 0)
    .text((d) => d.iso3)
    .transition().delay(900).duration(400).style("opacity", 1);

  // If a deep-link country was requested, highlight + emphasise.
  if (state.deepCountry) {
    const dl = data.find((d) => d.iso3 === state.deepCountry);
    if (dl) {
      g.append("circle")
        .attr("cx", x(dl._arr)).attr("cy", y(dl.arr_required))
        .attr("r", r(dl.births_2023_k) + 8)
        .attr("fill", "none").attr("stroke", "#242852").attr("stroke-width", 2)
        .attr("stroke-dasharray", "4 3")
        .style("opacity", 0)
        .transition().delay(1000).duration(600).style("opacity", 1);
    }
  }
}
