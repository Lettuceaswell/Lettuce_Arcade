// Holey Cheese — the runner. `node sim.js [section ...]`
//
//   node sim.js gen      generator reach + hole-count ceiling
//   node sim.js sweep    generator x hole count x tap count, all bots
//   node sim.js deep     full distributions / cascades / degeneracy at finalists
//   node sim.js beam     beam-vs-exact validation, and N=7
//   node sim.js filter   what rejecting bad boards at generation time buys
//   node sim.js final    the recommended generator + filter, at N = 4, 5, 6
//   node sim.js all      everything (default)
//
// Writes results/<section>.json and prints the tables that go into FINDINGS.md.
"use strict";

const fs = require("fs");
const path = require("path");
const E = require("./engine.js");
const B = require("./bots.js");

const OUT = path.join(__dirname, "results");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
function save(name, data) {
  fs.writeFileSync(path.join(OUT, name + ".json"), JSON.stringify(data, null, 1));
}

// --- stats helpers ----------------------------------------------------------

function q(sorted, p) { return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]; }
function stats(a) {
  if (!a.length) return { n: 0 };
  const s = a.slice().sort((x, y) => x - y);
  const n = s.length;
  const mean = s.reduce((t, x) => t + x, 0) / n;
  const sd = Math.sqrt(s.reduce((t, x) => t + (x - mean) * (x - mean), 0) / n);
  return {
    n, mean, sd, min: s[0], p10: q(s, 0.1), p25: q(s, 0.25), med: q(s, 0.5),
    p75: q(s, 0.75), p90: q(s, 0.9), max: s[n - 1],
    zero: s.filter((x) => x === 0).length / n,
  };
}
function pct(x) { return (x * 100).toFixed(1); }
function f1(x) { return x === undefined ? "  -" : x.toFixed(1); }
function pad(x, w) { return String(x).padStart(w); }

// --- shared play harness ----------------------------------------------------

const BOTS = {
  random: B.bots.random,
  casual: B.bots.casual,
  cautious: B.bots.cautious,
  human: B.bots.human,
  safeFirst: B.bots.safeFirst,
  greedy: B.bots.greedy,
  look2: B.makeLookahead(2),
  look3: B.makeLookahead(3),
};

function playAll(rows, taps, rng, which) {
  const out = {};
  which.forEach((name) => {
    if (name === "exact") out.exact = B.playExact(rows, taps, rng, 1);
    else if (name === "worst") out.worst = B.playExact(rows, taps, rng, -1);
    else out[name] = B.playBot(rows, taps, BOTS[name], rng);
  });
  return out;
}

// ===========================================================================
// 1. Generator reach
// ===========================================================================

function sectionGen() {
  console.log("\n=== 1. GENERATOR REACH ===\n");
  const variants = Object.keys(E.GENERATORS);
  const data = { maximal: {}, reachOnce: {}, reachRetry: {} };

  console.log("Maximal stable hole set each generator finds in one pass (4,000 boards):");
  console.log("gen      mean  min  p10  med  p90  max");
  variants.forEach((v) => {
    const rng = E.mulberry32(11);
    const hs = [];
    for (let i = 0; i < 4000; i++) hs.push(E.GENERATORS[v](rng, 49).holes);
    const st = stats(hs);
    data.maximal[v] = st;
    console.log(v.padEnd(8), f1(st.mean).padStart(5), pad(st.min, 4), pad(st.p10, 4),
      pad(st.med, 4), pad(st.p90, 4), pad(st.max, 4));
  });

  console.log("\nP(exactly T holes) — single attempt / with up to 40 retries, %:");
  let hdr = "gen     ";
  for (let t = 6; t <= 20; t++) hdr += pad(t, 7);
  console.log(hdr);
  variants.forEach((v) => {
    let l1 = (v + " 1x").padEnd(8), l2 = (v + " 40x").padEnd(8);
    data.reachOnce[v] = {}; data.reachRetry[v] = {};
    for (let t = 6; t <= 20; t++) {
      const rng = E.mulberry32(5);
      let hit = 0, hit2 = 0, n = 500;
      for (let i = 0; i < n; i++) {
        if (E.GENERATORS[v](rng, t).holes === t) hit++;
        if (E.generateExact(rng, v, t, 40)) hit2++;
      }
      data.reachOnce[v][t] = hit / n; data.reachRetry[v][t] = hit2 / n;
      l1 += pad((hit / n * 100).toFixed(0), 7);
      l2 += pad((hit2 / n * 100).toFixed(0), 7);
    }
    console.log(l1); console.log(l2);
  });
  save("gen", data);
  return data;
}

// ===========================================================================
// 2. Main sweep
// ===========================================================================

const SWEEP_VARIANTS = ["scatter", "grow50", "grow75", "cracks", "minSep"];
const SWEEP_HOLES = [7, 8, 9, 10, 11, 12, 13];
const SWEEP_TAPS = [4, 5, 6];

function sectionSweep(boards) {
  const T = boards || 600;
  console.log("\n=== 2. SWEEP: generator x holes x taps (" + T + " boards each) ===\n");
  const rowsOut = [];
  console.log("gen       H  N | exact  sd  p10  med  p90   %0 | look2 | greedy  %0 | safe | casual | random  %0 | worst med | gap G->E");
  SWEEP_VARIANTS.forEach((v) => {
    SWEEP_HOLES.forEach((H) => {
      SWEEP_TAPS.forEach((N) => {
        const rng = E.mulberry32(90210 + H * 31 + N);
        const acc = {};
        const names = ["exact", "worst", "look2", "greedy", "safeFirst", "casual", "random"];
        names.forEach((n) => { acc[n] = []; });
        let made = 0;
        for (let i = 0; i < T; i++) {
          const b = E.generateExact(rng, v, H, 60);
          if (!b) continue;
          made++;
          const bits = E.toBits(b);
          const res = playAll(bits, N, rng, names);
          names.forEach((n) => acc[n].push(res[n].score));
        }
        if (made < T * 0.5) {
          console.log(v.padEnd(8), pad(H, 2), pad(N, 2), "| unreachable (" + made + "/" + T + ")");
          return;
        }
        const st = {};
        names.forEach((n) => { st[n] = stats(acc[n]); });
        rowsOut.push({ variant: v, holes: H, taps: N, boards: made, stats: st });
        console.log(v.padEnd(8), pad(H, 2), pad(N, 2), "|",
          pad(f1(st.exact.mean), 5), pad(f1(st.exact.sd), 4), pad(st.exact.p10, 4),
          pad(st.exact.med, 4), pad(st.exact.p90, 4), pad(pct(st.exact.zero), 5), "|",
          pad(f1(st.look2.mean), 5), "|",
          pad(f1(st.greedy.mean), 6), pad(pct(st.greedy.zero), 4), "|",
          pad(f1(st.safeFirst.mean), 4), "|",
          pad(f1(st.casual.mean), 6), "|",
          pad(f1(st.random.mean), 6), pad(pct(st.random.zero), 5), "|",
          pad(st.worst.med, 9), "|",
          pad(f1(st.exact.mean - st.greedy.mean), 8));
      });
    });
  });
  save("sweep", rowsOut);
  return rowsOut;
}

// ===========================================================================
// 3. Deep dive on the finalists
// ===========================================================================

const FINALISTS = [
  { variant: "grow75", holes: 9, taps: 5 },
  { variant: "grow75", holes: 10, taps: 5 },
  { variant: "grow75", holes: 10, taps: 6 },
  { variant: "grow75", holes: 11, taps: 5 },
  { variant: "cracks", holes: 11, taps: 5 },
  { variant: "scatter", holes: 9, taps: 5 },
];

function degeneracy(bits, taps, res) {
  // A board is "flat" when nothing the player can do sets off a cascade at any
  // point of an optimal run, "doomed" when even optimal play scores 0, and
  // "one-tap death" when some single opening tap alone wipes the wheel.
  const succ = B.successors(bits);
  const inertOpeners = succ.filter((s) => s.gens === 0).length;
  const oneTapDeath = succ.filter((s) => E.bitLargest(s.rows) === 0).length;
  const oneTapNearDeath = succ.filter((s) => E.bitLargest(s.rows) <= 7).length;
  const optGens = res.exact.gensPerTap;
  return {
    inertOpeners,
    openers: succ.length,
    oneTapDeath,
    oneTapNearDeath,
    doomed: res.exact.score === 0,
    flatRun: optGens.every((g) => g === 0),
    spread: res.exact.score - res.worst.score,
    maxGenOpt: optGens.length ? Math.max.apply(null, optGens) : 0,
  };
}

function sectionDeep(boards) {
  const T = boards || 3000;
  console.log("\n=== 3. DEEP DIVE (" + T + " boards each) ===\n");
  const all = [];
  FINALISTS.forEach((cfg) => {
    const { variant, holes: H, taps: N } = cfg;
    const rng = E.mulberry32(777 + H * 13 + N);
    const names = ["exact", "worst", "look3", "look2", "greedy", "safeFirst", "human", "cautious", "casual", "random"];
    const acc = {}; names.forEach((n) => { acc[n] = []; });
    const gensByTap = []; for (let k = 0; k < N; k++) gensByTap.push([]);
    const gensByTapGreedy = []; for (let k = 0; k < N; k++) gensByTapGreedy.push([]);
    const gensByTapCasual = []; for (let k = 0; k < N; k++) gensByTapCasual.push([]);
    let deepRunOpt = 0, deepRunGreedy = 0, deepRunCasual = 0;
    let flatRunOpt = 0, flatRunGreedy = 0, flatRunCasual = 0;
    let doomed = 0, oneTapDeathBoards = 0, earlyExitOpt = 0, earlyExitCasual = 0, earlyExitRandom = 0;
    let inertOpeners = [], spreads = [], intact = [], made = 0;
    const optHist = {}, greedyHist = {}, casualHist = {}, look3Hist = {};

    for (let i = 0; i < T; i++) {
      const b = E.generateExact(rng, variant, H, 60);
      if (!b) continue;
      made++;
      const bits = E.toBits(b);
      const res = playAll(bits, N, rng, names);
      names.forEach((n) => acc[n].push(res[n].score));
      const d = degeneracy(bits, N, res);
      if (d.doomed) doomed++;
      if (d.oneTapDeath > 0) oneTapDeathBoards++;
      inertOpeners.push(d.inertOpeners);
      spreads.push(d.spread);
      intact.push(res.exact.score / (49 - H));
      optHist[res.exact.score] = (optHist[res.exact.score] || 0) + 1;
      greedyHist[res.greedy.score] = (greedyHist[res.greedy.score] || 0) + 1;
      casualHist[res.casual.score] = (casualHist[res.casual.score] || 0) + 1;
      look3Hist[res.look3.score] = (look3Hist[res.look3.score] || 0) + 1;

      res.exact.gensPerTap.forEach((g, k) => gensByTap[k].push(g));
      res.greedy.gensPerTap.forEach((g, k) => gensByTapGreedy[k].push(g));
      res.casual.gensPerTap.forEach((g, k) => gensByTapCasual[k].push(g));
      const mx = (r) => (r.gensPerTap.length ? Math.max.apply(null, r.gensPerTap) : 0);
      if (mx(res.exact) >= 4) deepRunOpt++;
      if (mx(res.greedy) >= 4) deepRunGreedy++;
      if (mx(res.casual) >= 4) deepRunCasual++;
      if (res.exact.gensPerTap.every((g) => g === 0)) flatRunOpt++;
      if (res.greedy.gensPerTap.every((g) => g === 0)) flatRunGreedy++;
      if (res.casual.gensPerTap.every((g) => g === 0)) flatRunCasual++;
      if (res.exact.endedEarly) earlyExitOpt++;
      if (res.casual.endedEarly) earlyExitCasual++;
      if (res.random.endedEarly) earlyExitRandom++;
    }

    const st = {}; names.forEach((n) => { st[n] = stats(acc[n]); });
    const rec = {
      variant, holes: H, taps: N, boards: made, stats: st,
      doomedRate: doomed / made, oneTapDeathRate: oneTapDeathBoards / made,
      inertOpeners: stats(inertOpeners), spread: stats(spreads),
      intactMean: intact.reduce((t, x) => t + x, 0) / made,
      gensByTap: gensByTap.map(stats),
      gensByTapGreedy: gensByTapGreedy.map(stats),
      gensByTapCasual: gensByTapCasual.map(stats),
      deepRun: { exact: deepRunOpt / made, greedy: deepRunGreedy / made, casual: deepRunCasual / made },
      flatRun: { exact: flatRunOpt / made, greedy: flatRunGreedy / made, casual: flatRunCasual / made },
      earlyExit: { exact: earlyExitOpt / made, casual: earlyExitCasual / made, random: earlyExitRandom / made },
      hist: { exact: optHist, look3: look3Hist, greedy: greedyHist, casual: casualHist },
    };
    all.push(rec);

    console.log("--- " + variant + " H=" + H + " N=" + N + " (" + made + " boards) ---");
    console.log("bot        mean    sd   min   p10   med   p90   max    %0");
    names.forEach((n) => {
      const s = st[n];
      console.log(n.padEnd(10), pad(f1(s.mean), 5), pad(f1(s.sd), 5), pad(s.min, 5),
        pad(s.p10, 5), pad(s.med, 5), pad(s.p90, 5), pad(s.max, 5), pad(pct(s.zero), 5));
    });
    console.log("doomed (optimal scores 0): " + pct(rec.doomedRate) + "%   " +
      "boards with a one-tap wipeout available: " + pct(rec.oneTapDeathRate) + "%");
    console.log("inert opening taps: mean " + f1(rec.inertOpeners.mean) +
      " of " + (49 - H) + "   best-minus-worst play: mean " + f1(rec.spread.mean) +
      ", p10 " + rec.spread.p10);
    console.log("mean generations per tap  #1..#" + N + ":  optimal [" +
      rec.gensByTap.map((s) => f1(s.mean)).join(", ") + "]  greedy [" +
      rec.gensByTapGreedy.map((s) => f1(s.mean)).join(", ") + "]  casual [" +
      rec.gensByTapCasual.map((s) => f1(s.mean)).join(", ") + "]");
    console.log("runs with a 4+ generation cascade:  optimal " + pct(rec.deepRun.exact) +
      "%  greedy " + pct(rec.deepRun.greedy) + "%  casual " + pct(rec.deepRun.casual) + "%");
    console.log("runs where NOTHING ever fell:       optimal " + pct(rec.flatRun.exact) +
      "%  greedy " + pct(rec.flatRun.greedy) + "%  casual " + pct(rec.flatRun.casual) + "%");
    console.log("run ended early (wheel gone):       optimal " + pct(rec.earlyExit.exact) +
      "%  casual " + pct(rec.earlyExit.casual) + "%  random " + pct(rec.earlyExit.random) + "%");
    console.log("mean wheel-intact % under optimal play: " + pct(rec.intactMean) + "%\n");
  });
  save("deep", all);
  return all;
}

// ===========================================================================
// 4. Beam validation + N = 7
// ===========================================================================

function sectionBeam(boards) {
  const T = boards || 500;
  console.log("\n=== 4. BEAM vs EXACT, and N=7 ===\n");
  const out = [];
  [["grow75", 10, 5], ["grow75", 11, 5], ["cracks", 11, 5], ["grow75", 10, 6]].forEach(([v, H, N]) => {
    const rng = E.mulberry32(31 + H);
    let agree = 0, made = 0, beamSum = 0, exactSum = 0, worse = 0;
    for (let i = 0; i < T; i++) {
      const b = E.generateExact(rng, v, H, 60); if (!b) continue;
      made++;
      const bits = E.toBits(b);
      const ex = B.playExact(bits, N, rng, 1).score;
      const bm = B.beamBest(bits, N, 300).score;
      exactSum += ex; beamSum += bm;
      if (bm === ex) agree++; else if (bm < ex) worse++;
      if (bm > ex) throw new Error("beam beat exact — the solver is wrong");
    }
    out.push({ variant: v, holes: H, taps: N, boards: made, agree: agree / made, exactMean: exactSum / made, beamMean: beamSum / made });
    console.log(v + " H=" + H + " N=" + N + ": beam(300) matches exact on " +
      pct(agree / made) + "% of " + made + " boards (beam mean " + f1(beamSum / made) +
      " vs exact " + f1(exactSum / made) + ", never higher)");
  });

  console.log("\nN=7 via exact (affordable at these densities):");
  console.log("gen       H  N | exact mean  med   %0 | greedy | random");
  [["grow75", 9], ["grow75", 10], ["grow75", 11], ["cracks", 11]].forEach(([v, H]) => {
    const rng = E.mulberry32(600 + H);
    const ex = [], gr = [], rn = [];
    let made = 0;
    for (let i = 0; i < Math.min(T, 400); i++) {
      const b = E.generateExact(rng, v, H, 60); if (!b) continue;
      made++;
      const bits = E.toBits(b);
      ex.push(B.playExact(bits, 7, rng, 1).score);
      gr.push(B.playBot(bits, 7, B.bots.greedy, rng).score);
      rn.push(B.playBot(bits, 7, B.bots.random, rng).score);
    }
    const s = stats(ex);
    out.push({ variant: v, holes: H, taps: 7, boards: made, stats: { exact: s, greedy: stats(gr), random: stats(rn) } });
    console.log(v.padEnd(8), pad(H, 2), pad(7, 2), "|", pad(f1(s.mean), 10), pad(s.med, 5),
      pad(pct(s.zero), 5), "|", pad(f1(stats(gr).mean), 6), "|", pad(f1(stats(rn).mean), 6));
  });
  save("beam", out);
  return out;
}

// ===========================================================================
// 5. Board filters — what rejecting bad boards at generation time buys
// ===========================================================================

// A board passes a filter or it is thrown away and regenerated. `hasFreeRun`
// is the cheap half: is there a sequence of N taps that each set off nothing
// AND leave the cheese in one piece? If there is, the board's optimum is the
// trivial 49-H-N and the player has no decision worth making. (Any tap that
// cascades destroys an extra cell, so a non-inert line can never reach the
// trivial maximum — the test is exact, not a heuristic.)
function hasFreeRun(rows, taps) {
  const seen = new Set();
  function go(rs, left) {
    if (left === 0) return E.bitGroupSizes(rs).length <= 1;
    const key = E.bitKey(rs) * 8 + left;
    if (seen.has(key)) return false;
    seen.add(key);
    const succ = B.successors(rs);
    for (let i = 0; i < succ.length; i++) {
      if (succ[i].gens !== 0) continue;                    // inert taps only
      if (E.bitGroupSizes(succ[i].rows).length > 1) continue; // must stay whole
      if (go(succ[i].rows, left - 1)) return true;
    }
    return false;
  }
  return go(rows, taps);
}

// Is any line of play survivable at all? Cheaper than optimising: stop at the
// first leaf with cheese left.
function isSurvivable(rows, taps) {
  const seen = new Set();
  function go(rs, left) {
    if (left === 0) return E.bitLargest(rs) > 0;
    if (E.bitCheese(rs) < left) return E.bitLargest(rs) > 0;
    const key = E.bitKey(rs) * 8 + left;
    if (seen.has(key)) return false;
    seen.add(key);
    const succ = B.successors(rs);
    succ.sort((a, b) => b.score - a.score);
    for (let i = 0; i < succ.length; i++) {
      if (succ[i].score === 0) break;
      if (go(succ[i].rows, left - 1)) return true;
    }
    return false;
  }
  return go(rows, taps);
}

const FILTERS = {
  none: () => true,
  noOneTap: (bits, N, succ) => !succ.some((s) => E.bitLargest(s.rows) === 0),
  survivable: (bits, N) => isSurvivable(bits, N),
  live: (bits, N) => !hasFreeRun(bits, N),
  liveWheel: (bits, N) => !hasFreeRun(bits, N) && isSurvivable(bits, N),
};

function sectionFilter(boards) {
  const T = boards || 2000;
  console.log("\n=== 5. BOARD FILTERS (" + T + " boards generated per config) ===\n");
  console.log("Filters run at generation time: reject and reseed until the board passes.");
  console.log("  none        take the board as generated");
  console.log("  noOneTap    no single opening tap wipes the wheel      (cheap: 49 collapses)");
  console.log("  survivable  some line of play leaves cheese standing   (small search)");
  console.log("  live        NO run of N inert taps keeps the wheel whole, i.e. the");
  console.log("              trivial 49-H-N maximum is not on offer     (tiny search)");
  console.log("  liveWheel   live AND survivable");
  console.log("");
  const out = [];
  const cfgs = [];
  [["grow75", 10], ["grow75", 11], ["grow75", 12], ["cracks", 11], ["cracks", 12], ["cracks", 13], ["scatter", 9], ["scatter", 10]]
    .forEach(([v, H]) => cfgs.push([v, H, 5]));
  cfgs.forEach(([v, H, N]) => {
    const rng = E.mulberry32(5150 + H * 17 + N);
    const keys = Object.keys(FILTERS);
    const acc = {}; keys.forEach((k) => { acc[k] = { exact: [], greedy: [], safeFirst: [], casual: [], random: [], deepest: [], flat: 0, keep: 0 }; });
    let made = 0;
    for (let i = 0; i < T; i++) {
      const b = E.generateExact(rng, v, H, 60); if (!b) continue;
      made++;
      const bits = E.toBits(b);
      const succ = B.successors(bits);
      const ex = B.playExact(bits, N, rng, 1);
      const gr = B.playBot(bits, N, B.bots.greedy, rng);
      const sf = B.playBot(bits, N, B.bots.safeFirst, rng);
      const ca = B.playBot(bits, N, B.bots.casual, rng);
      const rd = B.playBot(bits, N, B.bots.random, rng);
      const deepest = ex.gensPerTap.length ? Math.max.apply(null, ex.gensPerTap) : 0;
      keys.forEach((k) => {
        if (!FILTERS[k](bits, N, succ)) return;
        const a = acc[k];
        a.keep++; a.exact.push(ex.score); a.greedy.push(gr.score); a.safeFirst.push(sf.score);
        a.casual.push(ca.score); a.random.push(rd.score); a.deepest.push(deepest);
        if (deepest === 0) a.flat++;
      });
    }
    console.log("--- " + v + " H=" + H + " N=" + N + " (" + made + " boards) ---");
    console.log("filter       keep%  |  exact mean   sd  p10  med  p90   %0 | greedy  %0 | safe | casual  %0 | random | E-G gap | deep cascade mean  %flat");
    keys.forEach((k) => {
      const a = acc[k];
      if (!a.exact.length) { console.log(k.padEnd(11), "  0.0%"); return; }
      const s1 = stats(a.exact), g = stats(a.greedy), sf = stats(a.safeFirst),
        c = stats(a.casual), r = stats(a.random), d = stats(a.deepest);
      out.push({ variant: v, holes: H, taps: N, filter: k, boards: made, keep: a.keep / made,
        exact: s1, greedy: g, safeFirst: sf, casual: c, random: r, deepest: d, flatRate: a.flat / a.keep });
      console.log(k.padEnd(11), pad(pct(a.keep / made), 6) + "%", "|",
        pad(f1(s1.mean), 10), pad(f1(s1.sd), 4), pad(s1.p10, 4), pad(s1.med, 4), pad(s1.p90, 4), pad(pct(s1.zero), 5), "|",
        pad(f1(g.mean), 6), pad(pct(g.zero), 4), "|", pad(f1(sf.mean), 4), "|",
        pad(f1(c.mean), 6), pad(pct(c.zero), 4), "|", pad(f1(r.mean), 6), "|",
        pad(f1(s1.mean - g.mean), 7), "|", pad(f1(d.mean), 12), pad(pct(a.flat / a.keep), 6));
    });
    console.log("");
  });
  save("filter", out);
  return out;
}

// ===========================================================================
// 6. Final candidate: the recommended generator + filter, at N = 4, 5, 6
// ===========================================================================

function sectionFinal(boards) {
  const T = boards || 2000;
  console.log("\n=== 6. FINAL CANDIDATE (" + T + " accepted boards per config) ===\n");
  const out = [];
  const filterName = process.env.FINAL_FILTER || "liveWheel";
  const filter = FILTERS[filterName];
  if (!filter) throw new Error("unknown filter " + filterName);
  const cfgs = (process.env.FINAL_CFGS || "grow75:11:4,grow75:11:5,grow75:11:6,grow75:12:5,cracks:12:5,grow75:10:5")
    .split(",").map((t) => { const p = t.split(":"); return [p[0], Number(p[1]), Number(p[2])]; });
  cfgs.forEach(([v, H, N]) => {
    const rng = E.mulberry32(8080 + H * 19 + N);
    const names = ["exact", "worst", "look3", "look2", "greedy", "safeFirst", "human", "cautious", "casual", "random"];
    const acc = {}; names.forEach((n) => { acc[n] = []; });
    const gensByTap = []; for (let k = 0; k < N; k++) gensByTap.push([]);
    const gensByTapGreedy = []; for (let k = 0; k < N; k++) gensByTapGreedy.push([]);
    const gensByTapCasual = []; for (let k = 0; k < N; k++) gensByTapCasual.push([]);
    const hist = {}; names.forEach((n) => { hist[n] = {}; });
    let attempts = 0, accepted = 0, deepOpt = 0, deepCasual = 0, flatOpt = 0, flatCasual = 0;
    let earlyOpt = 0, earlyCasual = 0, earlyRandom = 0, intact = [], spread = [], parGapCasual = [];
    while (accepted < T && attempts < T * 60) {
      attempts++;
      const b = E.generateExact(rng, v, H, 60); if (!b) continue;
      const bits = E.toBits(b);
      if (!filter(bits, N, B.successors(bits))) continue;
      accepted++;
      const res = playAll(bits, N, rng, names);
      names.forEach((n) => { acc[n].push(res[n].score); hist[n][res[n].score] = (hist[n][res[n].score] || 0) + 1; });
      res.exact.gensPerTap.forEach((g, k) => gensByTap[k].push(g));
      res.greedy.gensPerTap.forEach((g, k) => gensByTapGreedy[k].push(g));
      res.casual.gensPerTap.forEach((g, k) => gensByTapCasual[k].push(g));
      const mx = (r) => (r.gensPerTap.length ? Math.max.apply(null, r.gensPerTap) : 0);
      if (mx(res.exact) >= 4) deepOpt++;
      if (mx(res.casual) >= 4) deepCasual++;
      if (mx(res.exact) === 0) flatOpt++;
      if (mx(res.casual) === 0) flatCasual++;
      if (res.exact.endedEarly) earlyOpt++;
      if (res.casual.endedEarly) earlyCasual++;
      if (res.random.endedEarly) earlyRandom++;
      intact.push(res.exact.score / (49 - H));
      spread.push(res.exact.score - res.worst.score);
      parGapCasual.push(res.exact.score - res.casual.score);
    }
    const st = {}; names.forEach((n) => { st[n] = stats(acc[n]); });
    const rec = { variant: v, holes: H, taps: N, filter: filterName, attempts, accepted, acceptRate: accepted / attempts,
      stats: st, hist, gensByTap: gensByTap.map(stats), gensByTapGreedy: gensByTapGreedy.map(stats),
      gensByTapCasual: gensByTapCasual.map(stats),
      deepRun: { exact: deepOpt / accepted, casual: deepCasual / accepted },
      flatRun: { exact: flatOpt / accepted, casual: flatCasual / accepted },
      earlyExit: { exact: earlyOpt / accepted, casual: earlyCasual / accepted, random: earlyRandom / accepted },
      intact: stats(intact), spread: stats(spread), parGapCasual: stats(parGapCasual) };
    out.push(rec);

    console.log("--- " + v + " H=" + H + " N=" + N + " | " + filterName + " filter, accept rate " +
      pct(rec.acceptRate) + "% (" + (attempts / accepted).toFixed(1) + " boards tried per keeper) ---");
    console.log("bot        mean    sd   min   p10   p25   med   p75   p90   max    %0");
    names.forEach((n) => {
      const s = st[n];
      console.log(n.padEnd(10), pad(f1(s.mean), 5), pad(f1(s.sd), 5), pad(s.min, 5), pad(s.p10, 5),
        pad(s.p25, 5), pad(s.med, 5), pad(s.p75, 5), pad(s.p90, 5), pad(s.max, 5), pad(pct(s.zero), 5));
    });
    console.log("generations per tap #1..#" + N + ": optimal [" + rec.gensByTap.map((x) => f1(x.mean)).join(", ") +
      "]  greedy [" + rec.gensByTapGreedy.map((x) => f1(x.mean)).join(", ") +
      "]  casual [" + rec.gensByTapCasual.map((x) => f1(x.mean)).join(", ") + "]");
    console.log("4+ generation cascade somewhere in the run: optimal " + pct(rec.deepRun.exact) +
      "%  casual " + pct(rec.deepRun.casual) + "%");
    console.log("nothing ever fell all run:                 optimal " + pct(rec.flatRun.exact) +
      "%  casual " + pct(rec.flatRun.casual) + "%");
    console.log("run ended early (wheel gone):              optimal " + pct(rec.earlyExit.exact) +
      "%  casual " + pct(rec.earlyExit.casual) + "%  random " + pct(rec.earlyExit.random) + "%");
    console.log("wheel intact % (optimal): mean " + pct(rec.intact.mean) + "%   " +
      "best-minus-worst play: mean " + f1(rec.spread.mean) + "   par gap for casual: mean " +
      f1(rec.parGapCasual.mean) + "\n");
  });
  save("final-" + filterName, out);
  return out;
}

// ===========================================================================

const sections = process.argv.slice(2);
const want = (s) => sections.length === 0 || sections.includes("all") || sections.includes(s);
const t0 = Date.now();
if (want("gen")) sectionGen();
if (want("sweep")) sectionSweep(Number(process.env.SWEEP_BOARDS) || 600);
if (want("deep")) sectionDeep(Number(process.env.DEEP_BOARDS) || 3000);
if (want("beam")) sectionBeam(Number(process.env.BEAM_BOARDS) || 500);
if (want("filter")) sectionFilter(Number(process.env.FILTER_BOARDS) || 2000);
if (want("final")) sectionFinal(Number(process.env.FINAL_BOARDS) || 2000);
console.log("\ntotal " + ((Date.now() - t0) / 1000).toFixed(1) + "s");
