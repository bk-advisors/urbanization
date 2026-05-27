// Scene 4 — "Race to 2030" beeswarm.
// Every African country is a dot on a year × MMR plane. A play control
// animates the dots left-to-right across 2000-2030 — observed values
// through 2023, then the long-run-pace projection through 2030.
// Dots crossing under the SDG=70 line pulse blue; those still above at 2030
// turn red. The single most shareable frame.

import {
  clearGroups, clearNarration, hideCallout, setSection,
  showModeSwitch, updateCallout,
} from "../helpers.js";
import { WIDTH, HEIGHT, SDG_TARGET, BASE_YEAR, TARGET_YEAR, seriesByIso } from "../main.js";

const PAD_LEFT = 80, PAD_RIGHT = 220, PAD_TOP = 90, PAD_BOTTOM = 80;
const YMAX = 1400;  // most countries fall below

export default async function raceTo2030({ state, groups, signal }) {
  clearGroups(groups, ["race"]);
  clearNarration();
  hideCallout();
  showModeSwitch(false);

  const onTrack = state.countries.filter((c) => c.on_track);
  const offTrack = state.countries.filter((c) => !c.on_track);

  setSection({
    hero: `<span style="color:#005CB9;">${onTrack.length} cross the line.</span> <span style="color:#bc4749;">${offTrack.length} don't.</span>`,
    title: "The race to 2030",
    body: `
      Each dot is one African country. The horizontal axis is time, from
      <strong>2000</strong> on the left to <strong>${TARGET_YEAR}</strong> on the right.
      Up the vertical axis is the country's maternal mortality ratio.
      <br/><br/>
      Press <strong>▶ Play</strong> to start the race. Through 2023 you'll
      see the actual recorded values. Beyond 2023, each country continues at
      its long-run pace from 2000 to 2023: the observed Annual Rate of
      Reduction projected forward.
      <br/><br/>
      The amber horizontal line at <strong>${SDG_TARGET}</strong> is the SDG
      3.1 finish line. Watch which dots drop below it before 2030
      (<span style="color:#005CB9;">turn blue</span>) and which finish above
      (<span style="color:#bc4749;">turn red</span>).
      <br/><br/>
      <em style="color:#888;">Tip: drag the scrubber to inspect any year. Hover any
      dot to see its full profile.</em>
    `,
  });

  if (signal.aborted) return;

  const g = groups.race.style("opacity", 1);
  g.selectAll("*").remove();

  const x = d3.scaleLinear().domain([2000, TARGET_YEAR]).range([PAD_LEFT, WIDTH - PAD_RIGHT]);
  const y = d3.scaleLinear().domain([0, YMAX]).range([HEIGHT - PAD_BOTTOM, PAD_TOP]);

  // Axes
  g.append("g").attr("transform", `translate(0,${HEIGHT - PAD_BOTTOM})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(7).tickSizeOuter(0))
    .call((s) => s.select(".domain").attr("stroke", "#aaa"))
    .call((s) => s.selectAll("text").style("font", "11px 'Open Sans',system-ui,sans-serif").style("fill", "#666"));
  g.append("g").attr("transform", `translate(${PAD_LEFT},0)`)
    .call(d3.axisLeft(y).ticks(7).tickSizeOuter(0))
    .call((s) => s.select(".domain").attr("stroke", "#aaa"))
    .call((s) => s.selectAll("text").style("font", "11px 'Open Sans',system-ui,sans-serif").style("fill", "#666"));

  // Axis labels.
  g.append("text").attr("x", (PAD_LEFT + WIDTH - PAD_RIGHT) / 2).attr("y", HEIGHT - 35)
    .attr("text-anchor", "middle").style("font", "12px 'Open Sans',system-ui,sans-serif").style("fill", "#555")
    .text("Year →");
  g.append("text")
    .attr("transform", `translate(28,${(PAD_TOP + HEIGHT - PAD_BOTTOM) / 2}) rotate(-90)`)
    .attr("text-anchor", "middle").style("font", "12px 'Open Sans',system-ui,sans-serif").style("fill", "#555")
    .text("MMR (deaths per 100,000 live births)");

  // SDG target line (the finish line).
  g.append("line")
    .attr("x1", PAD_LEFT).attr("x2", WIDTH - PAD_RIGHT)
    .attr("y1", y(SDG_TARGET)).attr("y2", y(SDG_TARGET))
    .attr("stroke", "#F8A623").attr("stroke-width", 1.8).attr("stroke-dasharray", "5 3");
  g.append("text").attr("x", WIDTH - PAD_RIGHT - 6).attr("y", y(SDG_TARGET) - 6)
    .attr("text-anchor", "end")
    .style("font", "600 12px 'Open Sans',system-ui,sans-serif").style("fill", "#F8A623")
    .text(`SDG 3.1 target = ${SDG_TARGET}`);

  // Title above plot area.
  g.append("text").attr("x", WIDTH / 2).attr("y", 42).attr("text-anchor", "middle")
    .style("font", "400 18px 'Oswald',system-ui,sans-serif").style("fill", "#242852")
    .text("Each dot is a country racing toward 2030");

  // Build full year-by-year trajectory for each country.
  function trajectoryAt(country, year) {
    const obs = seriesByIso.get(country.iso3) ?? [];
    if (year <= BASE_YEAR) {
      // Linear interpolation between adjacent observed years (data is annual but may be sparse).
      const exact = obs.find((p) => p.year === year);
      if (exact) return exact.mmr;
      const before = [...obs].reverse().find((p) => p.year < year);
      const after = obs.find((p) => p.year > year);
      if (before && after) {
        const t = (year - before.year) / (after.year - before.year);
        return before.mmr + t * (after.mmr - before.mmr);
      }
      return country.mmr_2023;
    }
    // Project forward at long-run pace.
    const yrs = year - BASE_YEAR;
    if (country.arr_long == null) return country.mmr_2023;
    return country.mmr_2023 * (1 - country.arr_long) ** yrs;
  }

  // Pre-compute the full annual trajectory once per country — used by both
  // the trail (line behind the dot) and the dot position.
  const fullTrajectory = new Map();
  state.countries.forEach((c) => {
    const pts = [];
    for (let yr = 2000; yr <= TARGET_YEAR; yr++) {
      pts.push({ year: yr, mmr: trajectoryAt(c, yr) });
    }
    fullTrajectory.set(c.iso3, pts);
  });

  const lineGen = d3.line()
    .x((p) => x(p.year))
    .y((p) => y(Math.min(p.mmr, YMAX)));

  // Trails behind dots — drawn first so dots render on top.
  const trails = g.append("g").attr("class", "trails");
  const trail = trails.selectAll("path.trail").data(state.countries, (d) => d.iso3).enter().append("path")
    .attr("class", "trail")
    .attr("fill", "none")
    .attr("stroke", (d) => d.on_track ? "#005CB9" : "#bc4749")
    .attr("stroke-opacity", 0.22)
    .attr("stroke-width", 1.1)
    .attr("d", (d) => lineGen([fullTrajectory.get(d.iso3)[0]]));

  // Dot per country.
  const dots = g.append("g").attr("class", "dots");
  const dot = dots.selectAll("g.country-dot").data(state.countries, (d) => d.iso3).enter().append("g")
    .attr("class", "country-dot")
    .style("cursor", "pointer")
    .on("mouseover", (_e, d) => {
      updateCallout(d, { proj2030: d.mmr_2030_long, projLabel: "Long pace" });
      dots.selectAll("g.country-dot").style("opacity", (dd) => dd.iso3 === d.iso3 ? 1 : 0.18);
    })
    .on("mouseout", () => {
      hideCallout();
      dots.selectAll("g.country-dot").style("opacity", 1);
    });

  dot.append("circle")
    .attr("r", 6)
    .attr("fill", "#bc4749").attr("fill-opacity", 0.7)
    .attr("stroke", "#fff").attr("stroke-width", 1);

  dot.append("text")
    .attr("y", 3).attr("text-anchor", "middle")
    .style("font", "8px 'Open Sans',system-ui,sans-serif").style("fill", "#fff").style("pointer-events", "none")
    .text((d) => d.iso3);

  // Position dots + grow trails at the active year.
  function positionAt(year) {
    // Trails: render every annual point up to the active year, plus an
    // interpolated terminus so the trail tip exactly meets the dot.
    trail.attr("d", (d) => {
      const pts = fullTrajectory.get(d.iso3);
      const upTo = pts.filter((p) => p.year <= Math.floor(year));
      const frac = year - Math.floor(year);
      if (frac > 0 && Math.floor(year) < TARGET_YEAR) {
        const a = pts[Math.floor(year) - 2000];
        const b = pts[Math.floor(year) - 2000 + 1];
        if (a && b) upTo.push({ year, mmr: a.mmr + frac * (b.mmr - a.mmr) });
      }
      return lineGen(upTo);
    }).attr("stroke", (d) => {
      const mmr = trajectoryAt(d, year);
      return mmr <= SDG_TARGET ? "#005CB9" : "#bc4749";
    });

    dot.each(function (d) {
      const mmr = trajectoryAt(d, year);
      const crossed = mmr <= SDG_TARGET;
      const cx = x(year);
      const cy = y(Math.min(mmr, YMAX));
      d3.select(this).select("circle")
        .attr("cx", cx).attr("cy", cy)
        .attr("fill", crossed ? "#005CB9" : "#bc4749");
      d3.select(this).select("text")
        .attr("x", cx).attr("y", cy + 3);
    });
  }

  // Initial position = 2000.
  positionAt(2000);

  // Controls — Play / Pause + scrubber.
  const controlsY = HEIGHT - PAD_BOTTOM + 32;
  const ctlX = WIDTH - PAD_RIGHT + 24;

  const playBtn = g.append("g").attr("class", "playBtn").style("cursor", "pointer")
    .attr("transform", `translate(${ctlX},${PAD_TOP + 40})`);
  playBtn.append("rect").attr("x", 0).attr("y", 0).attr("width", 80).attr("height", 30)
    .attr("rx", 4).attr("fill", "#242852");
  const playLabel = playBtn.append("text").attr("x", 40).attr("y", 20).attr("text-anchor", "middle")
    .style("font", "600 12px 'Open Sans',system-ui,sans-serif").style("fill", "#fff")
    .text("▶ Play");

  // Year display.
  const yearDisp = g.append("text").attr("x", ctlX + 40).attr("y", PAD_TOP + 102)
    .attr("text-anchor", "middle")
    .style("font", "400 28px 'Oswald',system-ui,sans-serif").style("fill", "#242852")
    .text(2000);

  // Scoreboard.
  const scoreOnTrack = g.append("text").attr("x", ctlX).attr("y", PAD_TOP + 140)
    .style("font", "600 13px 'Open Sans',system-ui,sans-serif").style("fill", "#005CB9").text("");
  const scoreOffTrack = g.append("text").attr("x", ctlX).attr("y", PAD_TOP + 162)
    .style("font", "600 13px 'Open Sans',system-ui,sans-serif").style("fill", "#bc4749").text("");

  function updateScoreboard(year) {
    let below = 0, above = 0;
    state.countries.forEach((c) => {
      const v = trajectoryAt(c, year);
      if (v <= SDG_TARGET) below++; else above++;
    });
    scoreOnTrack.text(`${below} below target`);
    scoreOffTrack.text(`${above} still above`);
  }
  updateScoreboard(2000);

  // Scrubber (positioned along x-axis).
  const scrubBg = g.append("line")
    .attr("x1", PAD_LEFT).attr("x2", WIDTH - PAD_RIGHT)
    .attr("y1", controlsY).attr("y2", controlsY)
    .attr("stroke", "#ddd").attr("stroke-width", 3).attr("stroke-linecap", "round");
  const scrub = g.append("circle")
    .attr("cx", x(2000)).attr("cy", controlsY).attr("r", 7)
    .attr("fill", "#242852").attr("stroke", "#fff").attr("stroke-width", 2)
    .style("cursor", "ew-resize");

  let currentYear = 2000;
  let timer = null;
  let isPlaying = false;

  function setYear(y) {
    currentYear = Math.max(2000, Math.min(TARGET_YEAR, y));
    scrub.attr("cx", x(currentYear));
    yearDisp.text(Math.round(currentYear));
    positionAt(currentYear);
    updateScoreboard(currentYear);
  }

  function play() {
    if (isPlaying) return;
    isPlaying = true;
    playLabel.text("⏸ Pause");
    if (currentYear >= TARGET_YEAR) setYear(2000);
    const yearsPerSec = 3.5;  // full race (2000 → 2030) ≈ 8.5 seconds
    timer = d3.timer((elapsed) => {
      if (signal.aborted) { timer.stop(); return; }
      const yr = 2000 + (elapsed / 1000) * yearsPerSec;
      setYear(yr);
      if (yr >= TARGET_YEAR) {
        timer.stop();
        isPlaying = false;
        playLabel.text("↻ Replay");
      }
    });
  }

  function pause() {
    if (timer) timer.stop();
    isPlaying = false;
    playLabel.text(currentYear >= TARGET_YEAR ? "↻ Replay" : "▶ Play");
  }

  playBtn.on("click", () => isPlaying ? pause() : play());

  // Drag the scrubber to pick a year.
  scrub.call(d3.drag()
    .on("start", () => pause())
    .on("drag", (e) => {
      const yr = x.invert(Math.max(PAD_LEFT, Math.min(WIDTH - PAD_RIGHT, e.x)));
      setYear(yr);
    }));

  // Click anywhere on the scrubber track.
  scrubBg.style("cursor", "pointer").on("click", (e) => {
    pause();
    const [mx] = d3.pointer(e, g.node());
    const yr = x.invert(Math.max(PAD_LEFT, Math.min(WIDTH - PAD_RIGHT, mx)));
    setYear(yr);
  });

  // Abort cleanup.
  signal.addEventListener("abort", () => { if (timer) timer.stop(); });
}
