// Holey Cheese — bots and solvers.
//
// All of these work on the bitboard representation from engine.js (7 ints, one
// per row, bit c set = HOLE). engine.js's selftest proves that representation
// agrees with the plain-array reference everywhere, so the bots are measuring
// the real rules.
//
// A run is N mandatory taps. The run also ends early if the cheese left is
// fewer than the taps remaining — which, by the "no stable group is smaller
// than 7" result in selftest.js section 8, can only mean the wheel is gone.
"use strict";

const E = require("./engine.js");

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function tapOn(rows, cell) {
  const next = rows.slice();
  next[(cell / 7) | 0] |= 1 << (cell % 7);
  const gens = E.bitCollapse(next);
  return { rows: next, gens };
}

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

// Every distinct successor state, deduped: two different taps often lead to
// exactly the same board, and both the solvers and the beam benefit.
function successors(rows) {
  const cells = E.bitCheeseCells(rows);
  const out = [];
  const seen = new Set();
  for (let k = 0; k < cells.length; k++) {
    const r = tapOn(rows, cells[k]);
    const key = E.bitKey(r.rows);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ cell: cells[k], rows: r.rows, gens: r.gens, score: E.bitLargest(r.rows) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Exact solver — the strong reference
//
// The rule is monotone and its closure is idempotent, so the board after a set
// of taps does not depend on the order they were made in (selftest.js section
// 5 checks this empirically). That collapses the N! orderings of a tap set into
// one memo entry, which is what makes exhaustive search affordable at N <= 6.
//
// value(state, tapsLeft) = best (or worst) final largest-group reachable.
// ---------------------------------------------------------------------------

function makeSolver(mode) {           // mode: +1 maximise, -1 minimise
  return function solver(rows, tapsLeft, memo) {
    const m = memo || new Map();
    function value(rs, left) {
      if (left === 0) return E.bitLargest(rs);
      const cheese = E.bitCheese(rs);
      if (cheese < left) return E.bitLargest(rs);   // early exhaustion: run over
      const key = E.bitKey(rs) * 8 + left;
      const hit = m.get(key);
      if (hit !== undefined) return hit;
      const succ = successors(rs);
      let best;
      if (mode > 0) {
        // E.bitBound(child, left-1) is a hard UPPER bound on anything below
        // that child. Try the most promising child first and stop as soon as
        // the rest cannot beat what we already have. The bound is static (it
        // does not depend on a caller's alpha), so the stored value is exact.
        for (let i = 0; i < succ.length; i++) succ[i].ub = E.bitBound(succ[i].rows, left - 1);
        succ.sort((a, b) => b.ub - a.ub);
        best = -1;
        for (let i = 0; i < succ.length; i++) {
          if (succ[i].ub <= best) break;
          const v = value(succ[i].rows, left - 1);
          if (v > best) best = v;
        }
      } else {
        succ.sort((a, b) => a.score - b.score);
        best = 1e9;
        for (let i = 0; i < succ.length; i++) {
          const v = value(succ[i].rows, left - 1);
          if (v < best) best = v;
          if (best === 0) break;                    // nothing is lower than 0
        }
      }
      m.set(key, best);
      return best;
    }
    return { value: value(rows, tapsLeft), memo: m };
  };
}

const solveMax = makeSolver(1);
const solveMin = makeSolver(-1);

// Play a whole run under exact play, sharing one memo. Returns the realised
// tap sequence so cascade depth can be measured under optimal play.
function playExact(rows, taps, rng, mode) {
  const solver = mode < 0 ? solveMin : solveMax;
  const memo = new Map();
  let cur = rows.slice();
  const gensPerTap = [];
  const path = [];
  let used = 0, endedEarly = false;
  for (let left = taps; left > 0; left--) {
    if (E.bitCheese(cur) < left) { endedEarly = true; break; }
    const succ = successors(cur);
    let best = null, bestV = mode < 0 ? 1e9 : -1;
    const ties = [];
    for (let i = 0; i < succ.length; i++) {
      const v = solver(succ[i].rows, left - 1, memo).value;
      if (mode < 0 ? v < bestV : v > bestV) { bestV = v; ties.length = 0; ties.push(succ[i]); }
      else if (v === bestV) ties.push(succ[i]);
    }
    best = pick(rng, ties);
    cur = best.rows; gensPerTap.push(best.gens); path.push(best.cell); used++;
  }
  return {
    rows: cur, score: E.bitLargest(cur), gensPerTap, path, tapsUsed: used, endedEarly,
  };
}

// ---------------------------------------------------------------------------
// Beam search — the affordable stand-in when exact is too slow (N >= 7)
// ---------------------------------------------------------------------------

function beamBest(rows, taps, width) {
  let layer = [{ rows: rows.slice(), gens: [], path: [] }];
  for (let left = taps; left > 0; left--) {
    const next = [];
    const seen = new Set();
    for (let i = 0; i < layer.length; i++) {
      const st = layer[i];
      if (E.bitCheese(st.rows) < left) { next.push(st); continue; }
      const succ = successors(st.rows);
      for (let k = 0; k < succ.length; k++) {
        const key = E.bitKey(succ[k].rows);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push({
          rows: succ[k].rows,
          gens: st.gens.concat([succ[k].gens]),
          path: st.path.concat([succ[k].cell]),
          score: succ[k].score,
        });
      }
    }
    next.forEach((s) => { if (s.score === undefined) s.score = E.bitLargest(s.rows); });
    next.sort((a, b) => b.score - a.score);
    layer = next.slice(0, width);
  }
  let best = layer[0];
  for (let i = 1; i < layer.length; i++) {
    if (E.bitLargest(layer[i].rows) > E.bitLargest(best.rows)) best = layer[i];
  }
  return {
    score: E.bitLargest(best.rows), gensPerTap: best.gens, path: best.path,
    tapsUsed: best.path.length, endedEarly: best.path.length < taps,
  };
}

// ---------------------------------------------------------------------------
// Heuristic bots (choose(rows, tapsLeft, rng) -> chosen successor)
// ---------------------------------------------------------------------------

const bots = {
  // Careless: any cheese cell, uniformly.
  random(rows, tapsLeft, rng) {
    const cells = E.bitCheeseCells(rows);
    const cell = pick(rng, cells);
    const r = tapOn(rows, cell);
    return { rows: r.rows, gens: r.gens, cell };
  },

  // Greedy: maximise the largest surviving group after THIS tap's collapse.
  greedy(rows, tapsLeft, rng) {
    const succ = successors(rows);
    let best = -1;
    const ties = [];
    for (let i = 0; i < succ.length; i++) {
      if (succ[i].score > best) { best = succ[i].score; ties.length = 0; ties.push(succ[i]); }
      else if (succ[i].score === best) ties.push(succ[i]);
    }
    return pick(rng, ties);
  },

  // Greedy with one ply of lookahead: maximise the best largest-group two taps
  // out (or this tap's, on the last tap).
  look2(rows, tapsLeft, rng) {
    const succ = successors(rows);
    if (tapsLeft <= 1) return bots.greedy(rows, tapsLeft, rng);
    let best = -1;
    const ties = [];
    for (let i = 0; i < succ.length; i++) {
      let v;
      if (E.bitCheese(succ[i].rows) < tapsLeft - 1) v = succ[i].score;
      else {
        v = -1;
        const s2 = successors(succ[i].rows);
        for (let k = 0; k < s2.length; k++) if (s2[k].score > v) v = s2[k].score;
      }
      if (v > best) { best = v; ties.length = 0; ties.push(succ[i]); }
      else if (v === best) ties.push(succ[i]);
    }
    return pick(rng, ties);
  },

  // "Tap where nothing happens": among taps that trigger no collapse at all,
  // take the one leaving the biggest group; if every tap cascades, fall back
  // to greedy. This is the rule a human actually plays by, so it is the one
  // that matters for "is the game solved by an obvious heuristic?".
  safeFirst(rows, tapsLeft, rng) {
    const succ = successors(rows);
    const inert = succ.filter((s) => s.gens === 0);
    const pool = inert.length ? inert : succ;
    let best = -1;
    const ties = [];
    for (let i = 0; i < pool.length; i++) {
      if (pool[i].score > best) { best = pool[i].score; ties.length = 0; ties.push(pool[i]); }
      else if (pool[i].score === best) ties.push(pool[i]);
    }
    return pick(rng, ties);
  },

  // A plausible family player: mostly taps somewhere nothing happens, but
  // slips one tap in six. Weaker than greedy on purpose — it is the model used
  // for "what score does a median decent player see?".
  human(rows, tapsLeft, rng) {
    return rng() < 0.17 ? bots.random(rows, tapsLeft, rng) : bots.safeFirst(rows, tapsLeft, rng);
  },

  // A plausible human: usually sees the good tap, sometimes doesn't.
  casual(rows, tapsLeft, rng) {
    return rng() < 0.55 ? bots.greedy(rows, tapsLeft, rng) : bots.random(rows, tapsLeft, rng);
  },

  // A human who avoids only the obvious disasters: picks uniformly among the
  // taps that are not in the bottom third of outcomes.
  cautious(rows, tapsLeft, rng) {
    const succ = successors(rows);
    const scores = succ.map((s) => s.score).sort((a, b) => a - b);
    const cut = scores[Math.floor(scores.length / 3)];
    const okMoves = succ.filter((s) => s.score >= cut);
    return pick(rng, okMoves.length ? okMoves : succ);
  },
};

// Depth-limited lookahead: search `depth` taps ahead exactly, then take the
// board's largest group as the horizon value. depth 1 = greedy, depth 2 =
// look2, depth >= N = exact. Used to find how many plies of thinking the game
// actually rewards.
function makeLookahead(depth) {
  return function lookaheadBot(rows, tapsLeft, rng) {
    const memo = new Map();
    function value(rs, left, budget) {
      if (left === 0 || budget === 0) return E.bitLargest(rs);
      if (E.bitCheese(rs) < left) return E.bitLargest(rs);
      const key = E.bitKey(rs) * 64 + left * 8 + budget;
      const hit = memo.get(key);
      if (hit !== undefined) return hit;
      const succ = successors(rs);
      for (let i = 0; i < succ.length; i++) succ[i].ub = E.bitBound(succ[i].rows, Math.min(left, budget) - 1);
      succ.sort((a, b) => b.ub - a.ub);
      let best = -1;
      for (let i = 0; i < succ.length; i++) {
        if (succ[i].ub <= best) break;
        const v = value(succ[i].rows, left - 1, budget - 1);
        if (v > best) best = v;
      }
      memo.set(key, best);
      return best;
    }
    const succ = successors(rows);
    let best = -1;
    const ties = [];
    for (let i = 0; i < succ.length; i++) {
      const v = value(succ[i].rows, tapsLeft - 1, depth - 1);
      if (v > best) { best = v; ties.length = 0; ties.push(succ[i]); }
      else if (v === best) ties.push(succ[i]);
    }
    return pick(rng, ties);
  };
}

// Run a whole game with a heuristic bot.
function playBot(rows, taps, bot, rng) {
  let cur = rows.slice();
  const gensPerTap = [];
  const path = [];
  let used = 0, endedEarly = false;
  for (let left = taps; left > 0; left--) {
    if (E.bitCheese(cur) < left) { endedEarly = true; break; }
    const res = bot(cur, left, rng);
    cur = res.rows;
    gensPerTap.push(res.gens);
    if (res.cell !== undefined) path.push(res.cell);
    used++;
  }
  return {
    rows: cur, score: E.bitLargest(cur), gensPerTap, path, tapsUsed: used, endedEarly,
  };
}

module.exports = {
  tapOn, successors, solveMax, solveMin, playExact, beamBest, bots, playBot, pick,
  makeLookahead,
};
