// Headless checks for the spawn schedule. Plain Node, no dependencies.
// Lifts makeSchedule() straight out of the game between its markers so the
// sim can never drift from what ships.
//
//   node gdd/sim/unkle-lijahs-jetpack/sim.js [runs=1000]
//
// Exit code 1 if any acceptance band in PLAN.md is missed.
var fs = require("fs"), path = require("path");
var html = fs.readFileSync(path.join(__dirname, "../../../games/unkle-lijahs-jetpack/index.html"), "utf8");
var m = html.match(/\/\/ @schedule-begin([\s\S]*?)\/\/ @schedule-end/);
if (!m) { console.error("schedule markers not found"); process.exit(1); }
var makeSchedule = new Function(m[1] + "\nreturn makeSchedule;")();

// mulberry32, same shape as Arcade.seededRandom (any decent PRNG will do:
// the bands below are about distribution, not exact values).
function rng(seed) {
  var h = 1779033703 ^ seed.length;
  for (var i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  var a = h >>> 0;
  return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

var RUNS = Number(process.argv[2]) || 1000;
var COND = { ketchup: 1, mustard: 1, pickle: 1, onion: 1 };
var acts = [[0, 30], [30, 75], [75, 90]];
var tot = { items: [0, 0, 0], cond: [0, 0, 0], columns: 0, tightAct1: 0, kinds: {} };
for (var r = 0; r < RUNS; r++) {
  var sched = makeSchedule(rng("sim:" + r), {});
  var hadCol = false, prev = null;
  sched.forEach(function (e) {
    var a = e.t >= 75 ? 2 : e.t >= 30 ? 1 : 0;
    tot.items[a] += 1;
    if (COND[e.kind]) tot.cond[a] += 1;
    tot.kinds[e.kind] = (tot.kinds[e.kind] || 0) + 1;
    if (e.col) hadCol = true;
    if (prev && a === 0 && !e.col && !prev.col && e.t - prev.t < 0.12 && Math.abs(e.x - prev.x) < 0.05) tot.tightAct1 += 1;
    prev = e;
  });
  if (hadCol) tot.columns += 1;
}
// first-run shape
var first = makeSchedule(rng("first"), { firstRun: true });
var firstCond1 = first.filter(function (e) { return e.t < 30 && COND[e.kind]; }).length;
var firstCol = first.filter(function (e) { return e.col; });

function band(name, v, lo, hi) { var ok = v >= lo && v <= hi; console.log((ok ? "  ok  " : "  FAIL") + " " + name + " = " + (Math.round(v * 100) / 100) + "  [" + lo + ", " + hi + "]"); return ok; }
console.log("Unkle Lijah's Jetpack · schedule sim · " + RUNS + " runs\n");
var ok = true;
ok &= band("items per run, Act I", tot.items[0] / RUNS, 16, 30);
ok &= band("items per run, Act II", tot.items[1] / RUNS, 38, 70);
ok &= band("items per run, Act III", tot.items[2] / RUNS, 24, 48);
ok &= band("condiment share, Act I", tot.cond[0] / tot.items[0], 0.06, 0.18);
ok &= band("condiment share, Act II", tot.cond[1] / tot.items[1], 0.28, 0.44);
ok &= band("condiment share, Act III", tot.cond[2] / tot.items[2], 0.32, 0.48);
ok &= band("density ratio, Act III / Act II (per second)", (tot.items[2] / 15) / (tot.items[1] / 45), 1.6, 2.6);
ok &= band("runs with a clean column", tot.columns / RUNS, 0.05, 0.15);
ok &= band("Act I same-lane spawns within 120ms, per run", tot.tightAct1 / RUNS, 0, 0.5);
ok &= band("first run: condiments in Act I", firstCond1, 0, 0);
ok &= band("first run: clean column items before 15s", firstCol.filter(function (e) { return e.t < 15; }).length, 4, 4);
console.log("\nkind mix:", Object.keys(tot.kinds).sort().map(function (k) { return k + " " + (100 * tot.kinds[k] / (tot.items[0] + tot.items[1] + tot.items[2])).toFixed(1) + "%"; }).join(" · "));
process.exit(ok ? 0 : 1);
