"use strict";
// Tuning-experiment runner: runs named configs x named bots, seeds 1..N,
// writes CSVs to results/cfg-<name>/ (never touches the shipped results/).
const fs = require("fs");
const path = require("path");
const { runOne, median, pctile } = require("./sim.js");
const Engine = require("./engine.js");

const RESULTS_ROOT = path.join(__dirname, "results");

const BOTS = ["random", "casual", "greedy", "keto", "ketoBig", "lookahead"];
const N_RUNS = 2000;

function baseTiers() {
  return JSON.parse(JSON.stringify(Engine.DEFAULT_CONFIG.tiers));
}

function drainConfig(keto, deep) {
  const tiers = baseTiers();
  tiers[2].drain = keto; // keto tier
  tiers[3].drain = deep; // deep tier
  return tiers;
}

const CONFIGS = {
  shipped: {},
  AB: { tiers: drainConfig(2, 3), moveBudget: 30 },
  ABC1: { tiers: drainConfig(2, 3), moveBudget: 30, specialFloorStep1: true },
  ABC2: { tiers: drainConfig(2, 3), moveBudget: 30, detonationCarbsFree: true },
  A: { tiers: drainConfig(2, 3) },
  B: { moveBudget: 30 },
};

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function runConfig(name, cfgPatch) {
  const outDir = path.join(RESULTS_ROOT, `cfg-${name}`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const config = Object.keys(cfgPatch).length ? cfgPatch : undefined;

  const header = "seed,bot,score,moves,movesEarned,endReason,frenzies,peakMeter,crashed,maxCombo,bestMovePts,proteinTiles,carbTiles,pctCrash,pctNormal,pctKeto,pctDeep,pctFrenzy,tierUpsSeen,firstTierUpMove,endState,endedWithin5OfFrenzy,longestDryGap,rewardEvents,nearMissNoFrenzy,fellBackWithoutFrenzy,lastMoveWasReward";

  const allRows = {};
  BOTS.forEach((botName) => {
    const lines = [header];
    const rows = [];
    for (let seed = 1; seed <= N_RUNS; seed++) {
      const { row } = runOne(seed, botName, config);
      rows.push(row);
      lines.push([
        row.seed, row.bot, row.score, row.moves, row.movesEarned, row.endReason,
        row.frenzies, row.peakMeter, row.crashed, row.maxCombo, row.bestMovePts,
        row.proteinTiles, row.carbTiles,
        row.pctMovesByState.crash, row.pctMovesByState.normal, row.pctMovesByState.keto,
        row.pctMovesByState.deep, row.pctMovesByState.frenzy,
        row.tierUpsSeen, row.firstTierUpMove, row.endState, row.endedWithin5OfFrenzy,
        row.longestDryGap, row.rewardEvents, row.nearMissNoFrenzy, row.fellBackWithoutFrenzy,
        row.lastMoveWasReward,
      ].map(csvEscape).join(","));
    }
    fs.writeFileSync(path.join(outDir, `runs-${botName}.csv`), lines.join("\n") + "\n");
    allRows[botName] = rows;
  });
  return allRows;
}

function main() {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--config");
  const only = idx !== -1 ? args[idx + 1] : null;

  const t0 = Date.now();
  Object.keys(CONFIGS).forEach((name) => {
    if (only && only !== name) return;
    if (name === "shipped") {
      // Reuse existing shipped results/ instead of rerunning, per spec, unless
      // explicitly requested via --config shipped.
      if (!only) {
        console.log("shipped: reusing existing results/ (not rerun)");
        return;
      }
    }
    const bt0 = Date.now();
    console.log(`Running config ${name}...`);
    runConfig(name, CONFIGS[name]);
    console.log(`  ${name} done in ${((Date.now() - bt0) / 1000).toFixed(1)}s`);
  });
  console.log("Total runtime:", ((Date.now() - t0) / 1000).toFixed(1), "s");
}

if (require.main === module) main();
module.exports = { CONFIGS, runConfig, BOTS, N_RUNS };
