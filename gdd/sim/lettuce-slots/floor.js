// Sizing the match floor: match pays max(×2, +floor). node floor.js
var DP = require("./dp.js"), S = require("./sim.js");
function stats(runs) { var v = runs.map(function (r) { return r.served; }).sort(function (a, b) { return a - b; }); var m = v.reduce(function (a, b) { return a + b; }, 0) / v.length; var p = function (q) { return v[Math.floor(q * (v.length - 1))]; }; return { mean: +m.toFixed(1), p50: p(0.5), p90: p(0.9), garden: +(v.filter(function (x) { return x >= 100; }).length / v.length).toFixed(2), chef: +(v.filter(function (x) { return x >= 200; }).length / v.length).toFixed(2), feast: +(v.filter(function (x) { return x >= 300; }).length / v.length).toFixed(2) }; }
console.log("floor | optimal EV | human7 mean p50 p90 | ≥Garden ≥Chef ≥Feast | timid mean");
[0, 8, 10, 15].forEach(function (f) {
  var r = DP.makeRules({ matchFloor: f }), dp = DP.solve(r);
  var h = stats(S.runPolicy(r, "human7", 4000, 7, dp)), t = stats(S.runPolicy(r, "timid", 4000, 7, dp));
  console.log(String(f).padStart(5), "|", dp.value.toFixed(1).padStart(10), "|", h.mean, h.p50, h.p90, "|", h.garden, h.chef, h.feast, "|", t.mean);
});
