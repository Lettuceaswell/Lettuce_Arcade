// Bot strategies. Each: choose(game, rng, moves) -> move (moves = game.legalMoves()).
"use strict";

function pickRandom(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function biggest(rng, arr) {
  let best = -1, bestMoves = [];
  arr.forEach((m) => {
    if (m.size > best) { best = m.size; bestMoves = [m]; }
    else if (m.size === best) bestMoves.push(m);
  });
  return pickRandom(rng, bestMoves);
}

const bots = {
  random(game, rng, moves) {
    return pickRandom(rng, moves);
  },

  greedy(game, rng, moves) {
    return biggest(rng, moves);
  },

  keto(game, rng, moves) {
    const proteinMoves = moves.filter((m) => m.protein);
    if (proteinMoves.length) return pickRandom(rng, proteinMoves);
    return pickRandom(rng, moves);
  },

  ketoBig(game, rng, moves) {
    const proteinMoves = moves.filter((m) => m.protein);
    if (proteinMoves.length) return biggest(rng, proteinMoves);
    const carbMoves = moves.filter((m) => !m.protein);
    return biggest(rng, carbMoves.length ? carbMoves : moves);
  },

  casual(game, rng, moves) {
    if (rng() < 0.7) return bots.random(game, rng, moves);
    return bots.ketoBig(game, rng, moves);
  },

  lookahead(game, rng, moves) {
    // Depth 1: pts + valueOf(stateAfter). valueOf = best step-1 pts reachable
    // on the resulting board + meter-progress bonus (weight 5/point below
    // 100, 0 in frenzy). Uses a fixed RNG substream per candidate so refills
    // are deterministic given the candidate index.
    const Engine = require("./engine.js");
    let best = null, bestScore = -Infinity;
    moves.forEach((m, idx) => {
      const clone = cloneGame(Engine, game, seedFor(game, idx));
      const rec = clone.applyMove(m);
      let value = rec.pts;
      if (!clone.over) {
        const nextMoves = clone.legalMoves();
        let bestPts = 0;
        nextMoves.forEach((nm) => {
          const pv = clone.previewMove(nm);
          if (pv.ptsStep1 > bestPts) bestPts = pv.ptsStep1;
        });
        value += bestPts;
        // Bonus for meter HELD, ~5 pts per meter point (spec: "a bonus for meter
        // gained toward the next tier"). Frenzy counts as a full meter so a
        // frenzy-triggering candidate is never penalised against a non-frenzy one.
        value += (clone.frenzyMoves > 0 ? 100 : clone.ketosis) * 5;
      }
      if (value > bestScore) { bestScore = value; best = m; }
    });
    return best || pickRandom(rng, moves);
  },
};

function seedFor(game, idx) {
  // Deterministic per-candidate substream, independent of game.rng's own state.
  return ((game.movesTaken + 1) * 2654435761 + idx * 40503) >>> 0;
}

function cloneGame(Engine, game, seed) {
  const clone = Object.create(Object.getPrototypeOf(game));
  Object.assign(clone, game);
  clone.grid = game.grid.map((row) => row.map((t) => ({ icon: t.icon, type: t.type })));
  clone.cfg = game.cfg;
  clone.rng = Engine.mulberry32(seed);
  return clone;
}

function makeTempted(k) {
  return function tempted(game, rng, moves) {
    const proteinMoves = moves.filter((m) => m.protein);
    const carbMoves = moves.filter((m) => !m.protein);
    const bestProtein = proteinMoves.length ? biggest(rng, proteinMoves) : null;
    const bestCarb = carbMoves.length ? biggest(rng, carbMoves) : null;
    if (!bestProtein) return bestCarb || pickRandom(rng, moves);
    if (!bestCarb) return bestProtein;
    const pProtein = game.previewMove(bestProtein);
    const pCarb = game.previewMove(bestCarb);
    if (pCarb.ptsStep1 >= k * pProtein.ptsStep1 && pProtein.ptsStep1 > 0) return bestCarb;
    if (pProtein.ptsStep1 === 0 && pCarb.ptsStep1 > 0) return bestCarb;
    return bestProtein;
  };
}

bots.tempted_1_0 = makeTempted(1.0);
bots.tempted_1_25 = makeTempted(1.25);
bots.tempted_1_5 = makeTempted(1.5);
bots.tempted_2_0 = makeTempted(2.0);

module.exports = bots;
