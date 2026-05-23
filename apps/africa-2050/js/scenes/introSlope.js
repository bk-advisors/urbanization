// Scene 3 — bridge from the map to the slope graph.
// Mini-preview of a slope graph fills the chart area so the slide isn't blank.

import {
  clearGroups, clearNarration, hideCallout,
  setSection, showModeSwitch, teaserSlope,
} from "../helpers.js";

export default async function introSlope({ state, groups, signal }) {
  clearGroups(groups, ["overlay"]);
  clearNarration();
  hideCallout();
  showModeSwitch(false);

  setSection({
    hero: `A slope graph<br/>for the next 10 years.`,
    title: "From dots to ranks",
    body: `
      Maps show <em>where</em> cities are. They don't show <em>how much</em>
      a single city is changing.
      <br/><br/>
      Next: line up the top African cities and connect their 2025 values to
      their 2035 projections.
      <br/><br/>
      The steeper the line, the faster the city is changing.
      Lines that cross tell you who's overtaking whom over 10 years.
    `,
  });

  if (signal.aborted) return;
  teaserSlope(groups.overlay, state.cities);
}
