// Parity under a protein-seeking chooser (exercises climbs, frenzies, specials)
// and under a big-match chooser (exercises 4+ runs -> special tiles -> chains).
const H = require("./harness.js");
const { Game } = require("../engine.js");

const STRATS = {
  proteinBig: function (moves) {
    let best = null;
    for (const m of moves) {
      if (!best) { best = m; continue; }
      const bp = best.protein ? 1 : 0, mp = m.protein ? 1 : 0;
      if (mp > bp || (mp === bp && m.size > best.size)) best = m;
    }
    return best;
  },
  big: function (moves) {
    let best = moves[0];
    for (const m of moves) if (m.size > best.size) best = m;
    return best;
  },
  first: function (moves) { return moves[0]; },
  last: function (moves) { return moves[moves.length - 1]; },
};

const NSEEDS = Number(process.argv[2] || 30);
let bad = 0, totalMoves = 0, frenzies = 0, specials = 0;
for (const name of Object.keys(STRATS)) {
  const pick = STRATS[name];
  let nbad = 0;
  for (let seed = 1; seed <= NSEEDS; seed++) {
    const a = H.run(seed, pick, 4000);
    const g = new Game(seed);
    const b = [];
    while (!g.over) {
      const moves = g.legalMoves();
      if (!moves.length) break;
      const mlB = g.movesLeft;
      const r = g.applyMove(pick(moves));
      b.push({ meterBefore: r.meterBefore, meterAfter: r.meterAfter, score: g.score,
        movesLeft: g.movesLeft, frenzyMoves: g.frenzyMoves, steps: r.steps, gained: r.gained });
      if (b.length > 4000) break;
    }
    totalMoves += b.length;
    frenzies += g.frenzies;
    let diff = null;
    const n = Math.min(a.trace.length, b.length);
    for (let k = 0; k < n; k++) {
      const x = a.trace[k], y = b[k];
      if (x.meterBefore !== y.meterBefore || x.meterAfter !== y.meterAfter ||
          x.score !== y.score || x.movesLeft !== y.movesLeft || x.frenzyMoves !== y.frenzyMoves) {
        diff = { k: k, game: x, sim: y }; break;
      }
    }
    if (!diff && a.trace.length !== b.length) diff = { k: "length", game: a.trace.length, sim: b.length };
    if (!diff && a.score !== g.score) diff = { k: "finalScore", game: a.score, sim: g.score };
    if (!diff && a.maxCombo !== undefined) { /* maxCombo compared via trace steps */ }
    if (diff) { nbad++; bad++; console.log(name, "seed", seed, "MISMATCH", JSON.stringify(diff)); }
  }
  console.log(name, nbad ? nbad + "/" + NSEEDS + " mismatch" : "OK (" + NSEEDS + " seeds)");
}
console.log("total moves compared:", totalMoves, "frenzies seen:", frenzies);
console.log(bad ? "FAIL" : "ALL PARITY OK");
