"use strict";
var fs = require("fs"), DP = require("./dp.js");
// reuse sim internals by re-requiring pieces: copy minimal bits
var src = fs.readFileSync(__dirname + "/sim.js", "utf8").split("// ---- experiments")[0];
var m = {}; new Function("require", "module", "__dirname", src + "\nmodule.exports={rng:rng,playRun:playRun,POLICIES:POLICIES,humanPolicy:humanPolicy,pct:pct,mean:mean,summarise:summarise};")(require, m, __dirname);
var rng = m.exports.rng, playRun = m.exports.playRun, POLICIES = m.exports.POLICIES, humanPolicy = m.exports.humanPolicy, pct = m.exports.pct, mean = m.exports.mean;
var r = DP.makeRules({}), dp = DP.solve(r), out = {};

// A. nudge false positives: fraction of runs where the "New run" beg fires at any spin >= 15, given a best
(function () {
  var rand = rng(9), res = {};
  [0, 175, 291, 376].forEach(function (best) {
    var fires = 0, firesLate = 0, N = 5000, servedWhenFired = [];
    for (var i = 0; i < N; i++) {
      var f = humanPolicy(7, 0.25, rand), fired = false, firedLate = false;
      // instrument: wrap policy to check nudge condition before each spin
      var wrapped = function (s, rr) {
        if (s.t >= 15) { var have = s.served + s.bowl; var cond = have === 0 || (best > 0 && have < (best * s.t / 75) * 0.4); if (cond) { fired = true; if (s.t >= 40) firedLate = true; } }
        return f(s, rr);
      };
      // policy is only called when bowl>0; check nudge separately on all spins by also calling on bowl==0
      var e = playRun(r, function (s, rr) { var v = wrapped(s, rr); return v; }, rand);
      if (fired) { fires++; servedWhenFired.push(e.served); }
      if (firedLate) firesLate++;
    }
    res["best " + best] = { pFiresInRun: +(fires / N).toFixed(3), pFiresAfterSpin40: +(firesLate / N).toFixed(3), medianFinalServedWhenFired: servedWhenFired.length ? pct(servedWhenFired.sort(function (a, b) { return a - b; }), 0.5) : null };
  });
  out.nudge = res; out.nudgeNote = "policy hook only sees spins with bowl>0, so this undercounts slightly";
})();

// B. ladder candidates: tier rates for human7 / streak5 / optimal under alternative rungs
(function () {
  var rand = rng(21), pols = { streak5: POLICIES.streak5.f, human7: null, optimal: function (s) { return dp.serve(s.t, s.k, s.bowl); } };
  var ladders = { shipped: [100, 200, 300, 450], "A 80/160/240/330": [80, 160, 240, 330], "B 100/175/250/350": [100, 175, 250, 350], "C 60/120/200/300/420": [60, 120, 200, 300, 420] };
  var res = {}, dists = {};
  Object.keys(pols).forEach(function (p) {
    var served = [], servedAt40 = [], reach40 = { };
    for (var i = 0; i < 10000; i++) {
      var f = p === "human7" ? humanPolicy(7, 0.25, rand) : pols[p];
      var e = playRun(r, f, rand); served.push(e.served);
      // served + bowl at spin 40 approx from servedAt log
      var s40 = 0; e.servedAt.forEach(function (x) { if (x[0] <= 40) s40 += x[1]; }); servedAt40.push(s40);
    }
    served.sort(function (a, b) { return a - b; }); servedAt40.sort(function (a, b) { return a - b; });
    dists[p] = { p10: pct(served, .1), p25: pct(served, .25), p50: pct(served, .5), p75: pct(served, .75), p90: pct(served, .9), p95: pct(served, .95), p99: pct(served, .99), servedBySpin40Median: pct(servedAt40, .5) };
    res[p] = {};
    Object.keys(ladders).forEach(function (L) { res[p][L] = ladders[L].map(function (at) { return +(served.filter(function (x) { return x >= at; }).length / served.length).toFixed(3); }); });
  });
  out.ladder = { rates: res, dists: dists };
})();

// C. last-6 all-in: GDD sharp with and without it; DP behaviour at the end
(function () {
  var rand = rng(33), N = 20000;
  function sharp(allin) { return function (s) { if (allin && s.spinsLeft <= 6) return false; return s.bowl >= 40 || s.lastWin; }; }
  var a = [], b = [];
  for (var i = 0; i < N; i++) { a.push(playRun(r, sharp(true), rand).served); b.push(playRun(r, sharp(false), rand).served); }
  out.lastSix = { sharpWithAllIn: +mean(a).toFixed(1), sharpWithoutAllIn: +mean(b).toFixed(1) };
  var line = {};
  for (var left = 1; left <= 8; left++) { var t = 75 - left, kk = null; for (var k = 1; k <= t; k++) if (dp.serve(t, k, k * (k + 1) / 2)) { kk = k; break; } line[left] = kk; }
  out.dpServeStreakBySpinsLeftTail = line;
})();

// D. how much of the score is multipliers: rules with match x1 / jackpot x1+0
(function () {
  var r0 = DP.makeRules({ matchMult: 1, jackMult: 1, jackBonus: 0 }), dp0 = DP.solve(r0);
  var rand = rng(44), a = [], b = [];
  for (var i = 0; i < 10000; i++) { a.push(playRun(r0, humanPolicy(7, .25, rand), rand).served); b.push(playRun(r, humanPolicy(7, .25, rand), rand).served); }
  out.multipliers = { dpNoWins: +dp0.value.toFixed(1), dpShipped: +dp.value.toFixed(1), human7NoWins: +mean(a).toFixed(1), human7Shipped: +mean(b).toFixed(1) };
  // variance share: std with vs without
  function sd(x) { var mu = mean(x); return Math.sqrt(mean(x.map(function (v) { return (v - mu) * (v - mu); }))); }
  out.multipliers.sdNoWins = +sd(a).toFixed(1); out.multipliers.sdShipped = +sd(b).toFixed(1);
})();

// E. empty-bowl bunnies and "so close" near-misses at stake, human7
(function () {
  var rand = rng(55), s = m.exports.summarise((function () { var a = []; for (var i = 0; i < 10000; i++) a.push(playRun(r, humanPolicy(7, .25, rand), rand)); return a; })(), r);
  out.human7 = { emptyBunniesPerRun: s.emptyBunnies, bunniesPerRun: s.bunnies, nearMissPerRun: s.nearMiss, tensionPerRun: s.tension, tensionStaked20: s.tensionStaked20, tensionStaked40: s.tensionStaked40, matches: s.matches, jackpots: s.jackpots, serves: s.serves, minutes: s.minutes };
})();

// F. the "serve when bowl >= 6 x streak" heuristic vs optimal
(function () {
  var rand = rng(66), a = [], b = [], c = [];
  for (var i = 0; i < 20000; i++) {
    a.push(playRun(r, function (s) { return s.bowl >= 6 * s.k; }, rand).served);
    b.push(playRun(r, function (s) { return s.bowl >= 6 * s.k || s.lastWin && s.k >= 4; }, rand).served);
    c.push(playRun(r, function (s) { return s.k >= 8 || (s.lastWin && s.k >= 4); }, rand).served);
  }
  out.heuristics = { "bowl >= 6*streak": +mean(a).toFixed(1), "bowl>=6*streak or win at streak>=4": +mean(b).toFixed(1), "streak 8 or win at streak>=4": +mean(c).toFixed(1) };
})();

fs.writeFileSync(__dirname + "/results/s7-extras.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
