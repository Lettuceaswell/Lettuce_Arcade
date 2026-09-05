const H = require("./harness.js");
const { Game, mulberry32 } = require("../engine.js");

// A chooser both sides replay identically: draw k = f(moveIndex) from a fixed
// stream, independent of the engine RNGs.
function chooserFactory() {
  const r = mulberry32(999);
  const draws = [];
  return function (moves, i) {
    while (draws.length <= i) draws.push(r());
    return moves[Math.floor(draws[i] * moves.length)];
  };
}

const NSEEDS = Number(process.argv[2] || 40);
let bad = 0;
for (let seed = 1; seed <= NSEEDS; seed++) {
  const a = H.run(seed, chooserFactory()).trace;
  const pick = chooserFactory();
  const g = new Game(seed);
  const b = [];
  let i = 0;
  while (!g.over) {
    const moves = g.legalMoves();
    if (!moves.length) break;
    const mv = pick(moves, i);
    const mlB = g.movesLeft;
    const r = g.applyMove(mv);
    b.push({ n: r.move, meterBefore: r.meterBefore, meterAfter: r.meterAfter,
      score: g.score, movesLeft: g.movesLeft, refund: g.movesLeft - (mlB - 1),
      frenzyMoves: g.frenzyMoves });
    i++;
  }
  let diff = null;
  const n = Math.min(a.length, b.length);
  for (let k = 0; k < n; k++) {
    const x = a[k], y = b[k];
    if (x.meterBefore !== y.meterBefore || x.meterAfter !== y.meterAfter ||
        x.score !== y.score || x.movesLeft !== y.movesLeft ||
        x.frenzyMoves !== y.frenzyMoves) { diff = { k: k, game: x, sim: y }; break; }
  }
  if (!diff && a.length !== b.length) diff = { k: "length", game: a.length, sim: b.length };
  if (diff) { bad++; console.log("seed", seed, "MISMATCH", JSON.stringify(diff)); }
  else if (seed <= 5 || seed % 10 === 0) console.log("seed", seed, "ok  moves", b.length, "score", g.score);
}
console.log(bad ? bad + " / " + NSEEDS + " seeds MISMATCH" : "ALL PARITY OK (" + NSEEDS + " seeds)");
