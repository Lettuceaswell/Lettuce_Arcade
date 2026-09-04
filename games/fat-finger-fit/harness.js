#!/usr/bin/env node
/* Fat Finger Fit — headless tuning harness. Node only, never loaded by the
 * page. Run: node games/fat-finger-fit/harness.js [runsPerCell]
 *
 * 1. Replays a noiseless 8-day run of a three-phase policy and prints the
 *    per-day numbers, to compare against gdd/fat-finger-fit.md §11.
 * 2. Random-restart hill climb over three-phase policies (days 1–2, 3–4,
 *    5–8; P,C,F,T each). Two objectives:
 *      "safe"   — win rate under finger noise (common random numbers).
 *                 This is the objective that reproduces the doc's §11
 *                 numbers: cut-then-build, win rates ~51/40/24/11.
 *      "greedy" — noiseless final score subject to winning. Shows the
 *                 ceiling (~1.7M) and how rarely that line actually wins.
 * 3. Win rates for each policy across player-imprecision tiers. */
"use strict";
(function () {
var FFF = require("./model.js");
var T = FFF.TUNE;
var RUNS = Number(process.argv[2]) || 3000;
// Any TUNE constant can be overridden from the environment for a sweep,
// e.g.  GAIN=40 E_CAP=0.7 node harness.js 500
Object.keys(T).forEach(function (k) { if (process.env[k] != null && typeof T[k] === "number") T[k] = Number(process.env[k]); });

function phaseFor(day) { return day <= 2 ? 0 : day <= 4 ? 1 : 2; }

// policy = [[P,C,F,T],[P,C,F,T],[P,C,F,T]]. jitter = σ (slider points) of the
// player's own aim error. rng=null means noiseless delivery.
function play(policy, rng, jitter) {
  var s = FFF.newRun();
  for (var day = 1; day <= T.DAYS; day++) {
    var set = policy[phaseFor(day)];
    var d = {};
    FFF.ORDER.forEach(function (k, i) {
      var v = set[i];
      if (jitter && rng) v = FFF.clamp(v + FFF.gaussian(rng) * jitter, 0, 100);
      d[k] = rng ? FFF.deliver(k, v, rng) : FFF.contribution(k, v);
    });
    FFF.resolveDay(s, d);
  }
  return { state: s, score: FFF.finalScore(s) };
}

function r1(x) { return (Math.round(x * 10) / 10).toFixed(1); }

function report(label, policy) {
  var r = play(policy, null, 0), s = r.state;
  console.log("\n== " + label + " (noiseless) ==");
  console.log("phase sliders P/C/F/T: " + policy.map(function (p) { return p.map(Math.round).join("/"); }).join("  |  "));
  console.log("day   net     lbs   muscle   gain   loss   dayPts");
  s.days.forEach(function (d) {
    console.log(String(d.day).padStart(3) + " " + r1(d.net).padStart(7) + " " + r1(d.lbs).padStart(6) +
      " " + r1(d.muscle).padStart(7) + " " + r1(d.gain).padStart(6) + " " + r1(d.loss).padStart(6) + " " + Math.round(d.dayPoints).toString().padStart(7));
  });
  var f = r.score;
  console.log("running " + Math.round(f.running) + "  ×BUILD " + f.build.toFixed(3) + "  ×PRECISION " + f.precision.toFixed(3) +
    "  FINAL " + Math.round(f.final) + " (" + FFF.fmt(f.final, true) + ")  won=" + f.won);
  return r;
}

// Greedy objective: noiseless final score, win first.
function greedyObjective(policy) {
  var r = play(policy, null, 0);
  var pen = Math.abs(r.state.lbs - 100) * 40000 + Math.max(0, T.WIN_MUSCLE - r.state.muscle) * 40000;
  return r.score.final - pen;
}
// Safe objective: win rate over SAFE_N noisy runs with the same random
// numbers every evaluation, tie-broken by mean final score.
var SAFE_N = 300;
function safeObjective(policy) {
  var rng = FFF.seeded(4242), wins = 0, sum = 0;
  for (var i = 0; i < SAFE_N; i++) { var r = play(policy, rng, 0); if (r.score.won) wins++; sum += r.score.final; }
  return wins / SAFE_N + sum / SAFE_N / 1e9;
}

function climb(rng, objective, restarts, minStep) {
  var best = null, bestV = -Infinity;
  for (var restart = 0; restart < restarts; restart++) {
    var pol = [0, 1, 2].map(function () { return [0, 1, 2, 3].map(function () { return rng() * 100; }); });
    var v = objective(pol), step = 25;
    while (step > minStep) {
      var improved = false;
      for (var ph = 0; ph < 3; ph++) for (var i = 0; i < 4; i++) for (var dir = -1; dir <= 1; dir += 2) {
        var old = pol[ph][i];
        pol[ph][i] = FFF.clamp(old + dir * step, 0, 100);
        var nv = objective(pol);
        if (nv > v) { v = nv; improved = true; } else pol[ph][i] = old;
      }
      if (!improved) step /= 2;
    }
    if (v > bestV) { bestV = v; best = pol.map(function (p) { return p.slice(); }); }
  }
  return best;
}

var TIERS = [["Perfect", 0], ["Good", 4], ["Okay", 8], ["Casual", 15]];
function winRate(policy, rng, jitter, runs) {
  var wins = 0;
  for (var i = 0; i < runs; i++) if (play(policy, rng, jitter).score.won) wins++;
  return wins / runs;
}
function winRates(policy, rng) {
  var tiers = TIERS;
  console.log("\n== win rates with finger noise σ=" + T.SIGMA + ", " + RUNS + " runs per tier ==");
  console.log("tier     aimσ   win%   medianFinal   lbsSwing");
  tiers.forEach(function (t) {
    var wins = 0, finals = [], swing = 0;
    for (var i = 0; i < RUNS; i++) {
      var r = play(policy, rng, t[1]);
      if (r.score.won) wins++;
      finals.push(r.score.final);
      var lo = Math.min.apply(null, r.state.lbsHistory), hi = Math.max.apply(null, r.state.lbsHistory);
      swing += hi - lo;
    }
    finals.sort(function (a, b) { return a - b; });
    console.log(t[0].padEnd(8) + String(t[1]).padStart(5) + "  " + (100 * wins / RUNS).toFixed(1).padStart(5) +
      "  " + FFF.fmt(finals[RUNS >> 1]).padStart(12) + "  " + r1(swing / RUNS).padStart(9));
  });
}

module.exports = { play: play, climb: climb, winRate: winRate, TIERS: TIERS,
                   safeObjective: safeObjective, greedyObjective: greedyObjective };
if (require.main !== module) return;

var rng = FFF.seeded(1234);

var safe = climb(rng, safeObjective, 6, 1);
report("SAFE line — optimised for win rate under noise (the doc's §11 objective)", safe);
winRates(safe, rng);

var greedy = climb(rng, greedyObjective, 40, 0.05);
report("GREEDY line — optimised for noiseless score", greedy);
winRates(greedy, rng);

// Sanity on the formatter.
console.log("\nfmt: " + [100, 1430, 12400, 956000, 1430000].map(function (n) { return FFF.fmt(n); }).join("  ") + "  endCard 1.2M → " + FFF.fmt(1.2e6, true));
})();
