// Scene 9 — closing. Right-panel hero + body, faded Africa basemap behind.

import {
  africaProjection, clearGroups, clearNarration, drawBasemap,
  hideCallout, setSection, showModeSwitch,
} from "../helpers.js";
import { WIDTH, HEIGHT } from "../main.js";

export default async function finalText({ state, groups, signal }) {
  clearGroups(groups, ["map"]);
  clearNarration();
  hideCallout();
  showModeSwitch(false);
  d3.select("#callOutCountryWrapper").style("display", "none");

  const urban_2025 = d3.sum(state.countries, (c) => c.urban_pop_2025);
  const urban_2035 = d3.sum(state.countries, (c) => c.urban_pop_2035);
  const added_m = Math.round((urban_2035 - urban_2025) / 1000);

  setSection({
    hero: `<span style="color:#bc4749;">${added_m} million</span><br/>new urban Africans by 2035.`,
    title: "Planning for the next 10 years",
    body: `
      The OECD/AfDB/Cities Alliance/UCLG Africa report frames it as a choice:
      proactive planning, governance, and finance now &mdash; or fragmented
      growth and stretched services later.
      <br/><br/>
      The shape of the next decade is being decided right now. Where do the
      roads go? Who provides the housing? Who pays for schools, water, and
      transport?
      <br/><br/>
      <small style="color:#999;">
        Inspired by Nadieh Bremer's 2015 East Asia piece.<br/>
        Data: World Bank (urban %, 2024 actual) + UN World Urbanization
        Prospects 2025 (city populations &amp; growth trajectories).<br/>
        Narrative framing: OECD et al., <em>Africa's Urbanisation Dynamics 2025</em>.
      </small>
    `,
  });

  if (signal.aborted) return;

  const projection = africaProjection(state.basemap, WIDTH, HEIGHT);
  drawBasemap(groups.map, state.basemap, projection, {
    fill: "#ebe0cf", stroke: "#c9beac", opacity: 0.55, fadeMs: 1200,
  });
}
