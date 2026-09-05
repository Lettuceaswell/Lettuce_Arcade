// Hand-check: print one run's per-move record plus the running metric state,
// and independently recompute the run-level metrics from the printed columns.
const { Game, mulberry32 } = require("../engine.js");
const bots = require("../bots.js");
const { runOne } = require("../sim.js");

const seed = Number(process.argv[2] || 5);
const botName = process.argv[3] || "ketoBig";

const g = new Game(seed);
const rng = mulberry32(seed * 2654435761 + 12345);
const recs = [];
while (!g.over) {
  const moves = g.legalMoves();
  if (!moves.length) break;
  recs.push(g.applyMove(bots[botName](g, rng, moves)));
}
const TR = { crash: 0, normal: 1, keto: 2, deep: 3, frenzy: 4 };
const tn = (m) => (m >= 85 ? "deep" : m >= 70 ? "keto" : m >= 16 ? "normal" : "crash");

console.log("move meterB->A  peak  tierB   stateA   steps pts   ref fz? pkTierUp reward");
const sorted = [];
const smed = (a) => (!a.length ? 0 : a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2);
const ins = (a, v) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < v) lo = m + 1; else hi = m; } a.splice(lo, 0, v); };
let gap = 0, longest = 0, rewards = 0;
const stateCount = {};
const climbs = []; let climbStart = null;
recs.forEach((r) => {
  const pkUp = r.frenzyStarted || (r.tierBefore !== "frenzy" && TR[tn(r.peakThisMove)] > TR[r.tierBefore]);
  const med = smed(sorted);
  const rew = r.steps >= 3 || pkUp || r.frenzyStarted || r.refund > 0 || (med > 0 && r.pts >= 2 * med) || !!r.specialDetonated;
  if (rew) { rewards++; if (gap > longest) longest = gap; gap = 0; } else gap++;
  ins(sorted, r.pts);
  stateCount[r.stateAfter] = (stateCount[r.stateAfter] || 0) + 1;
  if (r.frenzyStarted) { if (climbStart != null) climbs.push(r.move - climbStart + 1); climbStart = null; }
  else if (r.stateAfter === "frenzy") climbStart = null;
  else if (r.meterAfter >= 70) { if (climbStart == null) climbStart = r.move; }
  else climbStart = null;
  console.log(
    String(r.move).padStart(4),
    (r.meterBefore + "->" + r.meterAfter).padStart(9),
    String(r.peakThisMove).padStart(4),
    r.tierBefore.padStart(7), r.stateAfter.padStart(8),
    String(r.steps).padStart(4), String(r.pts).padStart(6),
    String(r.refund).padStart(3), (r.frenzyStarted ? "ST" : r.frenzyEnded ? "EN" : "  "),
    pkUp ? "  YES  " : "   .   ", rew ? "REWARD" : "");
});
if (gap > longest) longest = gap;
const s = runOne(seed, botName).row;
console.log("\nhand-recomputed: moves", recs.length, "longestDryGap", longest, "rewardEvents", rewards,
  "climbs", JSON.stringify(climbs), "stateCount", JSON.stringify(stateCount));
console.log("sim.js reported: moves", s.moves, "longestDryGap", s.longestDryGap, "rewardEvents", s.rewardEvents,
  "climbs", JSON.stringify(s.climbLengths), "pctMovesByState", JSON.stringify(s.pctMovesByState));
console.log("pctMovesByState check:", Object.keys(stateCount).map((k) => k + "=" + (stateCount[k] / recs.length).toFixed(4)).join(" "));
console.log("endedWithin5OfFrenzy", s.endedWithin5OfFrenzy, "| last3 peaks",
  recs.slice(-3).map((r) => r.peakThisMove).join(","), "| frenzies", s.frenzies);
console.log("firstTierUpMove", s.firstTierUpMove, "tierUpsSeen", s.tierUpsSeen);
