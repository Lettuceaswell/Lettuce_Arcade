// Holey Cheese — is the hole PERIMETER a better difficulty dial than the hole
// COUNT?  `node perimeter.js`
//
// Perimeter is the conserved quantity of r=2 bootstrap percolation (see
// engine.js holePerimeter): it never increases as the wheel collapses, and the
// fully-holed 7x7 sits at 28. A crack of L holes carries perimeter 2L+2; L
// scattered holes carry 4L. So two boards with the same hole count can be a
// long way apart in how much collapse they can support.
"use strict";

const fs = require("fs");
const path = require("path");
const E = require("./engine.js");
const B = require("./bots.js");

const OUT = path.join(__dirname, "results");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function stats(a) {
  const s = a.slice().sort((x, y) => x - y);
  const n = s.length;
  const mean = s.reduce((t, x) => t + x, 0) / n;
  const sd = Math.sqrt(s.reduce((t, x) => t + (x - mean) * (x - mean), 0) / n);
  return { n, mean, sd, p10: s[Math.floor(n * 0.1)], med: s[Math.floor(n * 0.5)],
    p90: s[Math.floor(n * 0.9)], zero: s.filter((x) => x === 0).length / n };
}
function corr(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((t, x) => t + x, 0) / n, my = ys.reduce((t, y) => t + y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) * (xs[i] - mx);
    syy += (ys[i] - my) * (ys[i] - my);
  }
  return sxy / Math.sqrt(sxx * syy);
}
const pct = (x) => (x * 100).toFixed(1);
const pad = (x, w) => String(x).padStart(w);

// --- A generator that targets a PERIMETER budget rather than a hole count.
// Grow clustered holes (strong adjacency bias, so each new hole usually adds
// only 2 perimeter) until the budget is met, never overshooting it.
function genPerimeter(rng, targetP) {
  const b = E.newBoard();
  let guard = 0;
  while (E.holePerimeter(b) < targetP && guard++ < 900) {
    let cand = -1;
    if (rng() < 0.7) {
      const edge = [];
      for (let i = 0; i < 49; i++) {
        if (b[i] !== E.CHEESE) continue;
        if (E.holeNeighbours(b, i) > 0) edge.push(i);
      }
      if (edge.length) cand = edge[Math.floor(rng() * edge.length)];
    }
    if (cand < 0) cand = Math.floor(rng() * 49);
    if (b[cand] === E.HOLE) continue;
    b[cand] = E.HOLE;
    if (!E.isStable(b) || E.holePerimeter(b) > targetP) { b[cand] = E.CHEESE; continue; }
  }
  return { board: b, perimeter: E.holePerimeter(b), holes: 49 - E.cheeseCount(b) };
}

const N = 5;
const TRIALS = Number(process.env.P_BOARDS) || 1200;
const out = {};

// -------------------------------------------------------------------------
console.log("\n=== A. Perimeter vs hole count as a predictor of the optimal score ===\n");
{
  const holes = [], perims = [], opts = [], greedies = [];
  const rng = E.mulberry32(20260914);
  const variants = ["scatter", "grow50", "grow75", "cracks"];
  for (let i = 0; i < TRIALS * 3; i++) {
    const v = variants[i % variants.length];
    const H = 7 + Math.floor(rng() * 7);      // 7..13
    const b = E.generateExact(rng, v, H, 60);
    if (!b) continue;
    const bits = E.toBits(b);
    holes.push(H);
    perims.push(E.holePerimeter(b));
    opts.push(B.playExact(bits, N, rng, 1).score);
    greedies.push(B.playBot(bits, N, B.bots.greedy, rng).score);
  }
  const rHoles = corr(holes, opts), rPerim = corr(perims, opts);
  console.log("boards: " + opts.length + " (all four generators, 7-13 holes, N=5)");
  console.log("correlation with the optimal score:   hole count r = " + rHoles.toFixed(3) +
    "   hole perimeter r = " + rPerim.toFixed(3));
  console.log("correlation with the greedy score:    hole count r = " + corr(holes, greedies).toFixed(3) +
    "   hole perimeter r = " + corr(perims, greedies).toFixed(3));
  out.predictors = { boards: opts.length, rHoles, rPerim,
    rHolesGreedy: corr(holes, greedies), rPerimGreedy: corr(perims, greedies) };

  // Optimal score sliced by perimeter, and by hole count, to show which slices
  // are homogeneous.
  console.log("\nby hole PERIMETER:");
  console.log("perim   n   optimal mean   sd  p10  med  p90   %0 | greedy mean");
  const byP = {};
  perims.forEach((p, i) => { (byP[p] = byP[p] || { o: [], g: [] }).o.push(opts[i]); byP[p].g.push(greedies[i]); });
  Object.keys(byP).map(Number).sort((a, b) => a - b).forEach((p) => {
    if (byP[p].o.length < 40) return;
    const s = stats(byP[p].o), g = stats(byP[p].g);
    console.log(pad(p, 5), pad(s.n, 5), pad(s.mean.toFixed(1), 12), pad(s.sd.toFixed(1), 5),
      pad(s.p10, 4), pad(s.med, 4), pad(s.p90, 4), pad(pct(s.zero), 5), "|", pad(g.mean.toFixed(1), 10));
  });
  console.log("\nby hole COUNT:");
  console.log("holes   n   optimal mean   sd  p10  med  p90   %0 | greedy mean");
  const byH = {};
  holes.forEach((h, i) => { (byH[h] = byH[h] || { o: [], g: [] }).o.push(opts[i]); byH[h].g.push(greedies[i]); });
  Object.keys(byH).map(Number).sort((a, b) => a - b).forEach((h) => {
    const s = stats(byH[h].o), g = stats(byH[h].g);
    console.log(pad(h, 5), pad(s.n, 5), pad(s.mean.toFixed(1), 12), pad(s.sd.toFixed(1), 5),
      pad(s.p10, 4), pad(s.med, 4), pad(s.p90, 4), pad(pct(s.zero), 5), "|", pad(g.mean.toFixed(1), 10));
  });
  out.byPerimeter = {}; Object.keys(byP).forEach((p) => { out.byPerimeter[p] = stats(byP[p].o); });
  out.byHoles = {}; Object.keys(byH).forEach((h) => { out.byHoles[h] = stats(byH[h].o); });
}

// -------------------------------------------------------------------------
console.log("\n=== B. A perimeter-targeted generator ===\n");
{
  console.log("perim   holes(mean)  optimal mean   sd  p10  med  p90   %0 | greedy  %0 | human | random | deepest cascade");
  out.perimGen = [];
  for (let P = 20; P <= 44; P += 2) {
    const rng = E.mulberry32(4000 + P);
    const opts = [], grd = [], hum = [], rnd = [], hs = [], deep = [];
    for (let i = 0; i < TRIALS; i++) {
      const g = genPerimeter(rng, P);
      if (g.perimeter !== P) continue;
      const bits = E.toBits(g.board);
      const ex = B.playExact(bits, N, rng, 1);
      opts.push(ex.score);
      deep.push(ex.gensPerTap.length ? Math.max.apply(null, ex.gensPerTap) : 0);
      grd.push(B.playBot(bits, N, B.bots.greedy, rng).score);
      hum.push(B.playBot(bits, N, B.bots.human, rng).score);
      rnd.push(B.playBot(bits, N, B.bots.random, rng).score);
      hs.push(g.holes);
    }
    if (opts.length < 50) { console.log(pad(P, 5), "  too few boards (" + opts.length + ")"); continue; }
    const s = stats(opts), g = stats(grd), h = stats(hum), r = stats(rnd), d = stats(deep);
    out.perimGen.push({ perimeter: P, n: s.n, holes: stats(hs), exact: s, greedy: g, human: h, random: r, deepest: d });
    console.log(pad(P, 5), pad(stats(hs).mean.toFixed(1), 11), pad(s.mean.toFixed(1), 12), pad(s.sd.toFixed(1), 5),
      pad(s.p10, 4), pad(s.med, 4), pad(s.p90, 4), pad(pct(s.zero), 5), "|",
      pad(g.mean.toFixed(1), 6), pad(pct(g.zero), 5), "|", pad(h.mean.toFixed(1), 5), "|",
      pad(r.mean.toFixed(1), 6), "|", pad(d.mean.toFixed(1), 8));
  }
}

// -------------------------------------------------------------------------
console.log("\n=== C. Which scores can the board actually show? ===\n");
{
  // Every surviving group is itself a stable region (selftest.js section 8), so
  // most integers are simply not reachable as a score. Collect the support.
  const seen = {};
  const rng = E.mulberry32(9090);
  let runs = 0;
  const bots = [B.bots.random, B.bots.human, B.bots.greedy, B.bots.safeFirst];
  for (let i = 0; i < TRIALS * 6; i++) {
    const H = 6 + Math.floor(rng() * 9);
    const v = ["scatter", "grow50", "grow75", "cracks"][i % 4];
    const b = E.generateExact(rng, v, H, 60);
    if (!b) continue;
    const bits = E.toBits(b);
    for (let k = 0; k < 4; k++) {
      const s = B.playBot(bits, N, bots[k], rng).score;
      seen[s] = (seen[s] || 0) + 1; runs++;
    }
    const s2 = B.playExact(bits, N, rng, 1).score;
    seen[s2] = (seen[s2] || 0) + 1; runs++;
  }
  const keys = Object.keys(seen).map(Number).sort((a, b) => a - b);
  console.log(runs + " scored runs. Scores that ever occurred: " + keys.join(", "));
  const missing = [];
  for (let k = 1; k <= keys[keys.length - 1]; k++) if (!seen[k]) missing.push(k);
  console.log("Never seen below the maximum: " + missing.join(", "));
  console.log("Share of runs scoring 0: " + pct(seen[0] / runs) + "%");
  out.support = { seen, missing, runs };
}

fs.writeFileSync(path.join(OUT, "perimeter.json"), JSON.stringify(out, null, 1));
console.log("\nwrote results/perimeter.json");
