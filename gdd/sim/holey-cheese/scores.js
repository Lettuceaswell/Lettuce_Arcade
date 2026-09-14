// Holey Cheese — exactly which numbers can the scoreboard ever show?
// `node scores.js`
//
// Every group of surviving cheese is itself a STABLE region: all of its
// neighbours are holes (a cheese neighbour would be in the same group), so no
// cell of it has two neighbours outside it. The score is the size of the
// largest such group, so the set of possible scores is the set of sizes of
// connected stable regions on the 7x7 — plus 0.
//
// This enumerates every stable set on the board exhaustively with a row-by-row
// DP (a cell's neighbourhood is fully known once the row below it is fixed, so
// the state is just the previous two rows: 128 x 128), splits each into
// connected components, and collects the component sizes. No sampling.
"use strict";

const fs = require("fs");
const path = require("path");
const E = require("./engine.js");
const B = require("./bots.js");

const MASK = 0x7f;
const POP = E.POP;

// Is every cell of `mid` (row r) happy, given `up` (row r-1) and `dn` (r+1)?
// "Happy" = at most one of its in-grid neighbours lies outside the set.
function rowOk(up, mid, dn, isTop, isBottom) {
  for (let c = 0; c < 7; c++) {
    const bit = 1 << c;
    if (!(mid & bit)) continue;
    let out = 0;
    if (c > 0 && !(mid & (bit >> 1))) out++;
    if (c < 6 && !(mid & (bit << 1))) out++;
    if (!isTop && !(up & bit)) out++;
    if (!isBottom && !(dn & bit)) out++;
    if (out >= 2) return false;
  }
  return true;
}

function componentSizes(rows) {           // rows = 7 masks of MEMBER cells
  const left = rows.slice();
  const comp = [0, 0, 0, 0, 0, 0, 0];
  const out = [];
  for (let r = 0; r < 7; r++) {
    while (left[r]) {
      for (let k = 0; k < 7; k++) comp[k] = 0;
      comp[r] = left[r] & -left[r];
      for (;;) {
        let changed = 0;
        for (let k = 0; k < 7; k++) {
          const g = comp[k];
          let ng = g | ((g << 1) & MASK) | (g >> 1);
          if (k > 0) ng |= comp[k - 1];
          if (k < 6) ng |= comp[k + 1];
          ng &= left[k];
          if (ng !== g) { comp[k] = ng; changed = 1; }
        }
        if (!changed) break;
      }
      let size = 0;
      for (let k = 0; k < 7; k++) { size += POP[comp[k]]; left[k] &= ~comp[k]; }
      out.push(size);
    }
  }
  return out;
}

console.log("Enumerating every stable set on the 7x7 ...");
const t0 = Date.now();
const connectedSizes = new Set();
const anySizes = new Set();
let stableSets = 0;
const witness = {};
const stack = [];

// DFS over rows; a row is validated once the row after it is chosen.
(function walk(rowIdx, prev2, prev1, acc) {
  if (rowIdx === 7) {
    // Validate the last row with "no row below".
    if (!rowOk(prev2, prev1, 0, rowIdx - 1 === 0, true)) return;
    stableSets++;
    const sizes = componentSizes(acc);
    sizes.forEach((s) => {
      connectedSizes.add(s);
      if (witness[s] === undefined) witness[s] = acc.slice();
    });
    anySizes.add(sizes.reduce((a, b) => a + b, 0));
    return;
  }
  for (let m = 0; m < 128; m++) {
    // Validate row rowIdx-1 now that we know the row below it.
    if (rowIdx >= 1 && !rowOk(prev2, prev1, m, rowIdx - 1 === 0, false)) continue;
    acc[rowIdx] = m;
    walk(rowIdx + 1, prev1, m, acc);
    acc[rowIdx] = 0;
  }
})(0, 0, 0, [0, 0, 0, 0, 0, 0, 0]);

const sizes = [...connectedSizes].sort((a, b) => a - b);
console.log("stable sets: " + stableSets.toLocaleString() + "  (" +
  ((Date.now() - t0) / 1000).toFixed(1) + "s)");
console.log("\nPOSSIBLE SCORES (sizes of connected stable regions), plus 0:");
console.log("  " + sizes.join(", "));
const impossible = [];
for (let k = 1; k <= 49; k++) if (!connectedSizes.has(k)) impossible.push(k);
console.log("IMPOSSIBLE SCORES: " + impossible.join(", "));

function show(rowsMask) {
  const lines = [];
  for (let r = 0; r < 7; r++) {
    let s = "  ";
    for (let c = 0; c < 7; c++) s += (rowsMask[r] & (1 << c)) ? "C" : "#";
    lines.push(s);
  }
  return lines.join("\n");
}
[7, 8, 12, 13, 14].forEach((k) => {
  if (witness[k]) console.log("\nsmallest-found stable region of size " + k + ":\n" + show(witness[k]));
});

// ---------------------------------------------------------------------------
// Board-shape degeneracy rates at the recommended settings.
// ---------------------------------------------------------------------------
console.log("\n=== Board shape at the candidate settings (N=5) ===\n");
console.log("gen       H  filter        n  | allOpenersInert  noOpenerInert  oneTapWipeout  inertOpeners(mean/p10)");
const rowsOut = [];
[["grow75", 10], ["grow75", 11], ["grow75", 12], ["cracks", 12], ["scatter", 10]].forEach(([v, H]) => {
  ["none", "survivable"].forEach((fname) => {
    const rng = E.mulberry32(606 + H);
    let n = 0, allInert = 0, noneInert = 0, oneTap = 0;
    const inertCounts = [];
    for (let i = 0; i < 4000 && n < 2000; i++) {
      const b = E.generateExact(rng, v, H, 60);
      if (!b) continue;
      const bits = E.toBits(b);
      const succ = B.successors(bits);
      if (fname === "survivable") {
        // same test as sim.js FILTERS.survivable, inlined to keep this script
        // standalone: does any line of 5 taps leave cheese standing?
        let ok = false;
        const seen = new Set();
        (function go(rs, left) {
          if (ok) return;
          if (left === 0 || E.bitCheese(rs) < left) { if (E.bitLargest(rs) > 0) ok = true; return; }
          const key = E.bitKey(rs) * 8 + left;
          if (seen.has(key)) return;
          seen.add(key);
          const s2 = B.successors(rs).sort((a, c) => c.score - a.score);
          for (let k = 0; k < s2.length && !ok; k++) {
            if (s2[k].score === 0) break;
            go(s2[k].rows, left - 1);
          }
        })(bits, 5);
        if (!ok) continue;
      }
      n++;
      const inert = succ.filter((s) => s.gens === 0).length;
      inertCounts.push(inert);
      if (inert === succ.length) allInert++;
      if (inert === 0) noneInert++;
      if (succ.some((s) => E.bitLargest(s.rows) === 0)) oneTap++;
    }
    inertCounts.sort((a, b) => a - b);
    const mean = inertCounts.reduce((a, b) => a + b, 0) / n;
    rowsOut.push({ variant: v, holes: H, filter: fname, n, allInert: allInert / n,
      noneInert: noneInert / n, oneTap: oneTap / n, inertMean: mean, inertP10: inertCounts[Math.floor(n * 0.1)] });
    console.log(v.padEnd(8), String(H).padStart(2), fname.padEnd(11), String(n).padStart(5), " |",
      String((allInert / n * 100).toFixed(1) + "%").padStart(14),
      String((noneInert / n * 100).toFixed(1) + "%").padStart(14),
      String((oneTap / n * 100).toFixed(1) + "%").padStart(14),
      String(mean.toFixed(1)).padStart(12) + " / " + inertCounts[Math.floor(n * 0.1)]);
  });
});

fs.writeFileSync(path.join(__dirname, "results", "scores.json"),
  JSON.stringify({ stableSets, possible: sizes, impossible, shape: rowsOut }, null, 1));
console.log("\nwrote results/scores.json");
