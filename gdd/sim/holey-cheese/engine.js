// Holey Cheese — headless rules engine + board generators.
//
// This is the REFERENCE IMPLEMENTATION. The shipped game should port the
// plain-array functions in section 2 and the generator in section 4 verbatim;
// they are written for clarity, not speed. Section 5 is a bitboard mirror used
// only by the solvers in bots.js — `selftest.js` proves the two agree on
// millions of random boards, so nothing in the findings depends on the fast
// path being read carefully.
//
// No I/O, no DOM, no dependencies.
"use strict";

// ---------------------------------------------------------------------------
// 1. Board shape
// ---------------------------------------------------------------------------

const SIZE = 7;
const CELLS = SIZE * SIZE; // 49
const CHEESE = 1;
const HOLE = 0;

// Orthogonal (von Neumann) neighbours only. Board edges are hard edges: a cell
// on the border has 2 or 3 neighbours, never a phantom off-board hole.
const NEIGHBOURS = (function buildNeighbours() {
  const out = new Array(CELLS);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const list = [];
      if (r > 0) list.push((r - 1) * SIZE + c);
      if (r < SIZE - 1) list.push((r + 1) * SIZE + c);
      if (c > 0) list.push(r * SIZE + (c - 1));
      if (c < SIZE - 1) list.push(r * SIZE + (c + 1));
      out[r * SIZE + c] = list;
    }
  }
  return out;
})();

function idx(r, c) { return r * SIZE + c; }
function rowOf(i) { return (i / SIZE) | 0; }
function colOf(i) { return i % SIZE; }

function newBoard() {
  const b = new Uint8Array(CELLS);
  b.fill(CHEESE);
  return b;
}

function cloneBoard(b) { return Uint8Array.from(b); }

// Parse a board from an ASCII picture. '#' / 'o' / '.' = hole, anything else
// (conventionally 'C') = cheese. Used by selftest.js for hand-checked cases.
function boardFromStrings(rows) {
  if (rows.length !== SIZE) throw new Error("need " + SIZE + " rows");
  const b = newBoard();
  for (let r = 0; r < SIZE; r++) {
    const line = rows[r].replace(/\s+/g, "");
    if (line.length !== SIZE) throw new Error("row " + r + " is not " + SIZE + " wide");
    for (let c = 0; c < SIZE; c++) {
      const ch = line[c];
      b[idx(r, c)] = (ch === "#" || ch === "o" || ch === ".") ? HOLE : CHEESE;
    }
  }
  return b;
}

function boardToString(b) {
  const out = [];
  for (let r = 0; r < SIZE; r++) {
    let line = "";
    for (let c = 0; c < SIZE; c++) line += b[idx(r, c)] === HOLE ? "#" : "C";
    out.push(line);
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// 2. THE ONE RULE — bootstrap percolation, r = 2
// ---------------------------------------------------------------------------

// Count of orthogonally adjacent holes.
function holeNeighbours(b, i) {
  const nb = NEIGHBOURS[i];
  let n = 0;
  for (let k = 0; k < nb.length; k++) if (b[nb[k]] === HOLE) n++;
  return n;
}

// A board is STABLE when no cheese cell already touches two or more holes,
// i.e. collapse() would do nothing. Board generation must guarantee this or
// the wheel falls apart before the player touches it.
function isStable(b) {
  for (let i = 0; i < CELLS; i++) {
    if (b[i] !== CHEESE) continue;
    if (holeNeighbours(b, i) >= 2) return false;
  }
  return true;
}

// Resolve the collapse to its fixed point, IN PLACE.
//
// One "generation" = one simultaneous sweep: every cheese cell that currently
// touches 2+ holes falls at the same moment. That is what the game animates,
// so the generation count returned here is the pacing number.
//
// Note the fixed point itself does not depend on the update order (the rule is
// monotone: adding holes never un-dooms a cell), so an async implementation
// would reach the same board — only the generation count would differ.
// selftest.js checks this.
function collapse(b) {
  let gens = 0;
  for (;;) {
    const doomed = [];
    for (let i = 0; i < CELLS; i++) {
      if (b[i] !== CHEESE) continue;
      if (holeNeighbours(b, i) >= 2) doomed.push(i);
    }
    if (doomed.length === 0) break;
    for (let k = 0; k < doomed.length; k++) b[doomed[k]] = HOLE;
    gens++;
  }
  return gens;
}

// Same, but returns every generation as a list of cell indices (for animation
// checks and for the hand-worked examples in selftest.js).
function collapseTrace(b) {
  const trace = [];
  for (;;) {
    const doomed = [];
    for (let i = 0; i < CELLS; i++) {
      if (b[i] !== CHEESE) continue;
      if (holeNeighbours(b, i) >= 2) doomed.push(i);
    }
    if (doomed.length === 0) break;
    for (let k = 0; k < doomed.length; k++) b[doomed[k]] = HOLE;
    trace.push(doomed);
  }
  return trace;
}

// The player's verb: tap a CHEESE cell, it becomes a hole, the collapse
// resolves. Returns the generation count (0 = inert tap, nothing fell).
function tap(b, i) {
  if (b[i] !== CHEESE) throw new Error("illegal tap: cell " + i + " is not cheese");
  b[i] = HOLE;
  return collapse(b);
}

function cheeseCount(b) {
  let n = 0;
  for (let i = 0; i < CELLS; i++) if (b[i] === CHEESE) n++;
  return n;
}

// SCORE: the number of cheese cells in the largest orthogonally-connected
// group of surviving cheese. Only the single largest group counts.
function largestGroup(b) {
  const seen = new Uint8Array(CELLS);
  const stack = [];
  let best = 0;
  for (let start = 0; start < CELLS; start++) {
    if (b[start] !== CHEESE || seen[start]) continue;
    let size = 0;
    seen[start] = 1;
    stack.length = 0;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop();
      size++;
      const nb = NEIGHBOURS[i];
      for (let k = 0; k < nb.length; k++) {
        const j = nb[k];
        if (b[j] === CHEESE && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    if (size > best) best = size;
  }
  return best;
}

// Perimeter of the hole set, counting grid-boundary sides: 4 sides per hole,
// minus 2 for every orthogonally adjacent pair of holes.
//
// This is the conserved quantity of r=2 bootstrap percolation. When a cell
// falls it has >= 2 hole neighbours, so it adds 4 sides and cancels at least
// 2 x 2, and the perimeter never increases. The fully-holed 7x7 has perimeter
// 28, so a wheel whose holes start below 28 - 4N can never be wiped out no
// matter what the player taps. Clustered holes carry far less perimeter per
// hole than scattered ones (a straight crack of L holes has 2L+2, not 4L),
// which is why hole COUNT is the wrong difficulty dial and perimeter is the
// right one.
function holePerimeter(b) {
  let p = 0;
  for (let i = 0; i < CELLS; i++) {
    if (b[i] !== HOLE) continue;
    p += 4;
    const nb = NEIGHBOURS[i];
    for (let k = 0; k < nb.length; k++) if (b[nb[k]] === HOLE) p -= 1;
  }
  return p;
}

function legalTaps(b) {
  const out = [];
  for (let i = 0; i < CELLS; i++) if (b[i] === CHEESE) out.push(i);
  return out;
}

// ---------------------------------------------------------------------------
// 3. Seeded RNG (same mulberry32 the rest of the arcade's sims use)
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// Stand-in for Arcade.dailySeed() — turns "2026-09-14" into a 32-bit seed.
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function shuffled(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// ---------------------------------------------------------------------------
// 4. Board generators
// ---------------------------------------------------------------------------
//
// Every generator returns a board that is STABLE AT LOAD. They differ only in
// the *shape* of the hole set they tend to produce.
//
// Why "stable" is not the same as "spread out": a cheese cell dies when it
// touches two holes, so two holes only conflict when some cheese cell is
// adjacent to both. Two cells share an orthogonal neighbour exactly when they
// are at Manhattan distance 2 (in line, sharing one cell; or diagonal, sharing
// two). So:
//   - two ADJACENT holes are always fine (they share no orthogonal neighbour);
//   - two holes in line with a cheese cell between them are illegal;
//   - two diagonal holes are illegal unless BOTH shared corners are also holes.
// Straight cracks of holes are therefore legal, and so is a solid 2x2 block.
// A naive "no two holes within a 3x3 window" rule is strictly stricter than
// the real constraint. selftest.js checks each of these cases by hand.

// Try to turn cell i into a hole; keep it only if the board stays stable.
function tryPlace(b, i) {
  if (b[i] === HOLE) return false;
  b[i] = HOLE;
  if (isStable(b)) return true;
  b[i] = CHEESE;
  return false;
}

// "Keep every hole at least 3 apart" — the naive, stricter rule, kept as a
// generator variant so the findings can price what it costs. Manhattan
// distance >= 3 is the weakest separation rule that guarantees stability
// without reasoning about shared corners: it forbids adjacency (harmless) and
// distance-2 pairs (the ones that actually break the board).
function minSepOk(b, i) {
  const r = rowOf(i), c = colOf(i);
  for (let j = 0; j < CELLS; j++) {
    if (b[j] !== HOLE) continue;
    const d = Math.abs(rowOf(j) - r) + Math.abs(colOf(j) - c);
    if (d <= 2) return false;
  }
  return true;
}

// --- G1 "scatter": one pass over a shuffled cell order, keep every hole that
// leaves the board stable. Stopping at `target` gives exactly `target` holes
// when the order allows it; running the order out gives a maximal stable set.
//
// One pass is enough and a second would add nothing: the rule is monotone, so
// a cell rejected against a board can never become legal against a board with
// more holes in it.
function genScatter(rng, target) {
  const b = newBoard();
  let placed = 0;
  const order = shuffled(rng, Array.from({ length: CELLS }, (_, i) => i));
  for (let k = 0; k < order.length && placed < target; k++) {
    if (tryPlace(b, order[k])) placed++;
  }
  return { board: b, holes: placed };
}

// --- G2 "minSep": the naive stricter rule (no two holes in a 3x3 window).
function genMinSep(rng, target) {
  const b = newBoard();
  let placed = 0;
  const order = shuffled(rng, Array.from({ length: CELLS }, (_, i) => i));
  for (let k = 0; k < order.length && placed < target; k++) {
    const i = order[k];
    if (minSepOk(b, i)) { b[i] = HOLE; placed++; }
  }
  return { board: b, holes: placed };
}

// --- G3 "grow": scatter with an adjacency bias. With probability `bias` the
// next candidate is drawn from cells orthogonally touching an existing hole,
// which lengthens cracks instead of sprinkling dots.
function genGrow(rng, target, bias) {
  const b = newBoard();
  let placed = 0;
  let guard = 0;
  while (placed < target && guard++ < 600) {
    let cand = -1;
    if (placed > 0 && rng() < bias) {
      const edge = [];
      for (let i = 0; i < CELLS; i++) {
        if (b[i] !== CHEESE) continue;
        if (holeNeighbours(b, i) > 0) edge.push(i);
      }
      if (edge.length) cand = edge[Math.floor(rng() * edge.length)];
    }
    if (cand < 0) cand = Math.floor(rng() * CELLS);
    if (tryPlace(b, cand)) placed++;
  }
  // The bias can stall (every touching cell illegal); finish with a scatter
  // pass so the target is still reached when it is reachable at all.
  if (placed < target) {
    const order = shuffled(rng, Array.from({ length: CELLS }, (_, i) => i));
    for (let k = 0; k < order.length && placed < target; k++) {
      if (tryPlace(b, order[k])) placed++;
    }
  }
  return { board: b, holes: placed };
}

// --- G4 "cracks": place straight segments of length 1-3 (a legal shape, see
// the note above), falling back to singletons. Produces boards that read as
// fissures in a wheel rather than mouse bites.
function genCracks(rng, target, lens) {
  const lengths = lens || [1, 2, 2, 3, 3];
  const b = newBoard();
  let placed = 0;
  let guard = 0;
  while (placed < target && guard++ < 800) {
    let len = lengths[Math.floor(rng() * lengths.length)];
    if (len > target - placed) len = target - placed;
    const horiz = rng() < 0.5;
    const r = Math.floor(rng() * SIZE);
    const c = Math.floor(rng() * SIZE);
    const cells = [];
    for (let k = 0; k < len; k++) {
      const rr = horiz ? r : r + k;
      const cc = horiz ? c + k : c;
      if (rr >= SIZE || cc >= SIZE) break;
      cells.push(idx(rr, cc));
    }
    if (!cells.length) continue;
    // All-or-nothing: a segment that cannot be laid whole is not laid at all.
    const before = cloneBoard(b);
    let ok = true;
    for (let k = 0; k < cells.length; k++) {
      if (b[cells[k]] === HOLE) { ok = false; break; }
      b[cells[k]] = HOLE;
    }
    if (ok && isStable(b)) {
      placed += cells.length;
    } else {
      b.set(before);
    }
  }
  if (placed < target) {
    const order = shuffled(rng, Array.from({ length: CELLS }, (_, i) => i));
    for (let k = 0; k < order.length && placed < target; k++) {
      if (tryPlace(b, order[k])) placed++;
    }
  }
  return { board: b, holes: placed };
}

const GENERATORS = {
  scatter: (rng, target) => genScatter(rng, target),
  minSep: (rng, target) => genMinSep(rng, target),
  grow25: (rng, target) => genGrow(rng, target, 0.25),
  grow50: (rng, target) => genGrow(rng, target, 0.5),
  grow75: (rng, target) => genGrow(rng, target, 0.75),
  cracks: (rng, target) => genCracks(rng, target),
};

// Convenience: generate, insisting on the exact hole target, with retries.
// Returns null if `tries` attempts all fell short.
function generateExact(rng, variant, target, tries) {
  const gen = GENERATORS[variant];
  if (!gen) throw new Error("unknown generator " + variant);
  const n = tries === undefined ? 40 : tries;
  for (let t = 0; t < n; t++) {
    const g = gen(rng, target);
    if (g.holes === target) {
      if (!isStable(g.board)) throw new Error("generator produced an unstable board");
      return g.board;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 5. Bitboard mirror (speed only — see selftest.js for the equivalence proof)
// ---------------------------------------------------------------------------
//
// A board is 7 integers, one per row; bit c of row r is set when (r,c) is a
// HOLE. 7 bits per row, MASK = 0b1111111.

const MASK = 0x7f;
const POP = (function () {
  const t = new Uint8Array(128);
  for (let i = 0; i < 128; i++) t[i] = (i & 1) + t[i >> 1];
  return t;
})();

function toBits(b) {
  const rows = [0, 0, 0, 0, 0, 0, 0];
  for (let r = 0; r < SIZE; r++) {
    let m = 0;
    for (let c = 0; c < SIZE; c++) if (b[idx(r, c)] === HOLE) m |= 1 << c;
    rows[r] = m;
  }
  return rows;
}

function fromBits(rows) {
  const b = newBoard();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) if (rows[r] & (1 << c)) b[idx(r, c)] = HOLE;
  }
  return b;
}

function bitHoles(rows) {
  return POP[rows[0]] + POP[rows[1]] + POP[rows[2]] + POP[rows[3]] +
         POP[rows[4]] + POP[rows[5]] + POP[rows[6]];
}

function bitCheese(rows) { return CELLS - bitHoles(rows); }

// Bit-sliced "at least two hole neighbours": s1 accumulates "seen at least
// one", s2 "seen at least two", over the four shifted neighbour masks.
function bitCollapse(rows) {
  let gens = 0;
  const doom = [0, 0, 0, 0, 0, 0, 0];
  for (;;) {
    let any = 0;
    for (let r = 0; r < 7; r++) {
      const h = rows[r];
      const L = (h << 1) & MASK;           // hole immediately left
      const R = h >> 1;                    // hole immediately right
      const U = r > 0 ? rows[r - 1] : 0;
      const D = r < 6 ? rows[r + 1] : 0;
      let s1 = L, s2 = 0;
      s2 |= s1 & R; s1 |= R;
      s2 |= s1 & U; s1 |= U;
      s2 |= s1 & D; s1 |= D;
      const d = s2 & ~h & MASK;
      doom[r] = d;
      any |= d;
    }
    if (!any) break;
    for (let r = 0; r < 7; r++) rows[r] |= doom[r];
    gens++;
  }
  return gens;
}

function bitLargest(rows) {
  const cheese = [0, 0, 0, 0, 0, 0, 0];
  for (let r = 0; r < 7; r++) cheese[r] = ~rows[r] & MASK;
  const comp = [0, 0, 0, 0, 0, 0, 0];
  let best = 0;
  for (let r = 0; r < 7; r++) {
    while (cheese[r]) {
      for (let k = 0; k < 7; k++) comp[k] = 0;
      comp[r] = cheese[r] & -cheese[r];
      for (;;) {
        let changed = 0;
        for (let k = 0; k < 7; k++) {
          const g = comp[k];
          let ng = g | ((g << 1) & MASK) | (g >> 1);
          if (k > 0) ng |= comp[k - 1];
          if (k < 6) ng |= comp[k + 1];
          ng &= cheese[k];
          if (ng !== g) { comp[k] = ng; changed = 1; }
        }
        if (!changed) break;
      }
      let size = 0;
      for (let k = 0; k < 7; k++) { size += POP[comp[k]]; cheese[k] &= ~comp[k]; }
      if (size > best) best = size;
    }
  }
  return best;
}

// Sizes of every orthogonally-connected cheese group, largest first.
function bitGroupSizes(rows) {
  const cheese = [0, 0, 0, 0, 0, 0, 0];
  for (let r = 0; r < 7; r++) cheese[r] = ~rows[r] & MASK;
  const comp = [0, 0, 0, 0, 0, 0, 0];
  const sizes = [];
  for (let r = 0; r < 7; r++) {
    while (cheese[r]) {
      for (let k = 0; k < 7; k++) comp[k] = 0;
      comp[r] = cheese[r] & -cheese[r];
      for (;;) {
        let changed = 0;
        for (let k = 0; k < 7; k++) {
          const g = comp[k];
          let ng = g | ((g << 1) & MASK) | (g >> 1);
          if (k > 0) ng |= comp[k - 1];
          if (k < 6) ng |= comp[k + 1];
          ng &= cheese[k];
          if (ng !== g) { comp[k] = ng; changed = 1; }
        }
        if (!changed) break;
      }
      let size = 0;
      for (let k = 0; k < 7; k++) { size += POP[comp[k]]; cheese[k] &= ~comp[k]; }
      sizes.push(size);
    }
  }
  sizes.sort((a, b) => b - a);
  return sizes;
}

// Hard upper bound on the score still reachable from `rows` with `left` taps
// to spend. Every future group lies inside one of today's groups, and any tap
// landing in a group destroys at least one of its cells, so a group of size g
// survives whole only if all `left` taps fit in the other groups.
// Tight on a single-group board: g - left.
function bitBound(rows, left) {
  const sizes = bitGroupSizes(rows);
  if (!sizes.length) return 0;
  let total = 0;
  for (let i = 0; i < sizes.length; i++) total += sizes[i];
  let best = 0;
  for (let i = 0; i < sizes.length; i++) {
    const forced = left - (total - sizes[i]);
    const v = sizes[i] - (forced > 0 ? forced : 0);
    if (v > best) best = v;
  }
  return best;
}

function bitClone(rows) { return rows.slice(); }

// Tap (r,c) on a bitboard copy; returns { rows, gens }.
function bitTap(rows, r, c) {
  const next = rows.slice();
  next[r] |= 1 << c;
  const gens = bitCollapse(next);
  return { rows: next, gens };
}

// Exact 49-bit key, safe in a double (max 2^49).
function bitKey(rows) {
  const lo = rows[0] | (rows[1] << 7) | (rows[2] << 14) | (rows[3] << 21);
  const hi = rows[4] | (rows[5] << 7) | (rows[6] << 14);
  return lo * 2097152 + hi;
}

// List of (r,c) cheese cells as packed r*7+c.
function bitCheeseCells(rows) {
  const out = [];
  for (let r = 0; r < 7; r++) {
    let m = ~rows[r] & MASK;
    while (m) {
      const bit = m & -m;
      out.push(r * 7 + (31 - Math.clz32(bit)));
      m ^= bit;
    }
  }
  return out;
}

module.exports = {
  SIZE, CELLS, CHEESE, HOLE, NEIGHBOURS, MASK,
  idx, rowOf, colOf, newBoard, cloneBoard, boardFromStrings, boardToString,
  holeNeighbours, isStable, collapse, collapseTrace, tap, cheeseCount, holePerimeter,
  largestGroup, legalTaps,
  mulberry32, hashSeed, shuffled,
  tryPlace, minSepOk, genScatter, genMinSep, genGrow, genCracks,
  GENERATORS, generateExact,
  toBits, fromBits, bitHoles, bitCheese, bitCollapse, bitLargest, bitClone,
  bitTap, bitKey, bitCheeseCells, POP, bitGroupSizes, bitBound,
};
