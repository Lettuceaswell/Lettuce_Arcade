// Holey Cheese — engine self-test. `node selftest.js`.
//
// Nothing in FINDINGS.md should be believed unless this passes. Cases are
// hand-worked where the expected answer is written out cell by cell.
"use strict";

const E = require("./engine.js");
const { idx, boardFromStrings, CHEESE, HOLE } = E;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.log("FAIL: " + name + (extra ? "\n" + extra : ""));
}
function eq(name, got, want) {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  ok(name, a === b, "  got  " + a + "\n  want " + b);
}

// ---------------------------------------------------------------------------
// 1. Empty wheel
// ---------------------------------------------------------------------------
{
  const b = E.newBoard();
  ok("all-cheese board is stable", E.isStable(b));
  eq("all-cheese collapse does nothing", E.collapse(b), 0);
  eq("all-cheese cheese count", E.cheeseCount(b), 49);
  eq("all-cheese largest group", E.largestGroup(b), 49);
}

// ---------------------------------------------------------------------------
// 2. A tap that does nothing (the inert tap)
// ---------------------------------------------------------------------------
{
  const b = E.newBoard();
  const gens = E.tap(b, idx(3, 3));
  eq("inert tap: zero generations", gens, 0);
  eq("inert tap: 48 cheese left", E.cheeseCount(b), 48);
  eq("inert tap: still one group of 48", E.largestGroup(b), 48);
  ok("inert tap leaves a stable board", E.isStable(b));
}

// ---------------------------------------------------------------------------
// 3. Stability rules, each case checked by hand
// ---------------------------------------------------------------------------
{
  // Two ADJACENT holes share no orthogonal neighbour -> legal.
  const domino = E.newBoard();
  domino[idx(3, 3)] = HOLE; domino[idx(3, 4)] = HOLE;
  ok("two adjacent holes are stable", E.isStable(domino));

  // Straight triomino: (3,3)(3,4)(3,5). The only distance-2 pair is
  // (3,3)-(3,5) and the cell between them is itself a hole -> legal.
  const crack = E.cloneBoard(domino);
  crack[idx(3, 5)] = HOLE;
  ok("a straight 3-crack is stable", E.isStable(crack));

  // A full row of holes is a legal crack straight across the wheel.
  const rowCrack = E.newBoard();
  for (let c = 0; c < 7; c++) rowCrack[idx(3, c)] = HOLE;
  ok("a full row of holes is stable", E.isStable(rowCrack));

  // Two holes in line with a cheese cell between them -> that cell has two
  // hole neighbours -> illegal.
  const gap = E.newBoard();
  gap[idx(3, 3)] = HOLE; gap[idx(3, 5)] = HOLE;
  ok("holes at Manhattan distance 2 in line are NOT stable", !E.isStable(gap));
  eq("...and the cell between them is the one that falls",
    E.holeNeighbours(gap, idx(3, 4)), 2);

  // L-tromino: (3,3)(3,4)(4,3) leaves (4,4) touching two holes -> illegal.
  const ell = E.newBoard();
  ell[idx(3, 3)] = HOLE; ell[idx(3, 4)] = HOLE; ell[idx(4, 3)] = HOLE;
  ok("an L-shaped corner of holes is NOT stable", !E.isStable(ell));

  // Diagonal pair with both shared corners cheese -> illegal.
  const diag = E.newBoard();
  diag[idx(3, 3)] = HOLE; diag[idx(4, 4)] = HOLE;
  ok("a diagonal pair of holes is NOT stable", !E.isStable(diag));

  // ...but a solid 2x2 block of holes IS stable (both shared corners are
  // holes, and every cheese cell around the block touches exactly one).
  const block = E.newBoard();
  block[idx(3, 3)] = HOLE; block[idx(3, 4)] = HOLE;
  block[idx(4, 3)] = HOLE; block[idx(4, 4)] = HOLE;
  ok("a solid 2x2 block of holes is stable", E.isStable(block));

  // The naive rule is strictly stricter: it rejects the legal domino.
  const empty = E.newBoard();
  empty[idx(3, 3)] = HOLE;
  ok("minSep rejects the legal adjacent hole", !E.minSepOk(empty, idx(3, 4)));
  ok("stability accepts it", (function () {
    const t = E.cloneBoard(empty); return E.tryPlace(t, idx(3, 4));
  })());
}

// ---------------------------------------------------------------------------
// 4. HAND-WORKED CASCADE — four generations, every falling cell written out
//
// Start holes: (0,0), (2,2), (4,1). No two are at Manhattan distance 2
// (distances 4, 3 and 5), so the board is stable at load.
//
// Tap (1,1):
//   gen 1  (0,1) [(0,0),(1,1)]   (1,0) [(0,0),(1,1)]
//          (1,2) [(1,1),(2,2)]   (2,1) [(1,1),(2,2)]
//   gen 2  (0,2) [(0,1),(1,2)]   (2,0) [(1,0),(2,1)]   (3,1) [(2,1),(4,1)]
//   gen 3  (3,0) [(2,0),(3,1)]   (3,2) [(2,2),(3,1)]
//   gen 4  (4,0) [(3,0),(4,1)]   (4,2) [(3,2),(4,1)]
//   gen 5  nothing: the holes are now the solid 5x3 block rows 0-4 x cols 0-2
//          and a solid rectangle has no cell outside it touching two of it.
// Survivors: 34 cheese cells, all one group (cols 3-6 plus rows 5-6 of
// cols 0-2, joined at (5,2)-(5,3)).
// ---------------------------------------------------------------------------
{
  const b = E.newBoard();
  b[idx(0, 0)] = HOLE; b[idx(2, 2)] = HOLE; b[idx(4, 1)] = HOLE;
  ok("hand case: stable at load", E.isStable(b));
  eq("hand case: three starting holes", 49 - E.cheeseCount(b), 3);

  const trace = (function () {
    const t = E.cloneBoard(b);
    t[idx(1, 1)] = HOLE;
    return E.collapseTrace(t).map((g) => g.map((i) => [E.rowOf(i), E.colOf(i)]));
  })();
  eq("hand case: generation 1", trace[0], [[0, 1], [1, 0], [1, 2], [2, 1]]);
  eq("hand case: generation 2", trace[1], [[0, 2], [2, 0], [3, 1]]);
  eq("hand case: generation 3", trace[2], [[3, 0], [3, 2]]);
  eq("hand case: generation 4", trace[3], [[4, 0], [4, 2]]);
  eq("hand case: exactly four generations", trace.length, 4);

  const after = E.cloneBoard(b);
  const gens = E.tap(after, idx(1, 1));
  eq("hand case: tap() reports 4 generations", gens, 4);
  eq("hand case: 15 holes = the 5x3 block", 49 - E.cheeseCount(after), 15);
  let blockOk = true;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
    if (after[idx(r, c)] !== HOLE) blockOk = false;
  }
  ok("hand case: the block is exactly rows 0-4 x cols 0-2", blockOk);
  eq("hand case: score is 34", E.largestGroup(after), 34);
  ok("hand case: result is stable", E.isStable(after));
}

// ---------------------------------------------------------------------------
// 5. Order independence and update-order independence
// ---------------------------------------------------------------------------
{
  // The rule is monotone, so the fixed point depends only on the SET of cells
  // holed, not on the order the player tapped them, and not on whether the
  // implementation updates synchronously or one cell at a time.
  const rng = E.mulberry32(7);
  let orderChecks = 0, asyncChecks = 0;
  for (let t = 0; t < 12000; t++) {
    const board = E.generateExact(rng, "scatter", 8 + Math.floor(rng() * 5), 6);
    if (!board) continue;
    const cells = E.legalTaps(board);
    const a = cells[Math.floor(rng() * cells.length)];
    let bcell = cells[Math.floor(rng() * cells.length)];
    if (bcell === a) continue;

    const ab = E.cloneBoard(board);
    ab[a] = HOLE; E.collapse(ab);
    if (ab[bcell] !== CHEESE) continue;   // not a legal order
    ab[bcell] = HOLE; E.collapse(ab);

    const ba = E.cloneBoard(board);
    ba[bcell] = HOLE; E.collapse(ba);
    if (ba[a] !== CHEESE) continue;
    ba[a] = HOLE; E.collapse(ba);

    orderChecks++;
    if (E.boardToString(ab) !== E.boardToString(ba)) {
      ok("tap order independence", false, E.boardToString(ab));
      break;
    }

    // Async: fall one doomed cell at a time, re-scanning after each.
    const sync = E.cloneBoard(board); sync[a] = HOLE; E.collapse(sync);
    const async_ = E.cloneBoard(board); async_[a] = HOLE;
    for (;;) {
      let hit = -1;
      for (let i = 0; i < 49; i++) {
        if (async_[i] === CHEESE && E.holeNeighbours(async_, i) >= 2) { hit = i; break; }
      }
      if (hit < 0) break;
      async_[hit] = HOLE;
    }
    asyncChecks++;
    if (E.boardToString(sync) !== E.boardToString(async_)) {
      ok("sync/async fixed point identical", false);
      break;
    }
  }
  ok("tap order independence (" + orderChecks + " pairs)", orderChecks > 1500);
  ok("sync/async fixed point identical (" + asyncChecks + " boards)", asyncChecks > 1500);
}

// ---------------------------------------------------------------------------
// 6. Bitboard mirror agrees with the reference implementation
// ---------------------------------------------------------------------------
{
  const rng = E.mulberry32(99);
  let n = 0, bad = 0;
  for (let t = 0; t < 60000; t++) {
    // Arbitrary boards, stable or not — the fast path must match everywhere.
    const b = E.newBoard();
    const holes = Math.floor(rng() * 30);
    for (let k = 0; k < holes; k++) b[Math.floor(rng() * 49)] = HOLE;
    const rows = E.toBits(b);
    const refGens = E.collapse(b);
    const bitGens = E.bitCollapse(rows);
    if (refGens !== bitGens) bad++;
    if (E.boardToString(b) !== E.boardToString(E.fromBits(rows))) bad++;
    if (E.largestGroup(b) !== E.bitLargest(rows)) bad++;
    if (E.cheeseCount(b) !== E.bitCheese(rows)) bad++;
    n++;
  }
  ok("bitboard mirror matches reference on " + n + " boards", bad === 0,
    "  mismatches: " + bad);
}

// ---------------------------------------------------------------------------
// 7. Generators only ever emit stable boards
// ---------------------------------------------------------------------------
{
  const rng = E.mulberry32(4242);
  let bad = 0, n = 0, over = 0;
  Object.keys(E.GENERATORS).forEach((v) => {
    for (let t = 0; t < 1500; t++) {
      const target = 4 + Math.floor(rng() * 20);
      const g = E.GENERATORS[v](rng, target);
      n++;
      if (!E.isStable(g.board)) bad++;
      if (g.holes !== 49 - E.cheeseCount(g.board)) bad++;
      if (g.holes > target) over++;
    }
  });
  ok("every generated board is stable (" + n + " boards)", bad === 0);
  ok("no generator overshoots its hole target", over === 0);
}

// ---------------------------------------------------------------------------
// 8. The smallest surviving group is 7 — proved by enumeration
//
// Any group of surviving cheese is itself a stable region: all of its
// neighbours are holes (a cheese neighbour would be in the same group), so
// every cell in it has at most one neighbour outside it. Enumerate every
// connected region of size 1..6 on the 7x7 and check none satisfies that.
// ---------------------------------------------------------------------------
{
  const seen = new Set();
  let frontier = [];
  for (let i = 0; i < 49; i++) { const k = String(i); seen.add(k); frontier.push([i]); }
  let stableSmall = null, counted = frontier.length;
  function regionIsStable(cells) {
    const inSet = new Uint8Array(49);
    cells.forEach((c) => { inSet[c] = 1; });
    for (let k = 0; k < cells.length; k++) {
      let outside = 0;
      const nb = E.NEIGHBOURS[cells[k]];
      for (let j = 0; j < nb.length; j++) if (!inSet[nb[j]]) outside++;
      if (outside >= 2) return false;
    }
    return true;
  }
  for (let size = 1; size <= 6; size++) {
    frontier.forEach((cells) => { if (regionIsStable(cells)) stableSmall = cells.slice(); });
    if (size === 6) break;
    const next = [];
    frontier.forEach((cells) => {
      const set = new Set(cells);
      cells.forEach((c) => E.NEIGHBOURS[c].forEach((nb) => {
        if (set.has(nb)) return;
        const grown = cells.concat([nb]).sort((x, y) => x - y);
        const key = grown.join(",");
        if (seen.has(key)) return;
        seen.add(key);
        next.push(grown);
      }));
    });
    frontier = next;
    counted += next.length;
  }
  ok("no connected cheese region of size 1-6 is stable (" + counted +
    " regions enumerated)", stableSmall === null,
    stableSmall ? "  found: " + JSON.stringify(stableSmall) : "");

  // Witness that 7 is reachable: the top edge row of cheese, everything else
  // a hole. Each of its cells has one neighbour below and two (or one) beside
  // it inside the row, so exactly one hole neighbour. It has to be an EDGE
  // row: a middle row of cheese has holes above AND below and falls at once.
  const rowOnly = E.newBoard();
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    if (r !== 0) rowOnly[idx(r, c)] = HOLE;
  }
  ok("the top edge row of 7 cheese is stable", E.isStable(rowOnly));
  const midRow = E.newBoard();
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    if (r !== 3) midRow[idx(r, c)] = HOLE;
  }
  ok("a MIDDLE row of 7 cheese is not stable", !E.isStable(midRow));
  eq("...and scores 7", E.largestGroup(rowOnly), 7);
}

// ---------------------------------------------------------------------------
// 9. Early exhaustion / total wipeout
//
// Consequence of section 8: every board the player can ever see is stable, so
// its cheese count is either 0 or at least 7. With at most 7 taps in a run,
// "fewer cheese than taps remaining" can therefore only mean zero cheese.
// The case below is a genuine wipeout: a diagonal of holes percolates.
// ---------------------------------------------------------------------------
{
  // The classic r=2 bootstrap result: a full diagonal infects the whole grid.
  const diag = E.newBoard();
  for (let i = 0; i < 7; i++) diag[idx(i, i)] = HOLE;
  ok("a full diagonal is NOT stable at load", !E.isStable(diag));
  const gens = E.collapse(diag);
  eq("a full diagonal wipes the wheel out", E.cheeseCount(diag), 0);
  ok("...and takes several generations (" + gens + ")", gens >= 4);

  // Reachable-in-play wipeout: start from a stable board with holes on every
  // other diagonal cell and tap the rest of the diagonal.
  const b = E.newBoard();
  [[0, 0], [2, 2], [4, 4], [6, 6]].forEach(([r, c]) => { b[idx(r, c)] = HOLE; });
  ok("diagonal-spaced-2 board is stable at load", E.isStable(b));
  let taps = 0, wiped = false;
  [[1, 1], [3, 3], [5, 5]].forEach(([r, c]) => {
    if (wiped) return;
    if (b[idx(r, c)] !== CHEESE) return;
    E.tap(b, idx(r, c)); taps++;
    if (E.cheeseCount(b) === 0) wiped = true;
  });
  ok("tapping the gaps in the diagonal wipes the wheel (" + taps + " taps)", wiped);
  eq("wipeout scores 0", E.largestGroup(b), 0);
}

// ---------------------------------------------------------------------------
// 10. Never-below-7 holds across real play
// ---------------------------------------------------------------------------
{
  const rng = E.mulberry32(31337);
  let minNonZero = 99, zeros = 0, runs = 0;
  for (let t = 0; t < 3000; t++) {
    const board = E.generateExact(rng, "scatter", 8 + Math.floor(rng() * 6), 6);
    if (!board) continue;
    const b = E.cloneBoard(board);
    for (let k = 0; k < 5; k++) {
      const cells = E.legalTaps(b);
      if (!cells.length) break;
      E.tap(b, cells[Math.floor(rng() * cells.length)]);
    }
    const n = E.cheeseCount(b);
    runs++;
    if (n === 0) zeros++; else if (n < minNonZero) minNonZero = n;
  }
  ok("across " + runs + " random runs, surviving cheese is 0 or >= 7 (min seen "
    + minNonZero + ", " + zeros + " wipeouts)", minNonZero >= 7);
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
