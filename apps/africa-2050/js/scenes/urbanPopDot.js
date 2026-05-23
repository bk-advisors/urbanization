// Scene 8 — country scatter.
//   X = urbanisation rate 2025  Y = urban-pop growth 2025→2035  Size = urban pop 2035

import {
  clearGroups, clearNarration, hideCallout, setSection, showModeSwitch,
} from "../helpers.js";

const W = 1000, H = 710;
const PAD_LEFT = 80, PAD_RIGHT = 80, PAD_TOP = 110, PAD_BOTTOM = 90;

export default async function urbanPopDot({ state, groups, signal }) {
  clearGroups(groups, ["dotWrapper"]);
  clearNarration();
  hideCallout();
  showModeSwitch(false);

  const data = state.countries
    .filter((c) => c.total_pop_2025 > 0 && c.urban_pop_2025 > 0 && c.urban_pop_2035 > 0)
    .map((c) => ({ ...c, growth: c.urban_pop_2035 / c.urban_pop_2025 - 1 }));

  const fmtM = (v) => v >= 1000 ? `${d3.format(",.1f")(v / 1000)} M` : `${d3.format(",.0f")(v)} K`;
  const biggest = data.slice().sort((a, b) => b.urban_pop_2035 - a.urban_pop_2035)[0];
  const fastest = data.slice().sort((a, b) => b.growth - a.growth)[0];
  const mostUrban = data.slice().sort((a, b) => b.urban_rate_2025 - a.urban_rate_2025)[0];

  setSection({
    title: "54 countries on two axes",
    body: `
      <strong>Across</strong>: how urban a country is in 2025.<br/>
      <strong>Up</strong>: how fast its urban population grows by 2035.<br/>
      <strong>Bubble size</strong>: projected 2035 urban population.
      <br/><br/>
      <strong>${biggest.name}</strong> is by far the largest urban population
      (${fmtM(biggest.urban_pop_2035)} by 2035).
      <br/>
      <strong>${fastest.name}</strong> urbanises fastest
      (+${d3.format(".0%")(fastest.growth)} in 10 years).
      <br/>
      <strong>${mostUrban.name}</strong> is already the most urban
      (${d3.format(".0%")(mostUrban.urban_rate_2025)}).
      <br/><br/>
      Most countries sit in the left half — much of the urbanisation is ahead.
    `,
  });

  if (signal.aborted) return;

  const x = d3.scaleLinear().domain([0.10, 0.95]).range([PAD_LEFT, W - PAD_RIGHT]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, (d) => d.growth) * 1.05])
    .range([H - PAD_BOTTOM, PAD_TOP]);
  const r = d3.scaleSqrt()
    .domain([0, d3.max(data, (d) => d.urban_pop_2035)])
    .range([3, 32]);

  const g = groups.dotWrapper.style("opacity", 1);
  g.selectAll("*").remove();

  const xAxis = d3.axisBottom(x).tickFormat(d3.format(".0%")).ticks(8).tickSizeOuter(0);
  const yAxis = d3.axisLeft(y).tickFormat(d3.format("+.0%")).ticks(6).tickSizeOuter(0);
  g.append("g").attr("transform", `translate(0,${H - PAD_BOTTOM})`).call(xAxis)
    .call((s) => s.select(".domain").attr("stroke", "#aaa"))
    .call((s) => s.selectAll("text").style("font", "11px 'Open Sans',system-ui,sans-serif").style("fill", "#666"));
  g.append("g").attr("transform", `translate(${PAD_LEFT},0)`).call(yAxis)
    .call((s) => s.select(".domain").attr("stroke", "#aaa"))
    .call((s) => s.selectAll("text").style("font", "11px 'Open Sans',system-ui,sans-serif").style("fill", "#666"));

  g.append("text").attr("x", (PAD_LEFT + W - PAD_RIGHT) / 2).attr("y", H - 30)
    .attr("text-anchor", "middle")
    .style("font", "12px 'Open Sans',system-ui,sans-serif").style("fill", "#555")
    .text("Urbanisation rate in 2025 →");
  g.append("text")
    .attr("transform", `translate(28,${(PAD_TOP + H - PAD_BOTTOM) / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .style("font", "12px 'Open Sans',system-ui,sans-serif").style("fill", "#555")
    .text("Urban population growth, 2025 → 2035 ↑");

  const country = d3.select("#callOutCountry");
  const wrap = d3.select("#callOutCountryWrapper").style("display", "none");
  country.html("");

  const bubble = g.selectAll("g.country-bubble").data(data, (d) => d.iso3).enter().append("g")
    .attr("class", "country-bubble")
    .attr("transform", (d) => `translate(${x(d.urban_rate_2025)},${y(d.growth)})`);

  bubble.append("circle")
    .attr("r", 0).attr("fill", "#bc4749").attr("fill-opacity", 0.5)
    .attr("stroke", "#a83a28").attr("stroke-width", 0.8)
    .style("cursor", "pointer")
    .on("mouseover", (e, d) => {
      bubble.select("circle").attr("fill-opacity", (x) => x.iso3 === d.iso3 ? 0.85 : 0.12);
      country.html(`<strong>${d.name}</strong> · ${d.iso3}<br/>
        <small>2025: ${fmtM(d.urban_pop_2025)} urban (${d3.format(".0%")(d.urban_rate_2025)})</small><br/>
        <small>2035: ${fmtM(d.urban_pop_2035)} urban (${d3.format(".0%")(d.urban_rate_2035)})</small><br/>
        <small style="color:#bc4749;">+${d3.format(".0%")(d.growth)} over 10 years</small>`);
      const rect = e.currentTarget.getBoundingClientRect();
      wrap.style("display", "block")
          .style("left", `${rect.left + window.scrollX + 14}px`)
          .style("top",  `${rect.top  + window.scrollY - 6}px`);
    })
    .on("mouseout", () => {
      bubble.select("circle").attr("fill-opacity", 0.5);
      country.html("");
      wrap.style("display", "none");
    })
    .transition().duration(900)
    .attr("r", (d) => r(d.urban_pop_2035));

  bubble.filter((d) => d.urban_pop_2035 > 30000)
    .append("text")
    .attr("text-anchor", "middle").attr("dy", "0.35em")
    .style("font", "11px 'Open Sans',system-ui,sans-serif")
    .style("fill", "#fff").style("pointer-events", "none")
    .style("opacity", 0)
    .text((d) => d.iso3)
    .transition().delay(600).duration(400).style("opacity", 1);
}
