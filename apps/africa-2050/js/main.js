// Africa 2025 → 2035 — narrative engine.

import { cities }    from "../data/cities.js";
import { countries } from "../data/countries.js";

import { setActiveCircle, setMode } from "./helpers.js";

import introText          from "./scenes/introText.js";
import startBar           from "./scenes/startBar.js";
import totalAreaMap       from "./scenes/totalAreaMap.js";
import introSlope         from "./scenes/introSlope.js";
import slopeGraph         from "./scenes/slopeGraph.js";
import introDotHistogram  from "./scenes/introDotHistogram.js";
import dotHistogram       from "./scenes/dotHistogram.js";
import introUrbanScatter  from "./scenes/introUrbanScatter.js";
import urbanPopDot        from "./scenes/urbanPopDot.js";
import finalText          from "./scenes/finalText.js";

export const WIDTH  = 1000;
export const HEIGHT = 710;

export const fmt = {
  comma:    d3.format(",.0f"),
  one:      d3.format(".1f"),
  si:       d3.format(".2s"),
  percent:  d3.format(".0%"),
  percent1: d3.format("+.1%"),
};

// ---------------------------------------------------------------------------
// Global state
// ---------------------------------------------------------------------------

export const state = {
  counter: 0,
  modus:   "Map",
  rVar:    "pop",
  cities,
  countries,
  basemap: null,
};

// ---------------------------------------------------------------------------
// SVG scaffolding — created once, mutated by scenes.
// ---------------------------------------------------------------------------

const svg = d3.select("#chart").append("svg")
  .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

export const groups = {
  svg,
  map:         svg.append("g").attr("class", "map"),
  cities2035:  svg.append("g").attr("class", "cities-2035"),
  cities2025:  svg.append("g").attr("class", "cities-2025"),
  startBars:   svg.append("g").attr("class", "start-bars"),
  barChart:    svg.append("g").attr("class", "bar-chart"),
  barOther:    svg.append("g").attr("class", "bar-other"),
  slope:       svg.append("g").attr("class", "slope"),
  dotWrapper:  svg.append("g").attr("class", "dot-wrapper"),
  overlay:     svg.append("g").attr("class", "overlay"),
};

// ---------------------------------------------------------------------------
// Scene registry
// ---------------------------------------------------------------------------

const scenes = [
  introText, startBar, totalAreaMap, introSlope, slopeGraph,
  introDotHistogram, dotHistogram, introUrbanScatter, urbanPopDot, finalText,
];

const LAST = scenes.length - 1;

const stepModus = {
  2: "Map", 4: "Slope", 6: "Dot", 8: "Scatter",
};

// ---------------------------------------------------------------------------
// Scene cancellation — AbortController per scene play; svg.interrupt() kills
// in-flight d3 transitions across all groups.
// ---------------------------------------------------------------------------

let currentController = null;

function abortCurrentScene() {
  if (currentController) {
    currentController.abort();
    svg.selectAll("*").interrupt();
  }
  currentController = new AbortController();
  return currentController.signal;
}

// ---------------------------------------------------------------------------
// Dispatcher — exposed to scenes as `advance` so they can chain.
// ---------------------------------------------------------------------------

async function order() {
  if (state.counter < 0)    state.counter = 0;
  if (state.counter > LAST) state.counter = LAST;

  if (stepModus[state.counter]) state.modus = stepModus[state.counter];

  setActiveCircle(state.counter);
  updateNavButtons();

  const signal = abortCurrentScene();
  const scene  = scenes[state.counter];
  try {
    await scene({ state, groups, fmt, signal });
  } catch (err) {
    if (err?.name !== "AbortError") {
      console.error(`Scene ${state.counter} (${scene.name}) failed:`, err);
    }
  }
}

function updateNavButtons() {
  d3.select("#clickerBack")
    .classed("inactiveButton", state.counter === 0)
    .classed("activeButton",   state.counter > 0);
  d3.select("#clickerFront")
    .classed("inactiveButton", state.counter === LAST)
    .classed("activeButton",   state.counter < LAST);
}

// ---------------------------------------------------------------------------
// Button + step-circle wiring
// ---------------------------------------------------------------------------

d3.select("#clickerFront").on("click", () => {
  if (state.counter < LAST) { state.counter += 1; order(); }
});

d3.select("#clickerBack").on("click", () => {
  if (state.counter > 0) { state.counter -= 1; order(); }
});

// Every step circle is clickable.
d3.selectAll(".circleBase[data-step]").on("click", function () {
  const target = Number(this.dataset.step);
  if (Number.isFinite(target) && target !== state.counter) {
    state.counter = target;
    order();
  }
});

// Mode switch — fires the active scene with new rVar.
d3.selectAll(".mode-btn").on("click", function () {
  const mode = this.dataset.mode;
  setMode(mode);
  state.rVar = mode;
  order();
});

// Keyboard navigation: ← / → for Back / Continue, 1..3 for metric switch.
document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea, [contenteditable]")) return;
  if (e.key === "ArrowRight" && state.counter < LAST) {
    state.counter += 1; order(); e.preventDefault();
  } else if (e.key === "ArrowLeft" && state.counter > 0) {
    state.counter -= 1; order(); e.preventDefault();
  } else if (e.key === "1" || e.key === "2" || e.key === "3") {
    const mode = { "1": "pop", "2": "land", "3": "density" }[e.key];
    setMode(mode);
    state.rVar = mode;
    order();
    e.preventDefault();
  }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function boot() {
  state.basemap = await d3.json("data/africa_countries.geojson");
  order();
}

boot();
