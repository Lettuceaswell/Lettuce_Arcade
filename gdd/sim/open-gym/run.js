"use strict";
const vm = require("vm");
const fs = require("fs");
const path = require("path");
const { buildContext } = require("./harness.js");
const { playTurn } = require("./bot.js");

const RUNS_PER_LEVEL = 30;
const MAX_TURNS = 200;

function diagnoseStuck(ctx) {
  const blocks = Object.keys(ctx.state.blocks).map((k) => ctx.state.blocks[k]);
  const neutral = blocks.filter((b) => !b.owner);
  const rivalBlocks = blocks.filter((b) => b.owner === "rival");
  const playerGyms = blocks.filter((b) => b.owner === "player" && b.isGym);
  const maxMomentum = playerGyms.length ? Math.max(...playerGyms.map((g) => g.momentum)) : 0;
  const allNeutralLapsed = neutral.length > 0 && neutral.every((b) => b.state === "lapsed" || b.state === null);
  const noAffordableRecruit = maxMomentum < ctx.COST.trial;
  const rivalNoGymNoUnit = rivalBlocks.length > 0 && !rivalBlocks.some((b) => b.isGym) && !rivalBlocks.some((b) => b.unit);
  const reasons = [];
  if (neutral.length && allNeutralLapsed) reasons.push(`all ${neutral.length} neutral blocks are lapsed/blank (defense>=1), player max momentum ${maxMomentum}`);
  if (noAffordableRecruit) reasons.push(`no affordable recruit (max gym momentum ${maxMomentum} < trial cost ${ctx.COST.trial})`);
  if (rivalNoGymNoUnit) reasons.push(`rival has ${rivalBlocks.length} orphaned blocks (no gym, no unit) that can't fold and may be undefeatable`);
  if (!reasons.length) reasons.push(`unclear: neutral=${neutral.length} rivalBlocks=${rivalBlocks.length} playerGyms=${playerGyms.length} maxMomentum=${maxMomentum}`);
  return reasons.join("; ");
}

function runOne(levelIdx, seed) {
  const memory = {};
  const ctx = buildContext({ mathRandomSeed: seed, memory });
  try {
    vm.runInContext(`levelIndex = ${levelIdx}`, ctx);
    if (process.env.OG_OVERRIDE) vm.runInContext(process.env.OG_OVERRIDE, ctx);
    ctx.maxLevel = ctx.LEVELS.length; // unlock all levels so prev/next disabled-state logic doesn't matter
    ctx.loadLevel(levelIdx);
    ctx.buildBoard();
    ctx.render();

    let turns = 0;
    const events = { splitSeen: false, gymEatenByLapsed: false, sedentarySpreadFired: false };
    // track whether player's own gym ever loses isGym due to lapsed capture
    let sawGymLoss = false;
    let peakMomentum = 0;
    while (!ctx.state.gameOver && turns < MAX_TURNS) {
      playTurn(ctx);
      turns++;
      // S4 check: did any block that used to be the player's gym get taken by lapsed?
      const playerGyms = Object.keys(ctx.state.blocks)
        .map((k) => ctx.state.blocks[k])
        .filter((b) => b.owner === "player" && b.isGym);
      if (!playerGyms.length) sawGymLoss = true;
      playerGyms.forEach((g) => { if (g.momentum > peakMomentum) peakMomentum = g.momentum; });
    }
    const result = {
      levelIdx,
      seed,
      turns,
      outcome: ctx.state.gameOver ? ctx.state.gameOver : "stuck",
      sawGymLoss,
      peakMomentum,
    };
    if (result.outcome === "stuck") {
      result.diagnosis = diagnoseStuck(ctx);
    }
    return result;
  } catch (err) {
    return { levelIdx, seed, outcome: "exception", error: err.stack || String(err) };
  }
}

function median(arr) {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function main() {
  const results = [];
  for (let lvl = 0; lvl < 15; lvl++) {
    for (let run = 0; run < RUNS_PER_LEVEL; run++) {
      const seed = `open-gym-run-L${lvl}-${run}`;
      results.push(runOne(lvl, seed));
    }
  }

  // Aggregate table
  const table = [];
  for (let lvl = 0; lvl < 15; lvl++) {
    const rs = results.filter((r) => r.levelIdx === lvl);
    const win = rs.filter((r) => r.outcome === "win").length;
    const lose = rs.filter((r) => r.outcome === "lose").length;
    const stuck = rs.filter((r) => r.outcome === "stuck").length;
    const exc = rs.filter((r) => r.outcome === "exception").length;
    const winTurns = rs.filter((r) => r.outcome === "win").map((r) => r.turns);
    const avgWinTurns = winTurns.length ? (winTurns.reduce((a, b) => a + b, 0) / winTurns.length).toFixed(1) : "-";
    const gymEaten = rs.filter((r) => r.sawGymLoss).length;
    table.push({ level: lvl + 1, win, lose, stuck, exception: exc, avgWinTurns, gymEatenRuns: gymEaten });
  }

  // Second table: median turns / median peak momentum for winning games.
  const medianTable = [];
  for (let lvl = 0; lvl < 15; lvl++) {
    const wins = results.filter((r) => r.levelIdx === lvl && r.outcome === "win");
    const medTurns = median(wins.map((r) => r.turns));
    const medPeak = median(wins.map((r) => r.peakMomentum));
    medianTable.push({
      level: lvl + 1,
      wins: wins.length,
      medianTurns: medTurns == null ? "-" : medTurns,
      medianPeakMomentum: medPeak == null ? "-" : medPeak,
    });
  }

  console.log("Level | Win | Lose | Stuck | Exception | AvgWinTurns | GymEatenRuns");
  table.forEach((t) => {
    console.log(`${String(t.level).padStart(5)} | ${String(t.win).padStart(3)} | ${String(t.lose).padStart(4)} | ${String(t.stuck).padStart(5)} | ${String(t.exception).padStart(9)} | ${String(t.avgWinTurns).padStart(11)} | ${t.gymEatenRuns}`);
  });

  console.log("\nLevel | Wins | MedianWinTurns | MedianPeakMomentum");
  medianTable.forEach((t) => {
    console.log(`${String(t.level).padStart(5)} | ${String(t.wins).padStart(4)} | ${String(t.medianTurns).padStart(14)} | ${String(t.medianPeakMomentum).padStart(19)}`);
  });

  // Exceptions detail
  const excs = results.filter((r) => r.outcome === "exception");
  if (excs.length) {
    console.log("\n--- Exceptions ---");
    excs.slice(0, 10).forEach((e) => console.log(`L${e.levelIdx + 1} seed=${e.seed}:\n${e.error}\n`));
  }

  // Stuck diagnoses summary
  const stuckDiag = {};
  results.filter((r) => r.outcome === "stuck").forEach((r) => {
    const key = `L${r.levelIdx + 1}: ${r.diagnosis}`;
    stuckDiag[key] = (stuckDiag[key] || 0) + 1;
  });
  if (Object.keys(stuckDiag).length) {
    console.log("\n--- Stuck diagnoses ---");
    Object.entries(stuckDiag).forEach(([k, v]) => console.log(`${v}x  ${k}`));
  }

  // write RESULTS.md
  let md = "# Open Gym bot playthrough results\n\n";
  md += `${RUNS_PER_LEVEL} seeded runs per level, cap ${MAX_TURNS} turns.\n\n`;
  md += "| Level | Win | Lose | Stuck | Exception | Avg win turns | Runs where player gym was lost |\n";
  md += "|---|---|---|---|---|---|---|\n";
  table.forEach((t) => {
    md += `| ${t.level} | ${t.win} | ${t.lose} | ${t.stuck} | ${t.exception} | ${t.avgWinTurns} | ${t.gymEatenRuns} |\n`;
  });

  md += "\n## Winning games: median turns and median peak momentum\n\n";
  md += "| Level | Wins | Median turns (wins) | Median peak player momentum (wins) |\n";
  md += "|---|---|---|---|\n";
  medianTable.forEach((t) => {
    md += `| ${t.level} | ${t.wins} | ${t.medianTurns} | ${t.medianPeakMomentum} |\n`;
  });

  if (excs.length) {
    md += "\n## Exceptions\n\n";
    excs.forEach((e) => { md += `**L${e.levelIdx + 1} seed=${e.seed}**\n\n\`\`\`\n${e.error}\n\`\`\`\n\n`; });
  }
  if (Object.keys(stuckDiag).length) {
    md += "\n## Stuck diagnoses\n\n";
    Object.entries(stuckDiag).forEach(([k, v]) => { md += `- ${v}x ${k}\n`; });
  }
  fs.writeFileSync(path.join(__dirname, "RESULTS.md"), md);
  console.log("\nWrote RESULTS.md");

  return { results, table };
}

if (require.main === module) main();
module.exports = { main, runOne, diagnoseStuck };
