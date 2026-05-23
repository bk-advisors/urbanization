// Scene 7 — bridge into the country scatter.
// Mini scatter preview fills the chart area so the slide isn't blank.

import {
  clearGroups, clearNarration, hideCallout,
  setSection, showModeSwitch, teaserScatter,
} from "../helpers.js";

export default async function introUrbanScatter({ state, groups, signal }) {
  clearGroups(groups, ["overlay"]);
  clearNarration();
  hideCallout();
  showModeSwitch(false);

  setSection({
    hero: `54 countries.<br/>Two axes. One decade.`,
    title: "Zoom out to the country level",
    body: `
      Cities show one half of the story; whole countries show the other.
      <br/><br/>
      Some African states are already mostly urban. Others are urbanising
      <em>fast</em>.
      <br/><br/>
      Next view: every African country plotted by how urban it is and how
      fast it's urbanising.
    `,
  });

  if (signal.aborted) return;
  teaserScatter(groups.overlay, state.countries);
}
