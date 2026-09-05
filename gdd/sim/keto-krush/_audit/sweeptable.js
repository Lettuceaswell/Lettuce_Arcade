const fs = require("fs"), path = require("path");
const p = path.join(__dirname, "..", "results", "sweep.csv");
const t = fs.readFileSync(p, "utf8").trim().split("\n");
const h = t[0].split(",");
const rows = t.slice(1).map((l) => { const c = l.split(","); const o = {}; h.forEach((k, i) => o[k] = c[i]); return o; });
const SHIP = { "refund.deep": "2", "refund.keto": "2", "refund.frenzy": "5", moveBudget: "25", drain: "3/5", sugarRush: "1.5", frenzyMoves: "5", frenzyLand: "70", carbLoss: "3", proteinGain: "4" };
const n = (v) => Number(v);
const knobs = [...new Set(rows.map((r) => r.knob))];
const BOTS = process.argv[2] ? [process.argv[2]] : ["casual", "ketoBig", "lookahead"];
for (const bot of BOTS) {
  console.log("\n#### " + bot + "\n");
  console.log("| knob | value | median moves | p90 moves | max moves | median score | % budget end | % runs w/ frenzy | % runs w/ tier-up | median dry gap |");
  console.log("|---|---|---|---|---|---|---|---|---|---|");
  for (const k of knobs) {
    const vs = rows.filter((r) => r.knob === k && r.bot === bot);
    for (const r of vs) {
      console.log("| " + k + " | " + r.value + (r.value === SHIP[k] ? " **(shipped)**" : "") +
        " | " + n(r.medianMoves) + " | " + n(r.p90Moves) + " | " + n(r.maxMoves) +
        " | " + n(r.medianScore) + " | " + (n(r.pctBudgetEnd) * 100).toFixed(1) + "%" +
        " | " + (n(r.pctRunsWithFrenzy) * 100).toFixed(1) + "%" +
        " | " + (n(r.pctRunsWithTierUp) * 100).toFixed(1) + "%" +
        " | " + n(r.medianLongestDryGap) + " |");
    }
  }
}
// direction + magnitude summary vs shipped, ketoBig
console.log("\n#### Knob direction / magnitude (ketoBig, relative to shipped)\n");
console.log("| knob | range tested | median moves | median score | % frenzy runs | % tier-up runs | shape |");
console.log("|---|---|---|---|---|---|---|");
for (const k of knobs) {
  const vs = rows.filter((r) => r.knob === k && r.bot === "ketoBig");
  const base = vs.find((r) => r.value === SHIP[k]);
  const fmt = (key) => vs.map((r) => (key.startsWith("pct") ? (n(r[key]) * 100).toFixed(0) + "%" : n(r[key]))).join(" -> ");
  const mm = vs.map((r) => n(r.medianMoves));
  const ms = vs.map((r) => n(r.medianScore));
  const spanM = Math.max(...mm) / Math.max(1, Math.min(...mm));
  const spanS = Math.max(...ms) / Math.max(1, Math.min(...ms));
  const shape = spanM > 2 || spanS > 2 ? "CLIFF" : spanM > 1.25 || spanS > 1.4 ? "steep" : "gentle";
  console.log("| " + k + " | " + vs.map((r) => r.value).join(", ") + " | " + fmt("medianMoves") +
    " | " + fmt("medianScore") + " | " + fmt("pctRunsWithFrenzy") + " | " + fmt("pctRunsWithTierUp") + " | " + shape + " |");
}
