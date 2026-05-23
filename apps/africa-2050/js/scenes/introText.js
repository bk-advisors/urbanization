// Scene 0 — opening. Africa basemap fades in as the background; all narration
// lives in the right-side panel.

import {
  africaProjection, clearGroups, clearNarration, drawBasemap,
  hideCallout, setSection, showModeSwitch,
} from "../helpers.js";
import { WIDTH, HEIGHT } from "../main.js";

export default async function introText({ state, groups, signal }) {
  clearGroups(groups, ["map"]);
  clearNarration();
  hideCallout();
  showModeSwitch(false);

  const urban_2025 = d3.sum(state.countries, (c) => c.urban_pop_2025);
  const urban_2035 = d3.sum(state.countries, (c) => c.urban_pop_2035);
  const added_m = Math.round((urban_2035 - urban_2025) / 1000);

  setSection({
    hero: `Africa's cities are about to grow, <span style="color:#c34a36;">again</span>.`,
    title: "An Africa story in 10 years",
    body: `
      Between <span style="color:#b08d57;font-weight:600;">2025</span> and
      <span style="color:#c34a36;font-weight:600;">2035</span>, the UN projects
      <strong>${added_m} million</strong> more Africans will live in cities.
      <br/><br/>
      That's the next decade across <strong>${state.cities.length}</strong>
      African cities of 300,000+ people, each on its own trajectory.
      <br/><br/>
      <em style="color:#999;">Click <strong>Continue</strong> to begin, or
      jump straight to map / slope / histogram / scatter using the dots
      below.</em>
    `,
  });

  if (signal.aborted) return;

  // Faded basemap in the background — Nadieh's pattern for her opening view.
  const projection = africaProjection(state.basemap, WIDTH, HEIGHT);
  drawBasemap(groups.map, state.basemap, projection, {
    fill: "#efeae0", stroke: "#cfc8b8", opacity: 0.55, fadeMs: 1200,
  });
}
