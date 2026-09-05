"use strict";
const fs = require("fs");
const path = require("path");

const RESULTS_ROOT = path.join(__dirname, "results");
const BOTS = ["random", "casual", "greedy", "keto", "ketoBig", "lookahead"];
const CONFIGS = ["shipped", "AB", "ABC1", "ABC2", "A", "B"];

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
function pct(n, d) { return d ? (100 * n / d) : 0; }

function parseCsv(text) {
  const lines = text.trim().split("\n");
  const header = lines[0].split(",");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(","); // no quoted fields in these CSVs
    const row = {};
    header.forEach((h, idx) => { row[h] = parts[idx]; });
    rows.push(row);
  }
  return rows;
}

function loadRuns(cfgName, botName) {
  const dir = cfgName === "shipped" ? RESULTS_ROOT : path.join(RESULTS_ROOT, `cfg-${cfgName}`);
  const file = path.join(dir, `runs-${botName}.csv`);
  const text = fs.readFileSync(file, "utf8");
  return parseCsv(text).map((r) => ({
    seed: Number(r.seed),
    score: Number(r.score),
    moves: Number(r.moves),
    endReason: r.endReason,
    frenzies: Number(r.frenzies),
    crashed: r.crashed === "true",
    endState: r.endState,
    tierUpsSeen: Number(r.tierUpsSeen),
    longestDryGap: Number(r.longestDryGap),
    nearMissNoFrenzy: r.nearMissNoFrenzy === "true",
  }));
}

function statsFor(rows, randomMedian) {
  const scores = rows.map((r) => r.score);
  const moves = rows.map((r) => r.moves);
  return {
    n: rows.length,
    medianScore: median(scores),
    p10Score: pctile(scores, 10),
    p90Score: pctile(scores, 90),
    vsRandom: randomMedian ? median(scores) / randomMedian : 1,
    medianMoves: median(moves),
    p90Moves: pctile(moves, 90),
    maxMoves: Math.max(...moves),
    pctBudgetEnd: pct(rows.filter((r) => r.endReason === "budget").length, rows.length),
    avgFrenzies: rows.reduce((a, r) => a + r.frenzies, 0) / rows.length,
    pctRunsWithFrenzy: pct(rows.filter((r) => r.frenzies > 0).length, rows.length),
    pctEverCrash: pct(rows.filter((r) => r.crashed).length, rows.length),
    pctEndCrash: pct(rows.filter((r) => r.endState === "crash").length, rows.length),
    pctNeverTierUp: pct(rows.filter((r) => r.tierUpsSeen === 0).length, rows.length),
    medianLongestDryGap: median(rows.map((r) => r.longestDryGap)),
    pctNearMiss9099: pct(rows.filter((r) => r.nearMissNoFrenzy).length, rows.length),
  };
}

function fmtPct(v) { return v.toFixed(1) + "%"; }
function fmt1(v) { return v.toFixed(1); }
function fmt2(v) { return v.toFixed(2); }

function buildPerConfigTable(cfgName, dataByBot) {
  const lines = [];
  lines.push(`### ${cfgName}`);
  lines.push("");
  lines.push("| bot | median score | p10-p90 score | vs random | median moves | p90 moves | max moves | % budget end | avg frenzies | % runs w/ frenzy | % ever crash | % end in crash | % never tier-up | median dry gap | % peak 90-99, 0 frenzy |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  BOTS.forEach((bot) => {
    const s = dataByBot[bot];
    let warn = "";
    if (s.p90Moves > 100 || s.maxMoves > 300) warn = " ⚠️ RUNAWAY";
    lines.push(`| ${bot} | ${fmt1(s.medianScore)} | ${fmt1(s.p10Score)}-${fmt1(s.p90Score)} | ${fmt2(s.vsRandom)}x | ${fmt1(s.medianMoves)} | ${s.p90Moves}${warn && s.p90Moves>100?" ⚠️":""} | ${s.maxMoves}${s.maxMoves>300?" ⚠️":""} | ${fmtPct(s.pctBudgetEnd)} | ${fmt2(s.avgFrenzies)} | ${fmtPct(s.pctRunsWithFrenzy)} | ${fmtPct(s.pctEverCrash)} | ${fmtPct(s.pctEndCrash)} | ${fmtPct(s.pctNeverTierUp)} | ${fmt1(s.medianLongestDryGap)} | ${fmtPct(s.pctNearMiss9099)} |`);
  });
  lines.push("");
  return lines.join("\n");
}

function main() {
  const perConfig = {};
  CONFIGS.forEach((cfg) => {
    const dataByBot = {};
    const randomRows = loadRuns(cfg, "random");
    const randomMedian = median(randomRows.map((r) => r.score));
    BOTS.forEach((bot) => {
      const rows = loadRuns(cfg, bot);
      dataByBot[bot] = statsFor(rows, randomMedian);
    });
    perConfig[cfg] = dataByBot;
  });

  const out = [];
  out.push("# Keto Krush tuning-experiment candidates");
  out.push("");
  out.push("Numbers only, generated from `run-configs.js` output (results/cfg-<name>/,");
  out.push("2,000 runs/bot, seeds 1-2000, same seeds across all configs). `shipped`");
  out.push("reuses the existing `results/` (also 2,000 runs/bot, seeds 1-2000).");
  out.push("");
  out.push("Configs: `shipped` (as-is) · `AB` (drain keto 2 / deep 3, moveBudget 30) ·");
  out.push("`ABC1` (AB + specialFloorStep1) · `ABC2` (AB + detonationCarbsFree) ·");
  out.push("`A` (drain 2/3 only) · `B` (moveBudget 30 only).");
  out.push("");
  out.push("Runaway warning: flagged inline when p90 moves > 100 or max moves > 300.");
  out.push("");
  out.push("## Per-config, per-bot tables");
  out.push("");
  CONFIGS.forEach((cfg) => out.push(buildPerConfigTable(cfg, perConfig[cfg])));

  out.push("## Summary: ketoBig vs casual, all configs");
  out.push("");
  out.push("| config | bot | median score | skill ratio (ketoBig/casual) | % runs w/ frenzy | % end in crash | median moves |");
  out.push("|---|---|---|---|---|---|---|");
  CONFIGS.forEach((cfg) => {
    const kb = perConfig[cfg].ketoBig;
    const ca = perConfig[cfg].casual;
    const ratio = ca.medianScore ? kb.medianScore / ca.medianScore : 0;
    out.push(`| ${cfg} | ketoBig | ${fmt1(kb.medianScore)} | ${fmt2(ratio)}x | ${fmtPct(kb.pctRunsWithFrenzy)} | ${fmtPct(kb.pctEndCrash)} | ${fmt1(kb.medianMoves)} |`);
    out.push(`| ${cfg} | casual | ${fmt1(ca.medianScore)} | (see above) | ${fmtPct(ca.pctRunsWithFrenzy)} | ${fmtPct(ca.pctEndCrash)} | ${fmt1(ca.medianMoves)} |`);
  });
  out.push("");

  out.push("## Paired luck lines (per seed, per config)");
  out.push("");
  CONFIGS.forEach((cfg) => {
    const randomRows = loadRuns(cfg, "random");
    const ketoBigRows = loadRuns(cfg, "ketoBig");
    const casualRows = loadRuns(cfg, "casual");
    const lookaheadRows = loadRuns(cfg, "lookahead");
    const byS = (rows) => { const m = new Map(); rows.forEach((r) => m.set(r.seed, r.score)); return m; };
    const rM = byS(randomRows), kM = byS(ketoBigRows), cM = byS(casualRows), lM = byS(lookaheadRows);
    let n1 = 0, d1 = 0, n2 = 0, d2 = 0;
    rM.forEach((v, seed) => { if (kM.has(seed)) { d1++; if (v > kM.get(seed)) n1++; } });
    cM.forEach((v, seed) => { if (lM.has(seed)) { d2++; if (v > lM.get(seed)) n2++; } });
    out.push(`- **${cfg}**: random beats ketoBig on ${fmtPct(pct(n1, d1))} of seeds; casual beats lookahead on ${fmtPct(pct(n2, d2))} of seeds.`);
  });
  out.push("");

  fs.writeFileSync(path.join(__dirname, "CANDIDATES.md"), out.join("\n") + "\n");
  console.log("Wrote CANDIDATES.md");
}

main();
