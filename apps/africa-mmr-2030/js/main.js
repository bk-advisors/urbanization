// Africa & SDG 3.1 — the road from 2023 to 2030.
// Narrative engine cloned from africa-2050.

import { countries } from "../data/countries.js";
import { mmr }       from "../data/mmr.js";

import { setActiveCircle, setMode } from "./helpers.js";

import birthCohortIntro     from "./scenes/birthCohortIntro.js";
import baselineChoropleth   from "./scenes/baselineChoropleth.js";
import targetBar            from "./scenes/targetBar.js";
import trendSmallMultiples  from "./scenes/trendSmallMultiples.js";
import raceTo2030           from "./scenes/raceTo2030.js";
import arrScatter           from "./scenes/arrScatter.js";
import gapTower             from "./scenes/gapTower.js";
import finalText            from "./scenes/finalText.js";

export const WIDTH  = 1000;
export const HEIGHT = 710;

export const fmt = {
  comma:    d3.format(",.0f"),
  one:      d3.format(".1f"),
  si:       d3.format(".2s"),
  percent:  d3.format(".0%"),
  percent1: d3.format("+.1%"),
  arr:      d3.format("+.1%"),  // annual rate of reduction
};

export const SDG_TARGET = 70;
export const BASE_YEAR = 2023;
export const TARGET_YEAR = 2030;

// Build per-country time-series lookup once.
export const seriesByIso = (() => {
  const out = new Map();
  for (const r of mmr) {
    if (!out.has(r.iso3)) out.set(r.iso3, []);
    out.get(r.iso3).push({ year: r.year, mmr: r.mmr });
  }
  for (const arr of out.values()) arr.sort((a, b) => a.year - b.year);
  return out;
})();

export const state = {
  counter: 0,
  modus:   "Map",
  rVar:    "long",  // long | recent | required
  countries,
  basemap: null,
};

// Apply URL params: ?country=NGA highlights a country; ?step=N opens a specific scene.
const params = new URLSearchParams(window.location.search);
state.deepCountry = (params.get("country") || "").toUpperCase() || null;
state.deepStep = (() => {
  const n = parseInt(params.get("step"), 10);
  return Number.isInteger(n) && n >= 0 ? n : null;
})();

const svg = d3.select("#chart").append("svg")
  .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

export const groups = {
  svg,
  map:        svg.append("g").attr("class", "map"),
  choropleth: svg.append("g").attr("class", "choropleth"),
  bars:       svg.append("g").attr("class", "bars"),
  multiples:  svg.append("g").attr("class", "multiples"),
  race:       svg.append("g").attr("class", "race"),
  scatter:    svg.append("g").attr("class", "scatter"),
  tower:      svg.append("g").attr("class", "tower"),
  overlay:    svg.append("g").attr("class", "overlay"),
};

const scenes = [
  birthCohortIntro, baselineChoropleth, targetBar, trendSmallMultiples,
  raceTo2030, arrScatter, gapTower, finalText,
];

const LAST = scenes.length - 1;

// Scenes that should show the mode-switch buttons.
const STEP_HAS_MODE = new Set([3, 5, 6]);  // trends, scatter, tower

let currentController = null;

function abortCurrentScene() {
  if (currentController) {
    currentController.abort();
    svg.selectAll("*").interrupt();
  }
  currentController = new AbortController();
  return currentController.signal;
}

async function order() {
  if (state.counter < 0)    state.counter = 0;
  if (state.counter > LAST) state.counter = LAST;

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

d3.select("#clickerFront").on("click", () => {
  if (state.counter < LAST) { state.counter += 1; order(); }
});

d3.select("#clickerBack").on("click", () => {
  if (state.counter > 0) { state.counter -= 1; order(); }
});

d3.selectAll(".circleBase[data-step]").on("click", function () {
  const target = Number(this.dataset.step);
  if (Number.isFinite(target) && target !== state.counter) {
    state.counter = target;
    order();
  }
});

d3.selectAll(".mode-btn").on("click", function () {
  const mode = this.dataset.mode;
  setMode(mode);
  state.rVar = mode;
  if (STEP_HAS_MODE.has(state.counter)) order();
});

document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea, [contenteditable]")) return;
  if (e.key === "ArrowRight" && state.counter < LAST) {
    state.counter += 1; order(); e.preventDefault();
  } else if (e.key === "ArrowLeft" && state.counter > 0) {
    state.counter -= 1; order(); e.preventDefault();
  } else if (e.key === "1" || e.key === "2" || e.key === "3") {
    const mode = { "1": "long", "2": "recent", "3": "required" }[e.key];
    setMode(mode);
    state.rVar = mode;
    if (STEP_HAS_MODE.has(state.counter)) order();
    e.preventDefault();
  }
});

async function boot() {
  state.basemap = await d3.json("data/africa_countries.geojson");

  // Honour deep-links: ?step=N wins; otherwise ?country=XYZ jumps to the ARR scatter.
  if (state.deepStep != null && state.deepStep <= LAST) {
    state.counter = state.deepStep;
  } else if (state.deepCountry && state.countries.some((c) => c.iso3 === state.deepCountry)) {
    state.counter = 5;
  }
  order();
}

boot();
