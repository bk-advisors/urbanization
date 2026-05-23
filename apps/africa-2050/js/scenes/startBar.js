// Scene 1 — two-bar comparison: total African urban population, 2025 vs 2035.
// Single render on entry; user advances manually.

import {
  clearGroups, clearNarration, hideCallout, setSection, showModeSwitch,
} from "../helpers.js";

export default async function startBar({ state, groups, signal }) {
  clearGroups(groups, ["startBars"]);
  clearNarration();
  hideCallout();
  showModeSwitch(false);

  const urban_2025 = d3.sum(state.countries, (c) => c.urban_pop_2025);
  const urban_2035 = d3.sum(state.countries, (c) => c.urban_pop_2035);
  const fmtM = (v) => `${d3.format(",.0f")(v / 1000)} M`;
  const fmtPct = d3.format(".0%");

  setSection({
    hero: `+ <span style="color:#c34a36;">${fmtM(urban_2035 - urban_2025)}</span><br/>urban Africans in 10 years.`,
    title: "Urban Africa, end to end",
    body: `
      Sum every city and town across all 54 African countries.
      <br/><br/>
      In <span style="color:#b08d57;font-weight:600;">2025</span>:
      <strong>${fmtM(urban_2025)}</strong> people live in urban areas.
      <br/>
      By <span style="color:#c34a36;font-weight:600;">2035</span>:
      <strong>${fmtM(urban_2035)}</strong> — a
      <strong>${fmtPct((urban_2035 - urban_2025) / urban_2025)}</strong>
      increase in just a decade.
      <br/><br/>
      That difference — about the entire population of Russia — is the size
      of urban Africa's next growth pulse.
    `,
  });

  if (signal.aborted) return;

  // Two horizontal bars in the SVG.
  const W = 1000, H = 710;
  const barH = 80, gap = 36;
  const x0 = 220, x1 = 880;
  const y0 = 270;
  const max = Math.max(urban_2025, urban_2035);
  const x = d3.scaleLinear().domain([0, max]).range([0, x1 - x0]);

  const g = groups.startBars.style("opacity", 1);
  g.selectAll("*").remove();

  const data = [
    { label: "2025", value: urban_2025, color: "#b08d57", y: y0 },
    { label: "2035", value: urban_2035, color: "#c34a36", y: y0 + barH + gap },
  ];

  g.selectAll("text.year").data(data).enter().append("text")
    .attr("class", "year")
    .attr("x", x0 - 20).attr("y", (d) => d.y + barH * 0.65)
    .attr("text-anchor", "end")
    .style("font", "300 32px 'Oswald',system-ui,sans-serif")
    .style("fill", (d) => d.color)
    .text((d) => d.label);

  g.selectAll("rect.bar").data(data).enter().append("rect")
    .attr("class", "bar")
    .attr("x", x0).attr("y", (d) => d.y)
    .attr("height", barH).attr("width", 0)
    .attr("fill", (d) => d.color)
    .transition().duration(1100).delay((_d, i) => i * 400)
    .attr("width", (d) => x(d.value));

  g.selectAll("text.val").data(data).enter().append("text")
    .attr("class", "val")
    .attr("y", (d) => d.y + barH * 0.65)
    .style("font", "300 28px 'Oswald',system-ui,sans-serif")
    .style("fill", "#fff")
    .style("text-anchor", "end")
    .style("opacity", 0)
    .attr("x", (d) => x0 + x(d.value) - 16)
    .text((d) => fmtM(d.value))
    .transition().delay((_d, i) => 700 + i * 400).duration(500)
    .style("opacity", 0.95);

  // Dashed delta annotation between the two bars
  const startX = x0 + x(urban_2025);
  const endX = x0 + x(urban_2035);
  g.append("line")
    .attr("x1", startX).attr("x2", startX)
    .attr("y1", y0 + barH).attr("y2", y0 + barH)
    .attr("stroke", "#999").attr("stroke-dasharray", "3 4")
    .transition().delay(1300).duration(500)
    .attr("y2", y0 + barH + gap + barH);
  g.append("text")
    .attr("x", (startX + endX) / 2).attr("y", y0 + barH * 2 + gap + 36)
    .attr("text-anchor", "middle")
    .style("font", "300 18px 'Oswald',system-ui,sans-serif")
    .style("fill", "#c34a36")
    .style("opacity", 0)
    .text(`+ ${fmtM(urban_2035 - urban_2025)}`)
    .transition().delay(1700).duration(400).style("opacity", 0.95);
}
