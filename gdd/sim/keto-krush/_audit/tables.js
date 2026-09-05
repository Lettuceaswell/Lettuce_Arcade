// Emits the markdown tables for FINDINGS.md from results/*.csv.
const fs = require("fs"), path = require("path");
const R = path.join(__dirname, "..", "results");
const BOTS = ["random", "greedy", "keto", "ketoBig", "tempted_1_0", "tempted_1_25", "tempted_1_5", "tempted_2_0", "lookahead", "casual"];

function csv(p) {
  const t = fs.readFileSync(p, "utf8").trim().split("\n");
  const h = t[0].split(",");
  return t.slice(1).map((l) => { const c = l.split(","); const o = {}; h.forEach((k, i) => o[k] = c[i]); return o; });
}
const n = (v) => (v === undefined || v === "" ? 0 : Number(v));
const b = (v) => v === "true";
function med(a) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function pc(a, p) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(p / 100 * (s.length - 1))))]; }
const f1 = (x) => x.toFixed(1);
const pct = (x) => (x * 100).toFixed(1) + "%";

const D = {};
BOTS.forEach((bot) => {
  D[bot] = csv(path.join(R, `runs-${bot}.csv`)).map((r) => ({
    seed: n(r.seed), score: n(r.score), moves: n(r.moves), movesEarned: n(r.movesEarned),
    endReason: r.endReason, frenzies: n(r.frenzies), peakMeter: n(r.peakMeter), crashed: b(r.crashed),
    maxCombo: n(r.maxCombo), tierUpsSeen: n(r.tierUpsSeen), firstTierUpMove: n(r.firstTierUpMove),
    endState: r.endState, endedWithin5: b(r.endedWithin5OfFrenzy), longestDryGap: n(r.longestDryGap),
    rewardEvents: n(r.rewardEvents),
    pctCrash: n(r.pctCrash), pctNormal: n(r.pctNormal), pctKeto: n(r.pctKeto), pctDeep: n(r.pctDeep), pctFrenzy: n(r.pctFrenzy),
    nearMiss: b(r.nearMissNoFrenzy), fellBack: b(r.fellBackWithoutFrenzy), lastReward: b(r.lastMoveWasReward),
    ptsInFrenzy: n(r.ptsInFrenzy), movesInFrenzy: n(r.movesInFrenzy), ptsOutside: n(r.ptsOutside), movesOutside: n(r.movesOutside),
    climbs: (r.climbLengths || "").split("|").filter(Boolean).map(Number),
  }));
});

function table(title, header, rows) {
  console.log("\n### " + title + "\n");
  console.log("| " + header.join(" | ") + " |");
  console.log("|" + header.map(() => "---").join("|") + "|");
  rows.forEach((r) => console.log("| " + r.join(" | ") + " |"));
}

const randMed = med(D.random.map((r) => r.score));
const bySeed = {};
D.random.forEach((r) => bySeed[r.seed] = r);
const laBySeed = {};
D.lookahead.forEach((r) => laBySeed[r.seed] = r);

table("Headline (2,000 runs/bot, seeds 1-2000, shipped config)",
  ["bot", "median score", "p10-p90 score", "vs random", "median moves", "p90 moves", "max moves", "% budget end", "avg frenzies", "% runs w/ frenzy", "% runs w/ tier-up", "median dry gap"],
  BOTS.map((bot) => {
    const d = D[bot], sc = d.map((r) => r.score), mv = d.map((r) => r.moves);
    return [bot, med(sc), pc(sc, 10) + "-" + pc(sc, 90), (med(sc) / randMed).toFixed(2) + "x",
      med(mv), pc(mv, 90), Math.max(...mv),
      pct(d.filter((r) => r.endReason === "budget").length / d.length),
      (d.reduce((a, r) => a + r.frenzies, 0) / d.length).toFixed(3),
      pct(d.filter((r) => r.frenzies > 0).length / d.length),
      pct(d.filter((r) => r.tierUpsSeen > 0).length / d.length),
      med(d.map((r) => r.longestDryGap))];
  }));

table("Tier occupancy (mean share of a run's moves, state at end of move)",
  ["bot", "crash", "normal", "keto", "deep", "frenzy"],
  BOTS.map((bot) => {
    const d = D[bot], av = (k) => pct(d.reduce((a, r) => a + r[k], 0) / d.length);
    return [bot, av("pctCrash"), av("pctNormal"), av("pctKeto"), av("pctDeep"), av("pctFrenzy")];
  }));

table("Dopamine: dry gaps, reward density, first good thing",
  ["bot", "median longest dry gap", "p90 longest dry gap", "reward events /10 moves", "% runs never tier-up", "median move of 1st tier-up", "p90 move of 1st tier-up"],
  BOTS.map((bot) => {
    const d = D[bot], g = d.map((r) => r.longestDryGap);
    const fu = d.filter((r) => r.firstTierUpMove > 0).map((r) => r.firstTierUpMove);
    return [bot, med(g), pc(g, 90),
      (d.reduce((a, r) => a + (r.moves ? r.rewardEvents / r.moves * 10 : 0), 0) / d.length).toFixed(2),
      pct(d.filter((r) => r.tierUpsSeen === 0).length / d.length),
      fu.length ? med(fu) : "-", fu.length ? pc(fu, 90) : "-"];
  }));

table("Dopamine: near misses, endings, crash rate",
  ["bot", "peak 90-99 & 0 frenzies", "ended within 5 of frenzy", "ever sat 95-99 then fell back", "final move was a reward", "% runs that ever crash", "% end on lock"],
  BOTS.map((bot) => {
    const d = D[bot];
    return [bot, pct(d.filter((r) => r.nearMiss).length / d.length),
      pct(d.filter((r) => r.endedWithin5).length / d.length),
      pct(d.filter((r) => r.fellBack).length / d.length),
      pct(d.filter((r) => r.lastReward).length / d.length),
      pct(d.filter((r) => r.crashed).length / d.length),
      pct(d.filter((r) => r.endReason === "lock").length / d.length)];
  }));

table("End state distribution (state at the final move)",
  ["bot", "crash", "normal", "keto", "deep", "frenzy"],
  BOTS.map((bot) => {
    const d = D[bot], c = {};
    d.forEach((r) => c[r.endState] = (c[r.endState] || 0) + 1);
    return [bot, ...["crash", "normal", "keto", "deep", "frenzy"].map((k) => pct((c[k] || 0) / d.length))];
  }));

table("Climb variability (moves from entering keto >=70 to hitting 100) and frenzy value",
  ["bot", "climbs recorded", "median", "p10", "p90", "max", "pts/move in frenzy", "pts/move outside", "frenzy share of total score"],
  BOTS.map((bot) => {
    const d = D[bot], all = d.flatMap((r) => r.climbs);
    const fp = d.reduce((a, r) => a + r.ptsInFrenzy, 0), fm = d.reduce((a, r) => a + r.movesInFrenzy, 0);
    const op = d.reduce((a, r) => a + r.ptsOutside, 0), om = d.reduce((a, r) => a + r.movesOutside, 0);
    return [bot, all.length, all.length ? med(all) : "-", all.length ? pc(all, 10) : "-",
      all.length ? pc(all, 90) : "-", all.length ? Math.max(...all) : "-",
      fm ? (fp / fm).toFixed(0) : "-", om ? (op / om).toFixed(0) : "-",
      (fp + op) ? pct(fp / (fp + op)) : "-"];
  }));

console.log("\n### Luck overlap (paired by seed)\n");
console.log("- random beats ketoBig on **" + pct(D.ketoBig.filter((r) => bySeed[r.seed] && bySeed[r.seed].score > r.score).length / D.ketoBig.length) + "** of seeds");
console.log("- casual beats lookahead on **" + pct(D.casual.filter((r) => laBySeed[r.seed] && r.score > laBySeed[r.seed].score).length / D.casual.length) + "** of seeds");
console.log("- movesEarned (refunded moves) median: " + BOTS.map((bt) => bt + "=" + med(D[bt].map((r) => r.movesEarned))).join(", "));

// choice reality
console.log("\n### Choice reality (all decision points in the moves CSVs, by tier held)\n");
const agg = {};
BOTS.forEach((bot) => {
  csv(path.join(R, `moves-${bot}.csv`)).forEach((m) => {
    const t = m.tierBefore;
    agg[t] = agg[t] || { carb: 0, protein: 0, none: 0, tie: 0 };
    if (m.altProteinPts === "") agg[t].none++;
    else if (m.altCarbPts === "") agg[t].protein++;
    else if (n(m.altCarbPts) > n(m.altProteinPts)) agg[t].carb++;
    else if (n(m.altCarbPts) === n(m.altProteinPts)) agg[t].tie++;
    else agg[t].protein++;
  });
});
table("Choice reality (pooled over all 10 bots)", ["tier held", "n", "carb pays more", "protein pays more", "equal", "no protein move available"],
  ["crash", "normal", "keto", "deep", "frenzy"].filter((t) => agg[t]).map((t) => {
    const a = agg[t], tot = a.carb + a.protein + a.none + a.tie;
    return [t, tot, pct(a.carb / tot), pct(a.protein / tot), pct(a.tie / tot), pct(a.none / tot)];
  }));
