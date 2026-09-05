// Lettuce Slots Run-mode simulator: engine, policies, experiments.
// node sim.js            -> runs the whole battery, writes results/*.json
"use strict";
var fs = require("fs"), path = require("path");
var DP = require("./dp.js");

// ---- PRNG (mulberry32) --------------------------------------------------
function rng(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- timing (from the tick schedules in index.html) -----------------------
var T_NORMAL = 1.8, T_TENSION = 3.1, T_LEAF = 3.9, T_HUMAN = 0.7; // seconds; human = look + decide + tap

// ---- engine -------------------------------------------------------------
// policy(state) -> true to serve before this spin. state is read-only.
function playRun(r, policy, rand) {
  var S = r.spins, cap = r.cap;
  var st = { t: 0, k: 0, bowl: 0, served: 0, spinsLeft: S, lastWin: false, lastBust: false, sinceServe: 99 };
  var ev = { serves: 0, bunnies: 0, emptyBunnies: 0, eaten: [], biggest: 0, matches: 0, jackpots: 0,
    tension: 0, tensionStaked20: 0, tensionStaked40: 0, nearMiss: 0, seconds: 0, hist: [],
    servedAt: [], rungs: [], maxEaten: 0, winSizes: [] };
  var nsym = r.nsym;
  for (var t = 0; t < S; t++) {
    st.t = t; st.spinsLeft = S - t;
    if (st.bowl > 0 && policy(st, r)) {
      st.served += st.bowl; ev.serves++; ev.servedAt.push([t, st.bowl]);
      ev.hist.push("s");
      st.bowl = 0; st.k = 0; st.sinceServe = 0;
    }
    var r1 = Math.floor(rand() * nsym), r2 = Math.floor(rand() * nsym);
    var u = rand();
    var bp = (r.sleep > 0 && st.sinceServe < r.sleep) ? 0 : r.bunnyP;
    var bust = u < bp;
    var r3 = bust ? -1 : Math.floor((u - bp) / (1 - bp) * nsym);
    var pair = r1 === r2;
    if (pair) {
      ev.tension++;
      if (st.bowl >= 20) ev.tensionStaked20++;
      if (st.bowl >= 40) ev.tensionStaked40++;
    }
    ev.seconds += T_HUMAN + (pair ? (r1 === 4 ? T_LEAF : T_TENSION) : T_NORMAL);
    st.lastWin = false; st.lastBust = false; st.sinceServe++;
    if (bust && st.bowl <= r.grace) {
      // grace: an empty (or tiny) bowl; nothing happens (the shipped game: streak resets too, but bowl≤0 means k=0 anyway)
      if (st.bowl === 0) ev.emptyBunnies++; else { /* grace variant: leave bowl */ }
      if (r.grace === 0) { st.k = 0; }
      ev.hist.push("b"); ev.bunnies++; st.lastBust = true;
    } else if (bust) {
      ev.bunnies++; ev.eaten.push(st.bowl); if (st.bowl > ev.maxEaten) ev.maxEaten = st.bowl;
      st.bowl = 0; st.k = 0; ev.hist.push("b"); st.lastBust = true;
    } else {
      st.k++;
      var before = st.bowl;
      st.bowl += DP.leafAdd(r, st.k);
      if (pair && r3 === r1) {
        if (r1 === 4) { st.bowl = Math.min(cap, st.bowl * r.jackMult + r.jackBonus); ev.jackpots++; ev.hist.push("j"); }
        else { st.bowl = Math.min(cap, Math.floor(st.bowl * r.matchMult)); ev.matches++; ev.hist.push("m"); }
        ev.winSizes.push(st.bowl - before);
        st.lastWin = true;
      } else {
        if (pair) ev.nearMiss++;
        ev.hist.push("l");
      }
      if (st.bowl > ev.biggest) ev.biggest = st.bowl;
    }
  }
  if (st.bowl > 0) { st.served += st.bowl; ev.serves++; ev.servedAt.push([S, st.bowl]); ev.hist.push("s"); ev.lastCall = st.bowl; }
  ev.served = st.served;
  return ev;
}

// ---- policies -------------------------------------------------------------
function streakRule(n) { return function (s) { return s.k >= n; }; }
function bowlRule(x) { return function (s) { return s.bowl >= x; }; }
var POLICIES = {
  timid:     { label: "Serve every spin", f: function () { return true; } },
  streak3:   { label: "Serve at streak 3", f: streakRule(3) },
  streak5:   { label: "Serve at streak 5", f: streakRule(5) },
  streak6win:{ label: "Streak 6 or after a win (GDD steady)", f: function (s) { return s.k >= 6 || s.lastWin; } },
  streak8:   { label: "Serve at streak 8", f: streakRule(8) },
  streak11:  { label: "Serve at streak 11 (DP threshold)", f: streakRule(11) },
  bowl40win: { label: "Bowl ≥ 40 or after a win, all-in last 6 (GDD sharp)", f: function (s) { if (s.spinsLeft <= 6) return false; return s.bowl >= 40 || s.lastWin; } },
  bowl66:    { label: "Serve at bowl ≥ 66", f: bowlRule(66) },
  winonly:   { label: "Serve only after a win (gambler)", f: function (s) { return s.lastWin; } },
  reckless:  { label: "Never serve", f: function () { return false; } },
  human7:    { label: "Human: streak 7 ± noise, 25% 'one more'", f: null },
  human5:    { label: "Human: streak 5 ± noise, 25% 'one more'", f: null },
  optimal:   { label: "Optimal (exact DP)", f: null }
};
function humanPolicy(n, oneMore, rand) {
  // threshold drawn per streak start; then a per-spin "one more" itch
  var thr = n;
  return function (s) {
    if (s.k === 0) { thr = Math.max(2, Math.round(n + (rand() * 2 - 1) * 2)); return false; }
    if (s.k < thr) return false;
    return rand() >= oneMore;
  };
}

// dynamic streak-N policies for S1
for (var n = 3; n <= 14; n++) if (!POLICIES["streak" + n]) POLICIES["streak" + n] = { label: "Serve at streak " + n, f: streakRule(n), extra: true };

// ---- stats helpers -------------------------------------------------------
function pct(sorted, p) { return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]; }
function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : 0; }
function summarise(runs, r) {
  var served = runs.map(function (e) { return e.served; }).sort(function (a, b) { return a - b; });
  var ladder = r.ladder || [100, 200, 300, 450];
  var tiers = ladder.map(function (at) { return runs.filter(function (e) { return e.served >= at; }).length / runs.length; });
  var eaten = [].concat.apply([], runs.map(function (e) { return e.eaten; })).sort(function (a, b) { return a - b; });
  var maxEaten = runs.map(function (e) { return e.maxEaten; }).sort(function (a, b) { return a - b; });
  return {
    n: runs.length,
    mean: +mean(served).toFixed(1), p10: pct(served, 0.1), p25: pct(served, 0.25), median: pct(served, 0.5), p75: pct(served, 0.75), p90: pct(served, 0.9), p99: pct(served, 0.99), max: served[served.length - 1],
    tierRate: tiers.map(function (x) { return +x.toFixed(3); }),
    bunnies: +mean(runs.map(function (e) { return e.bunnies; })).toFixed(1),
    emptyBunnies: +mean(runs.map(function (e) { return e.emptyBunnies; })).toFixed(1),
    eatenPerRun: +mean(runs.map(function (e) { return e.eaten.length; })).toFixed(2),
    eatenMedian: eaten.length ? pct(eaten, 0.5) : 0, eatenP90: eaten.length ? pct(eaten, 0.9) : 0,
    maxEatenMedian: pct(maxEaten, 0.5), maxEatenP90: pct(maxEaten, 0.9),
    biggest: +mean(runs.map(function (e) { return e.biggest; })).toFixed(1),
    serves: +mean(runs.map(function (e) { return e.serves; })).toFixed(1),
    matches: +mean(runs.map(function (e) { return e.matches; })).toFixed(2),
    jackpots: +mean(runs.map(function (e) { return e.jackpots; })).toFixed(3),
    tension: +mean(runs.map(function (e) { return e.tension; })).toFixed(1),
    tensionStaked20: +mean(runs.map(function (e) { return e.tensionStaked20; })).toFixed(2),
    tensionStaked40: +mean(runs.map(function (e) { return e.tensionStaked40; })).toFixed(2),
    nearMiss: +mean(runs.map(function (e) { return e.nearMiss; })).toFixed(1),
    minutes: +(mean(runs.map(function (e) { return e.seconds; })) / 60).toFixed(2),
    lastCallShare: +(mean(runs.map(function (e) { return e.lastCall || 0; })) / mean(served)).toFixed(3)
  };
}

function runPolicy(r, name, n, seed, dp) {
  var rand = rng(seed), runs = [];
  for (var i = 0; i < n; i++) {
    var f;
    if (name === "optimal") f = function (s) { return dp.serve(s.t, s.k, s.bowl); };
    else if (name === "human7") f = humanPolicy(7, 0.25, rand);
    else if (name === "human5") f = humanPolicy(5, 0.25, rand);
    else f = POLICIES[name].f;
    runs.push(playRun(r, f, rand));
  }
  return runs;
}

// ---- experiments ----------------------------------------------------------
var out = {};
function save(name, obj) { fs.writeFileSync(path.join(__dirname, "results", name + ".json"), JSON.stringify(obj, null, 1)); }

function battery(r, n, seed, names) {
  var dp = DP.solve(r);
  var res = { dpValue: +dp.value.toFixed(2), policies: {} };
  (names || Object.keys(POLICIES)).forEach(function (name, i) {
    var runs = runPolicy(r, name, n, seed + i * 7919, dp);
    res.policies[name] = summarise(runs, r);
    res.policies[name].label = POLICIES[name].label;
  });
  return res;
}

// S1: DP thresholds
(function () {
  var r = DP.makeRules({}), dp = DP.solve(r);
  var byLeft = {};
  for (var t = 0; t < r.spins; t++) {
    var kk = null;
    for (var k = 1; k <= t; k++) if (dp.serve(t, k, k * (k + 1) / 2)) { kk = k; break; }
    byLeft[r.spins - t] = kk;
  }
  // after a match at streak k (bowl doubled): serve?
  var afterMatch = {};
  for (var k = 1; k <= 12; k++) afterMatch[k] = dp.serve(30, k, k * (k + 1));
  // bowl threshold at fixed streak, mid-run: smallest B at which serve is optimal
  var bowlThr = {};
  for (var k = 1; k <= 14; k++) { var B = 0; while (B < 4000 && !dp.serve(30, k, B)) B++; bowlThr[k] = B; }
  // EV cost of fixed streak rules
  var rules = {};
  for (var n = 3; n <= 14; n++) rules[n] = +mean(runPolicy(r, "streak" + n, 20000, 11, dp).map(function (e) { return e.served; })).toFixed(1);
  out.s1 = { optimalEV: +dp.value.toFixed(2), serveStreakBySpinsLeft: byLeft, serveAfterMatchAtStreak: afterMatch, bowlThresholdAtStreak: bowlThr, fixedStreakRuleEV: rules };
  save("s1-dp", out.s1);
  console.log("S1 done: optimal", dp.value.toFixed(1), "streak-rule EVs", JSON.stringify(rules));
})();

// S2: policy MC on shipped rules
(function () {
  var r = DP.makeRules({});
  var names = Object.keys(POLICIES).filter(function (k) { return !POLICIES[k].extra; });
  out.s2 = battery(r, 20000, 1, names);
  save("s2-policies", out.s2);
  console.log("S2 done");
})();

// S3: record chase
(function () {
  var r = DP.makeRules({}), dp = DP.solve(r);
  var res = {};
  ["timid", "streak5", "human7", "streak11", "optimal", "winonly"].forEach(function (name, pi) {
    var players = 2000, R = 40, rand = rng(101 + pi);
    var newBest = new Array(R).fill(0), bestAfter10 = [], bestAfter40 = [], typical = [], shortBy = [];
    for (var p = 0; p < players; p++) {
      var best = 0, f;
      for (var i = 0; i < R; i++) {
        if (name === "optimal") f = function (s) { return dp.serve(s.t, s.k, s.bowl); };
        else if (name === "human7") f = humanPolicy(7, 0.25, rand);
        else f = POLICIES[name].f;
        var e = playRun(r, f, rand);
        if (e.served > best) { best = e.served; newBest[i]++; }
        else if (i >= 10) shortBy.push(best - e.served);
        if (i === 9) bestAfter10.push(best);
        if (i >= 20) typical.push(e.served);
      }
      bestAfter40.push(best);
    }
    shortBy.sort(function (a, b) { return a - b; }); bestAfter10.sort(function (a, b) { return a - b; }); bestAfter40.sort(function (a, b) { return a - b; });
    res[name] = {
      pNewBestByRun: newBest.map(function (c) { return +(c / players).toFixed(3); }),
      expectedBestsRuns1to10: +(newBest.slice(0, 10).reduce(function (a, b) { return a + b; }, 0) / players).toFixed(2),
      expectedBestsRuns11to40: +(newBest.slice(10).reduce(function (a, b) { return a + b; }, 0) / players).toFixed(2),
      bestAfter10Median: pct(bestAfter10, 0.5), bestAfter40Median: pct(bestAfter40, 0.5),
      typicalRunMedian: pct(typical.sort(function (a, b) { return a - b; }), 0.5),
      shortOfBestMedian: pct(shortBy, 0.5)
    };
  });
  out.s3 = res; save("s3-record-chase", res);
  console.log("S3 done");
})();

// S4: event cadence for a human-ish player: per-run event list with timestamps
(function () {
  var r = DP.makeRules({}), rand = rng(77), N = 5000;
  var gaps20 = [], gaps40 = [], bigBust = 0, bustsOver20 = [], firstStaked = [], quietStretch = [];
  var perRun = { staked20: [], staked40: [], moments: [] };
  for (var i = 0; i < N; i++) {
    // replay with a timeline: instrument by wrapping policy to log seconds
    var f = humanPolicy(7, 0.25, rand);
    var e = playRun(r, f, rand);
    perRun.staked20.push(e.tensionStaked20); perRun.staked40.push(e.tensionStaked40);
    var moments = e.tensionStaked20 + e.matches + e.jackpots + e.eaten.filter(function (x) { return x >= 20; }).length;
    perRun.moments.push(moments);
    bustsOver20.push(e.eaten.filter(function (x) { return x >= 20; }).length);
  }
  function s(a) { a = a.slice().sort(function (x, y) { return x - y; }); return { mean: +mean(a).toFixed(2), p10: pct(a, 0.1), median: pct(a, 0.5), p90: pct(a, 0.9), zero: +(a.filter(function (x) { return x === 0; }).length / a.length).toFixed(3) }; }
  out.s4 = { stakedTension20PerRun: s(perRun.staked20), stakedTension40PerRun: s(perRun.staked40), bigBusts20PerRun: s(bustsOver20), momentsPerRun: s(perRun.moments),
    note: "moments = staked tensions (bowl≥20) + matches + jackpots + busts eating ≥20; a run is ~3.4 min" };
  save("s4-cadence", out.s4);
  console.log("S4 done");
})();

// S5: sweeps
(function () {
  var variants = {
    "shipped":            {},
    "bunny 1/7":          { strip3: 7 },
    "bunny 1/8":          { strip3: 8 },
    "bunny 1/5":          { strip3: 5 },
    "50 spins":           { spins: 50 },
    "100 spins":          { spins: 100 },
    "match x3":           { matchMult: 3 },
    "match x2.5":         { matchMult: 2.5 },
    "jackpot x4+50":      { jackMult: 4 },
    "jackpot x3+100":     { jackBonus: 100 },
    "bunny sleeps 2 after serve": { sleep: 2 },
    "bunny sleeps 3 after serve": { sleep: 3 },
    "grace: bowl<=3 safe": { grace: 3 },
    "growth 2k":          { growth: "tri2" },
    "growth flat +1":     { growth: "flat" }
  };
  var names = ["timid", "streak5", "human5", "human7", "streak11", "optimal", "winonly", "reckless"];
  var res = {};
  Object.keys(variants).forEach(function (v, vi) {
    var r = DP.makeRules(variants[v]);
    var b = battery(r, 8000, 500 + vi * 13, names);
    var o = b.policies.optimal, h = b.policies.human7, t = b.policies.timid;
    res[v] = {
      rules: variants[v], dpValue: b.dpValue,
      skillSpread: +(o.mean / t.mean).toFixed(2), optimalOverHuman: +(o.mean / h.mean).toFixed(2),
      tailRatio: +(o.p99 / o.median).toFixed(2),
      policies: b.policies
    };
    console.log("S5", v, "dp", b.dpValue, "human7", h.mean, "timid", t.mean, "spread", res[v].skillSpread, "tail", res[v].tailRatio);
  });
  out.s5 = res; save("s5-sweeps", res);
})();

// S6: Spin mode droughts (analytic geometric + points/min)
(function () {
  var pJ = 1 / 125, pM = 4 / 125;
  function q(p, x) { return Math.ceil(Math.log(1 - x) / Math.log(1 - p)); }
  var secPerSpin = 0.8 * (T_NORMAL + T_HUMAN) + 0.2 * (T_TENSION + T_HUMAN);
  out.s6 = {
    secondsPerSpin: +secPerSpin.toFixed(2),
    jackpotDrought: { median: q(pJ, 0.5), p90: q(pJ, 0.9), p99: q(pJ, 0.99), pNoneIn100: +Math.pow(1 - pJ, 100).toFixed(3), pNoneIn300: +Math.pow(1 - pJ, 300).toFixed(3) },
    matchDrought: { median: q(pM, 0.5), p90: q(pM, 0.9), p99: q(pM, 0.99) },
    anyWinDrought: { median: q(pJ + pM, 0.5), p90: q(pJ + pM, 0.9) },
    pointsPerSpin: +(1 + 50 * pM + 500 * pJ).toFixed(2),
    pointsPerMinute: +((1 + 50 * pM + 500 * pJ) * 60 / secPerSpin).toFixed(1),
    minutesPerJackpotMedian: +(q(pJ, 0.5) * secPerSpin / 60).toFixed(1),
    minutesPerJackpotP90: +(q(pJ, 0.9) * secPerSpin / 60).toFixed(1)
  };
  save("s6-spin-mode", out.s6);
  console.log("S6 done", JSON.stringify(out.s6));
})();
