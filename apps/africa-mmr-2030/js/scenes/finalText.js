// Scene 7 — closing narration + share-card export.

import {
  africaProjection, clearGroups, clearNarration, drawBasemap,
  hideCallout, setSection, showModeSwitch,
} from "../helpers.js";
import { WIDTH, HEIGHT, SDG_TARGET, TARGET_YEAR } from "../main.js";

export default async function finalText({ state, groups, signal }) {
  clearGroups(groups, ["map"]);
  clearNarration();
  hideCallout();
  showModeSwitch(false);

  const onTrack = state.countries.filter((c) => c.on_track);
  const offTrack = state.countries.filter((c) => !c.on_track);
  const totalLives = d3.sum(state.countries, (d) => d.lives_gap ?? 0);

  const headlineLives = Math.round(totalLives / 10000) * 10000;
  setSection({
    hero: `The math is unforgiving. The list of countries that built systems around the basics is short.`,
    title: "What the data tells us",
    body: `
      Of Africa's 54 countries, <strong>${onTrack.length}</strong> are on pace
      to land at or below MMR <strong>${SDG_TARGET}</strong> by 2030 if their
      long-run trajectory holds: ${onTrack.map((c) => c.name).join(", ")}.
      <br/><br/>
      The other <strong>${offTrack.length}</strong> are not. Under current
      reduction rates, roughly
      <strong>${headlineLives.toLocaleString()}</strong>
      mothers will die between 2024 and ${TARGET_YEAR} in excess of an
      on-pace trajectory.
      <br/><br/>
      Maternal mortality isn't a mystery. We know what works: skilled birth
      attendance, blood, emergency obstetric care, antenatal coverage,
      contraception access, an actually-resourced primary care system. The
      countries that crossed the SDG line built systems around these
      basics.
      <br/><br/>
      The road from 2023 to 2030 is short. The list of countries that have
      built those systems is shorter.
      <br/><br/>
      <button id="shareBtn" style="
        background:#242852;color:#fff;border:none;padding:8px 14px;
        border-radius:4px;font:600 12px 'Open Sans',system-ui,sans-serif;
        letter-spacing:0.3px;cursor:pointer;
      ">↓ Download share card (1200×630)</button>
      <br/><br/>
      <em style="color:#888;">A companion to
      <a href="https://bk-advisors.github.io/africa-mmr/" style="color:#005CB9;">africa-mmr</a>
      (2023 snapshot). Data: WHO/UNICEF/UNFPA/WBG/UNDESA Joint Estimates
      (MMEIG, April 2025 release) via World Bank WDI. "On track" is a
      derived classification (observed ARR vs the rate required to hit
      MMR&nbsp;${SDG_TARGET} by ${TARGET_YEAR}); MMEIG does not publish
      this label itself.</em>
    `,
  });

  // Closing visual: faded Africa with on-track in BKA blue, off-track in brick red.
  if (signal.aborted) return;

  const projection = africaProjection(state.basemap, WIDTH, HEIGHT);
  const path = d3.geoPath(projection);
  const idx = new Map(state.countries.map((c) => [c.iso3, c]));

  const g = groups.map.style("opacity", 1);
  g.selectAll("*").remove();
  g.selectAll("path.country").data(state.basemap.features).enter().append("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("stroke", "#fff").attr("stroke-width", 0.7)
    .attr("fill", (f) => {
      const iso = f.properties?.ISO_A3;
      const c = idx.get(iso);
      if (!c) return "#f0eee8";
      return c.on_track ? "#005CB9" : "#bc4749";
    })
    .attr("fill-opacity", 0)
    .transition().duration(900).attr("fill-opacity", (f) => {
      const c = idx.get(f.properties?.ISO_A3);
      return c ? (c.on_track ? 0.75 : 0.55) : 0.25;
    });

  // Wire share-card button.
  d3.select("#shareBtn").on("click", () => downloadShareCard(state));
}

// ---------------------------------------------------------------------------
// Share-card generator — renders to an off-screen canvas (1200×630) and
// triggers a download. Uses the deep-link country if provided.
// ---------------------------------------------------------------------------

function downloadShareCard(state) {
  const c = state.deepCountry
    ? state.countries.find((cc) => cc.iso3 === state.deepCountry)
    : null;

  const W = 1200, H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Top accent stripe (BKA amber).
  ctx.fillStyle = "#F8A623";
  ctx.fillRect(0, 0, W, 6);

  // Title.
  ctx.fillStyle = "#242852";
  ctx.font = "300 38px Oswald, system-ui, sans-serif";
  ctx.fillText("AFRICA & SDG 3.1", 60, 90);
  ctx.font = "300 22px Oswald, system-ui, sans-serif";
  ctx.fillStyle = "#606060";
  ctx.fillText("The road from 2023 to 2030", 60, 122);

  if (c) {
    // Country-specific card.
    ctx.fillStyle = "#242852";
    ctx.font = "400 56px Oswald, system-ui, sans-serif";
    ctx.fillText(c.name, 60, 220);

    ctx.font = "300 22px Oswald, system-ui, sans-serif";
    ctx.fillStyle = "#606060";
    ctx.fillText("Maternal mortality (deaths / 100,000 live births)", 60, 256);

    // 2023.
    ctx.font = "300 96px Oswald, system-ui, sans-serif";
    ctx.fillStyle = "#242852";
    ctx.fillText(Math.round(c.mmr_2023), 60, 380);
    ctx.font = "400 16px 'Open Sans', system-ui, sans-serif";
    ctx.fillStyle = "#888";
    ctx.fillText("MMR 2023", 60, 410);

    // 2030 projected.
    ctx.font = "300 96px Oswald, system-ui, sans-serif";
    ctx.fillStyle = c.on_track ? "#005CB9" : "#BC4749";
    ctx.fillText(Math.round(c.mmr_2030_long ?? c.mmr_2023), 380, 380);
    ctx.font = "400 16px 'Open Sans', system-ui, sans-serif";
    ctx.fillStyle = "#888";
    ctx.fillText("Projected 2030 MMR (long pace)", 380, 410);

    // SDG target.
    ctx.font = "300 96px Oswald, system-ui, sans-serif";
    ctx.fillStyle = "#F8A623";
    ctx.fillText("70", 800, 380);
    ctx.font = "400 16px 'Open Sans', system-ui, sans-serif";
    ctx.fillStyle = "#888";
    ctx.fillText("SDG 3.1 target", 800, 410);

    // Verdict.
    ctx.font = "400 30px Oswald, system-ui, sans-serif";
    ctx.fillStyle = c.on_track ? "#005CB9" : "#BC4749";
    ctx.fillText(c.on_track ? "ON TRACK" : "OFF TRACK", 60, 480);
  } else {
    // Africa-wide card.
    const onTrack = state.countries.filter((cc) => cc.on_track).length;
    const total = state.countries.length;
    const totalLives = d3.sum(state.countries, (d) => d.lives_gap ?? 0);

    ctx.fillStyle = "#BC4749";
    ctx.font = "300 200px Oswald, system-ui, sans-serif";
    ctx.fillText(`${total - onTrack}`, 60, 360);
    ctx.fillStyle = "#242852";
    ctx.font = "400 28px Oswald, system-ui, sans-serif";
    ctx.fillText("African countries off pace to hit SDG 3.1 by 2030.", 60, 420);
    ctx.font = "400 22px 'Open Sans', system-ui, sans-serif";
    ctx.fillStyle = "#606060";
    ctx.fillText(`${onTrack} on track. ${total - onTrack} not. ~${Math.round(totalLives / 1000)}K mothers at stake.`, 60, 460);
  }

  // Footer.
  ctx.fillStyle = "#888";
  ctx.font = "400 14px 'Open Sans', system-ui, sans-serif";
  ctx.fillText("Data: WB SH.STA.MMRT (WHO/UNICEF/UNFPA/WBG/UNDESA Joint Estimates, 2025)", 60, H - 60);
  ctx.fillText("bk-advisors.github.io/africa-mmr-2030", 60, H - 40);
  ctx.fillStyle = "#242852";
  ctx.font = "600 14px 'Open Sans', system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Matthew Kuch · BK-Advisors", W - 60, H - 40);
  ctx.textAlign = "left";

  // Trigger download.
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = c ? `sdg3-1-${c.iso3}.png` : `sdg3-1-africa.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, "image/png");
}
