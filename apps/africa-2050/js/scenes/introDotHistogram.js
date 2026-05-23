// Scene 5 — bridge into the dot histogram.
// Mini histogram preview fills the chart area so the slide isn't blank.

import {
  clearGroups, clearNarration, hideCallout,
  setSection, showModeSwitch, teaserHistogram,
} from "../helpers.js";

export default async function introDotHistogram({ state, groups, signal }) {
  clearGroups(groups, ["overlay"]);
  clearNarration();
  hideCallout();
  showModeSwitch(false);

  setSection({
    hero: `One dot per city.<br/>How fast are they all growing?`,
    title: "Beyond the top 25",
    body: `
      The big-name cities aren't where most of Africa's growth lives.
      Hundreds of smaller cities are each on their own trajectory.
      <br/><br/>
      Next: every African city of 300,000+ as one dot, binned by its
      10-year growth.
    `,
  });

  if (signal.aborted) return;
  teaserHistogram(groups.overlay, state.cities);
}
