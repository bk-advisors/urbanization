// Scene 0 — opening. Faded Africa basemap behind a single-life narrative hook.

import {
  africaProjection, clearGroups, clearNarration, drawBasemap,
  hideCallout, setSection, showModeSwitch,
} from "../helpers.js";
import { WIDTH, HEIGHT, SDG_TARGET } from "../main.js";

export default async function birthCohortIntro({ state, groups, signal }) {
  clearGroups(groups, ["map"]);
  clearNarration();
  hideCallout();
  showModeSwitch(false);

  // Pull the two endpoints of the inequality.
  const ranked = state.countries.slice().sort((a, b) => b.mmr_2023 - a.mmr_2023);
  const worst = ranked[0];          // Nigeria
  const best = ranked[ranked.length - 1];  // Egypt
  const ratio = Math.round(worst.mmr_2023 / best.mmr_2023);
  const offTrack = state.countries.filter((c) => !c.on_track).length;
  const total = state.countries.length;

  setSection({
    hero: `A baby girl born in <span style="color:#bc4749;">${worst.name}</span> this week is <strong>${ratio}× more likely</strong> to die giving birth than her counterpart born in <span style="color:#005CB9;">${best.name}</span>.`,
    title: "SDG 3.1: the promise we made to her",
    body: `
      The Sustainable Development Goals set a target. By <strong>2030</strong>,
      every country drives maternal mortality below <strong>70 deaths per
      100,000 live births</strong>.
      <br/><br/>
      Of Africa's <strong>${total}</strong> countries, <strong>${offTrack}</strong>
      are not currently on pace to make it. The road from
      <span style="color:#242852;font-weight:600;">2023</span> to
      <span style="color:#bc4749;font-weight:600;">2030</span> is short.
      Most of the continent is still hundreds of deaths above the line.
      <br/><br/>
      <em style="color:#888;">Click <strong>Continue</strong> to see where
      every country stands today, or jump straight to map, race, or scatter
      using the dots below.</em>
    `,
  });

  if (signal.aborted) return;

  const projection = africaProjection(state.basemap, WIDTH, HEIGHT);
  drawBasemap(groups.map, state.basemap, projection, {
    fill: "#f0eee8", stroke: "#d8d4c8", opacity: 0.55, fadeMs: 1200,
  });
}
