"use strict";
const fs = require("fs");
const path = require("path");
const { Game, mulberry32 } = require("./engine.js");
const bots = require("./bots.js");

const RESULTS_DIR = path.join(__dirname, "results");
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

const TIER_NAMES = ["crash", "normal", "keto", "deep", "frenzy"];

function median(arr) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function pctile(arr, p) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))));
  return s[idx];
}

// Insert into a maintained sorted array (for running-median reward-event test).
function sortedInsert(sorted, v) {
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < v) lo = mid + 1; else hi = mid; }
  sorted.splice(lo, 0, v);
}
function sortedMedian(sorted) {
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function runOne(seed, botName, config) {
  const bot = bots[botName];
  const rng = mulberry32(seed * 2654435761 + 12345);
  const game = new Game(seed, config);
  const records = [];
  const sortedPts = [];
  let tierUpsSeen = 0;
  let firstTierUpMove = -1;
  let peakMeter = game.ketosis;
  let crashedEver = false;
  let maxCombo = 0;
  let bestMovePts = 0;
  let proteinTiles = 0, carbTiles = 0;
  let frenziesTotal = 0;
  const pointsByTier = { crash: 0, normal: 0, keto: 0, deep: 0, frenzy: 0 };
  const stateCounts = { crash: 0, normal: 0, keto: 0, deep: 0, frenzy: 0 };
  let movesEarned = 0;
  let rewardEvents = 0;
  let longestDryGap = 0;
  let currentDryGap = 0;
  const meterAt95to99 = []; // move indices flagged for endedWithin5OfFrenzy / near-miss checks
  let sawNearFrenzy = false;
  let fellBackWithoutFrenzy = false;
  let climbStart = null; // move index when meter first crosses 70 (this climb)
  const climbLengths = []; // moves from entering keto (>=70) to hitting 100, per climb
  let sat95 = false;             // currently sitting at 95..99 with no frenzy yet
  let fellBackCount = 0;         // times we sat 95..99 and dropped back without a frenzy
  let ptsInFrenzy = 0, movesInFrenzy = 0, ptsOutside = 0, movesOutside = 0;
  const TIER_RANK = { crash: 0, normal: 1, keto: 2, deep: 3, frenzy: 4 };
  const tierNameFor = (m) => {
    if (m >= 85) return "deep";
    if (m >= 70) return "keto";
    if (m >= 16) return "normal";
    return "crash";
  };

  while (!game.over) {
    const moves = game.legalMoves();
    if (!moves.length) { game.over = true; game.overReason = "lock"; break; }

    // altProteinPts / altCarbPts from the same data every bot sees.
    let bestProtein = null, bestCarb = null;
    moves.forEach((m) => {
      if (m.protein) { if (!bestProtein || m.size > bestProtein.size) bestProtein = m; }
      else if (!bestCarb || m.size > bestCarb.size) bestCarb = m;
    });
    const altProteinPts = bestProtein ? game.previewMove(bestProtein).ptsStep1 : null;
    const altCarbPts = bestCarb ? game.previewMove(bestCarb).ptsStep1 : null;

    const move = bot(game, rng, moves);
    const before70 = game.ketosis >= 70;
    const rec = game.applyMove(move, { altProteinPts, altCarbPts });
    records.push(rec);

    if (rec.peakThisMove > peakMeter) peakMeter = rec.peakThisMove;
    if (rec.crashed) crashedEver = true;
    if (rec.steps > maxCombo) maxCombo = rec.steps;
    if (rec.pts > bestMovePts) bestMovePts = rec.pts;
    proteinTiles += rec.protein; carbTiles += rec.carb;
    if (rec.frenzyStarted) frenziesTotal++;
    TIER_NAMES.forEach((t) => { pointsByTier[t] += rec.pointsByTier[t]; });
    stateCounts[rec.stateAfter] = (stateCounts[rec.stateAfter] || 0) + 1;
    movesEarned += rec.refund;

    // A tier-up the player actually SAW: the game announces the tier during the
    // cascade, so a climb the end-of-move drain immediately erases still counts.
    // (rec.tierChange compares before->after only and misses those.)
    const peakTierUp = rec.frenzyStarted ||
      (rec.tierBefore !== "frenzy" &&
       TIER_RANK[tierNameFor(rec.peakThisMove)] > TIER_RANK[rec.tierBefore]);
    if (peakTierUp) {
      tierUpsSeen++;
      if (firstTierUpMove === -1) firstTierUpMove = rec.move;
    }

    // Climb variability: moves from entering keto (>=70) to hitting 100.
    // A climb also starts on the frenzy-landing move (meter lands on exactly 70),
    // which the previous `!before70` guard silently dropped.
    if (rec.frenzyStarted) {
      if (climbStart != null) climbLengths.push(rec.move - climbStart + 1);
      climbStart = null;
    } else if (rec.stateAfter === "frenzy") {
      climbStart = null; // mid-frenzy, meter frozen
    } else if (rec.meterAfter >= 70) {
      if (climbStart == null) climbStart = rec.move;
    } else {
      climbStart = null;
    }

    // near-95 tracking: sitting at 95..99, then falling back with no frenzy.
    if (rec.peakThisMove >= 95 && rec.peakThisMove < 100) {
      sawNearFrenzy = true;
      if (!rec.frenzyStarted) sat95 = true;
    }
    if (rec.frenzyStarted) sat95 = false;
    else if (sat95 && rec.meterAfter < 95) { fellBackCount++; sat95 = false; }

    // frenzy value: points and moves inside vs outside frenzy
    if (rec.stateAfter === "frenzy" || rec.frenzyStarted) { ptsInFrenzy += rec.pts; movesInFrenzy++; }
    else { ptsOutside += rec.pts; movesOutside++; }

    // reward event
    const runningMedian = sortedMedian(sortedPts);
    const isReward = rec.steps >= 3 || peakTierUp
      || rec.frenzyStarted || rec.refund > 0
      || (runningMedian > 0 && rec.pts >= 2 * runningMedian)
      || rec.specialDetonated;
    if (isReward) {
      rewardEvents++;
      if (currentDryGap > longestDryGap) longestDryGap = currentDryGap;
      currentDryGap = 0;
    } else {
      currentDryGap++;
    }
    sortedInsert(sortedPts, rec.pts);
  }
  if (currentDryGap > longestDryGap) longestDryGap = currentDryGap;

  // "ever sat at 95..99 and then fell back without a frenzy" — counted as an
  // event, so a run that later DOES frenzy still records the earlier near miss.
  fellBackWithoutFrenzy = fellBackCount > 0 || (sat95 && frenziesTotal === 0);

  const totalMoves = records.length;
  const pctMovesByState = {};
  TIER_NAMES.forEach((t) => { pctMovesByState[t] = totalMoves ? stateCounts[t] / totalMoves : 0; });

  // any of the last 3 moves had meter in 95..99 with no frenzy after
  let endedWithin5 = false;
  for (let i = Math.max(0, records.length - 3); i < records.length; i++) {
    const r = records[i];
    if (r.peakThisMove >= 95 && r.peakThisMove <= 99) {
      const frenzyAfter = records.slice(i + 1).some((x) => x.frenzyStarted);
      if (!frenzyAfter) { endedWithin5 = true; break; }
    }
  }

  const lastMove = records[records.length - 1];
  const finalMovePts = lastMove ? lastMove.pts : 0;
  const finalRunningMedian = sortedMedian(sortedPts.length ? sortedPts.slice(0, -1) : []);
  const lastMoveWasReward = lastMove ? (
    lastMove.steps >= 3 || lastMove.tierChange === 1 || lastMove.tierChange === "frenzy" ||
    lastMove.frenzyStarted || lastMove.refund > 0 || lastMove.specialDetonated ||
    (finalRunningMedian > 0 && lastMove.pts >= 2 * finalRunningMedian)
  ) : false;

  const row = {
    seed, bot: botName, score: game.score, moves: totalMoves, movesEarned,
    endReason: game.overReason, frenzies: frenziesTotal, peakMeter,
    crashed: crashedEver, maxCombo, bestMovePts, proteinTiles, carbTiles,
    pctMovesByState, tierUpsSeen, firstTierUpMove,
    endState: lastMove ? lastMove.stateAfter : "normal",
    endedWithin5OfFrenzy: endedWithin5, longestDryGap, rewardEvents, pointsByTier,
    lastMoveWasReward,
    nearMissNoFrenzy: peakMeter >= 90 && peakMeter <= 99 && frenziesTotal === 0,
    fellBackWithoutFrenzy,
    climbLengths,
    sawNearFrenzy,
    ptsInFrenzy, movesInFrenzy, ptsOutside, movesOutside,
  };
  return { row, records };
}

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function runRowToCsvRow(row) {
  return [
    row.seed, row.bot, row.score, row.moves, row.movesEarned, row.endReason,
    row.frenzies, row.peakMeter, row.crashed, row.maxCombo, row.bestMovePts,
    row.proteinTiles, row.carbTiles,
    row.pctMovesByState.crash, row.pctMovesByState.normal, row.pctMovesByState.keto,
    row.pctMovesByState.deep, row.pctMovesByState.frenzy,
    row.tierUpsSeen, row.firstTierUpMove, row.endState, row.endedWithin5OfFrenzy,
    row.longestDryGap, row.rewardEvents,
    row.pointsByTier.crash, row.pointsByTier.normal, row.pointsByTier.keto,
    row.pointsByTier.deep, row.pointsByTier.frenzy,
    row.nearMissNoFrenzy, row.fellBackWithoutFrenzy, row.lastMoveWasReward,
    row.ptsInFrenzy, row.movesInFrenzy, row.ptsOutside, row.movesOutside,
    row.climbLengths.length, row.climbLengths.join("|"),
  ].map(csvEscape).join(",");
}
const RUN_HEADER = "seed,bot,score,moves,movesEarned,endReason,frenzies,peakMeter,crashed,maxCombo,bestMovePts,proteinTiles,carbTiles,pctCrash,pctNormal,pctKeto,pctDeep,pctFrenzy,tierUpsSeen,firstTierUpMove,endState,endedWithin5OfFrenzy,longestDryGap,rewardEvents,ptsCrash,ptsNormal,ptsKeto,ptsDeep,ptsFrenzy,nearMissNoFrenzy,fellBackWithoutFrenzy,lastMoveWasReward,ptsInFrenzy,movesInFrenzy,ptsOutside,movesOutside,climbCount,climbLengths";

function moveRowToCsvRow(seed, bot, rec) {
  return [
    seed, bot, rec.move, rec.meterBefore, rec.meterAfter, rec.tierBefore, rec.stateAfter,
    rec.pts, rec.steps, rec.gained, rec.protein, rec.carb, rec.rushTaken,
    rec.tierChange, rec.refund, rec.frenzyStarted, rec.frenzyEnded, rec.movesLeftAfter,
    rec.altProteinPts, rec.altCarbPts,
  ].map(csvEscape).join(",");
}
const MOVE_HEADER = "seed,bot,move,meterBefore,meterAfter,tierBefore,stateAfter,pts,steps,gained,protein,carb,rushTaken,tierChange,refund,frenzyStarted,frenzyEnded,movesLeftAfter,altProteinPts,altCarbPts";

const DEFAULT_BOTS = ["random", "greedy", "keto", "ketoBig", "tempted_1_0", "tempted_1_25", "tempted_1_5", "tempted_2_0", "lookahead", "casual"];

function runExperiment(botName, nRuns, config, moveCsvRuns) {
  moveCsvRuns = moveCsvRuns == null ? 200 : moveCsvRuns;
  const runLines = [RUN_HEADER];
  const moveLines = [MOVE_HEADER];
  const rows = [];
  for (let seed = 1; seed <= nRuns; seed++) {
    const { row, records } = runOne(seed, botName, config);
    rows.push(row);
    runLines.push(runRowToCsvRow(row));
    if (seed <= moveCsvRuns) {
      records.forEach((rec) => moveLines.push(moveRowToCsvRow(seed, botName, rec)));
    }
  }
  fs.writeFileSync(path.join(RESULTS_DIR, `runs-${botName}.csv`), runLines.join("\n") + "\n");
  fs.writeFileSync(path.join(RESULTS_DIR, `moves-${botName}.csv`), moveLines.join("\n") + "\n");
  return rows;
}

function summarize(rows) {
  const scores = rows.map((r) => r.score);
  const moves = rows.map((r) => r.moves);
  const frenzies = rows.map((r) => r.frenzies);
  return {
    medianScore: median(scores), p10Score: pctile(scores, 10), p90Score: pctile(scores, 90),
    medianMoves: median(moves), p90Moves: pctile(moves, 90), maxMoves: Math.max(...moves),
    pctBudgetEnd: rows.filter((r) => r.endReason === "budget").length / rows.length,
    avgFrenzies: frenzies.reduce((a, b) => a + b, 0) / rows.length,
    pctRunsWithFrenzy: rows.filter((r) => r.frenzies > 0).length / rows.length,
    pctRunsWithTierUp: rows.filter((r) => r.tierUpsSeen > 0).length / rows.length,
    medianLongestDryGap: median(rows.map((r) => r.longestDryGap)),
  };
}

function deepMerge(base, patch) {
  const out = JSON.parse(JSON.stringify(base));
  Object.keys(patch).forEach((k) => {
    if (typeof patch[k] === "object" && !Array.isArray(patch[k]) && out[k]) {
      out[k] = Object.assign({}, out[k], patch[k]);
    } else out[k] = patch[k];
  });
  return out;
}

const SHIPPED = {};

const SWEEP_KNOBS = [
  { knob: "refund.deep", values: [1, 2, 3], apply: (v) => ({ refund: { deep: v } }) },
  { knob: "refund.keto", values: [1, 2, 3], apply: (v) => ({ refund: { keto: v } }) },
  { knob: "refund.frenzy", values: [3, 5, 7], apply: (v) => ({ refund: { frenzy: v } }) },
  { knob: "moveBudget", values: [20, 25, 30, 35], apply: (v) => ({ moveBudget: v }) },
  { knob: "drain", values: ["2/3", "3/5", "4/6", "3/7"], apply: (v) => {
      const [k, d] = v.split("/").map(Number);
      const tiers = JSON.parse(JSON.stringify(require("./engine.js").DEFAULT_CONFIG.tiers));
      tiers[2].drain = k; tiers[3].drain = d;
      return { tiers };
    } },
  { knob: "sugarRush", values: [1.25, 1.5, 1.75, 2.0], apply: (v) => ({ sugarRush: v }) },
  { knob: "frenzyMoves", values: [3, 5, 7], apply: (v) => ({ frenzyMoves: v }) },
  { knob: "frenzyLand", values: [55, 70, 80], apply: (v) => ({ frenzyLand: v }) },
  { knob: "carbLoss", values: [2, 3, 4], apply: (v) => ({ carbLoss: v }) },
  { knob: "proteinGain", values: [3, 4, 5], apply: (v) => ({ proteinGain: v }) },
];

const SWEEP_BOTS = ["casual", "ketoBig", "lookahead"];

function isShippedValue(knob, v) {
  const shipped = { "refund.deep": 2, "refund.keto": 2, "refund.frenzy": 5, moveBudget: 25, drain: "3/5", sugarRush: 1.5, frenzyMoves: 5, frenzyLand: 70, carbLoss: 3, proteinGain: 4 };
  return shipped[knob] === v;
}

function runSweep(lookaheadRuns) {
  const lines = ["knob,value,bot,medianScore,p10Score,p90Score,medianMoves,p90Moves,maxMoves,pctBudgetEnd,avgFrenzies,pctRunsWithFrenzy,pctRunsWithTierUp,medianLongestDryGap"];
  SWEEP_KNOBS.forEach((k) => {
    k.values.forEach((v) => {
      const cfgPatch = k.apply(v);
      const config = deepMerge(require("./engine.js").DEFAULT_CONFIG, cfgPatch);
      SWEEP_BOTS.forEach((botName) => {
        const n = botName === "lookahead" ? lookaheadRuns : 500;
        const rows = [];
        for (let seed = 1; seed <= n; seed++) rows.push(runOne(seed, botName, config).row);
        const s = summarize(rows);
        lines.push([k.knob, v, botName, s.medianScore, s.p10Score, s.p90Score, s.medianMoves, s.p90Moves, s.maxMoves, s.pctBudgetEnd, s.avgFrenzies, s.pctRunsWithFrenzy, s.pctRunsWithTierUp, s.medianLongestDryGap].map(csvEscape).join(","));
      });
    });
  });
  fs.writeFileSync(path.join(RESULTS_DIR, "sweep.csv"), lines.join("\n") + "\n");
}

function main() {
  const args = process.argv.slice(2);
  const sanity = args.includes("--sanity");
  const sweepOnly = args.includes("--sweep-only");
  const skipSweep = args.includes("--skip-sweep");
  const t0 = Date.now();

  if (sanity) {
    console.log("Sanity check: 200 runs each of keto / ketoBig...");
    ["keto", "ketoBig"].forEach((botName) => {
      const rows = [];
      for (let seed = 1; seed <= 200; seed++) rows.push(runOne(seed, botName, undefined).row);
      const s = summarize(rows);
      console.log(botName, "median moves:", s.medianMoves, "median score:", s.medianScore, "avgFrenzies:", s.avgFrenzies.toFixed(2));
    });
    console.log("Sanity check done in", ((Date.now() - t0) / 1000).toFixed(1), "s");
    return;
  }

  if (!sweepOnly) {
    console.log("Running default experiments (2000 runs/bot)...");
    DEFAULT_BOTS.forEach((botName) => {
      const bt0 = Date.now();
      // 60 (not the spec's 200) keeps results/ inside the 5 MB budget.
      const rows = runExperiment(botName, 2000, undefined, 60);
      console.log(botName, "done in", ((Date.now() - bt0) / 1000).toFixed(1), "s;", "median score", median(rows.map((r) => r.score)));
    });
  }

  if (!skipSweep) {
    console.log("Running sensitivity sweep (500 runs/bot, casual/ketoBig/lookahead)...");
    const st0 = Date.now();
    const lookaheadRuns = args.includes("--fast-lookahead-sweep") ? 150 : 500;
    runSweep(lookaheadRuns);
    console.log("Sweep done in", ((Date.now() - st0) / 1000).toFixed(1), "s (lookahead runs:", lookaheadRuns, ")");
  }

  console.log("Total runtime:", ((Date.now() - t0) / 1000).toFixed(1), "s");
}

if (require.main === module) main();

module.exports = { runOne, runExperiment, summarize, median, pctile, DEFAULT_BOTS };
