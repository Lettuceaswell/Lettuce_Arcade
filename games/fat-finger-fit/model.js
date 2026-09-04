/* Fat Finger Fit — the model. No DOM in here.
 * Loaded by index.html as a plain script (global FFF) and by harness.js
 * under Node (module.exports). Every number the game reasons with lives
 * in TUNE; the UI only draws. See gdd/fat-finger-fit.md §7, §10, §12, §17. */
(function (root) {
  "use strict";

  var TUNE = {
    DAYS: 8,
    MAINT: 1500,       BAR_MAX: 3000,
    KCAL_P: 6,         KCAL_C: 12,      KCAL_F: 12,
    BURN: 10,          LBS_K: 320,
    PROT_THRESHOLD: 55,
    GAIN: 88.2,        LOSS: 5.0,
    E_BASE: 0.10,      E_SLOPE: 750,    E_CAP: 1.7,
    STIM_EXP: 0.85,    ROOM_EXP: 0.6,
    SIGMA: 0.10,       WINDOW_SIGMAS: 2,
    WIN_LBS_TOL: 1.0,  WIN_MUSCLE: 99.5,
    SCORE_K: 11.52,    BUILD_MAX: 1.5,  PRECISION_MAX: 1.0,
    COLORS: { P: "#2E8B7A", C: "#E0A030", F: "#8A6BC1", T: "#3A3F4B" }
  };

  // Lock order is fixed. Each key maps to the kcal-per-slider-point weight.
  var ORDER = ["P", "C", "F", "T"];
  var WEIGHT = { P: TUNE.KCAL_P, C: TUNE.KCAL_C, F: TUNE.KCAL_F, T: TUNE.BURN };

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }

  // Box–Muller. `rng` is any function returning [0,1); defaults to Math.random.
  function gaussian(rng) {
    rng = rng || Math.random;
    var u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Nominal contribution of one slider to the bar (kcal, or burn for T).
  function contribution(key, value) { return WEIGHT[key] * value; }

  // ±2σ half-width of that lock's contribution. Derived from SIGMA only —
  // never hand-tune this (§16).
  function windowHalf(key, value) {
    return TUNE.WINDOW_SIGMAS * TUNE.SIGMA * contribution(key, value);
  }

  // Quadrature sum of the half-widths of the locks so far.
  function cumulativeHalf(halves) {
    var s = 0;
    for (var i = 0; i < halves.length; i++) s += halves[i] * halves[i];
    return Math.sqrt(s);
  }

  // What the fat finger actually delivered for one lock.
  function deliver(key, value, rng) {
    return contribution(key, value) * (1 + gaussian(rng) * TUNE.SIGMA);
  }

  function newRun() {
    return { day: 1, lbs: 100, muscle: 0, running: 0, lbsHistory: [100], days: [] };
  }

  // Resolve one day from four DELIVERED contributions. Mutates `state`.
  // Returns the day's derived numbers for display/logging.
  function resolveDay(state, d) {
    var net  = d.P + d.C + d.F - d.T - TUNE.MAINT;
    var p    = Math.min(1, (d.P / TUNE.KCAL_P) / TUNE.PROT_THRESHOLD);
    var stim = Math.pow(Math.max(0, d.T / TUNE.BURN / 100), TUNE.STIM_EXP);
    var e    = clamp(TUNE.E_BASE + net / TUNE.E_SLOPE, 0, TUNE.E_CAP);
    var room = Math.max(0, 1 - state.muscle / 100);

    var gain = TUNE.GAIN * stim * p * e * Math.pow(room, TUNE.ROOM_EXP);
    var loss = TUNE.LOSS * Math.max(0, -(net + 500) / TUNE.MAINT)
             * (1 - 0.5 * stim)
             * (1 - 0.6 * p);

    var dayPoints = TUNE.SCORE_K * d.T * (1 + state.muscle / 25) * (0.5 + 0.5 * p);

    state.muscle = clamp(state.muscle + gain - loss, 0, 100);
    state.lbs = state.lbs + net / TUNE.LBS_K;
    state.running += dayPoints;
    state.lbsHistory.push(state.lbs);

    var out = {
      day: state.day, net: net, p: p, stim: stim, e: e,
      gain: gain, loss: loss, dayPoints: dayPoints,
      lbs: state.lbs, muscle: state.muscle,
      deepDeficit: net < -500, proteinShort: p < 1
    };
    state.days.push(out);
    state.day += 1;
    return out;
  }

  function finalScore(state) {
    var accuracy  = Math.max(0, 1 - Math.abs(state.lbs - 100) / 12);
    var build     = 1 + TUNE.BUILD_MAX * (state.muscle / 100);
    var precision = 1 + TUNE.PRECISION_MAX * accuracy * accuracy;
    var final     = state.running * build * precision;
    var won = Math.abs(state.lbs - 100) <= TUNE.WIN_LBS_TOL && state.muscle >= TUNE.WIN_MUSCLE;
    return { running: state.running, accuracy: accuracy, build: build,
             precision: precision, final: final, won: won };
  }

  // One shared formatter (§12). `endCard` adds the "!" on a winning score.
  function fmt(n, endCard) {
    n = Math.max(0, n);
    if (n < 1000) return String(Math.round(n));
    if (n < 1e6) return sig3(n / 1000) + "K";
    if (endCard) return "1M!";
    return sig3(n / 1e6) + "M";
  }
  function sig3(x) {
    // 3 significant figures, no trailing zeros: 1.43, 12.4, 956
    var s = x.toPrecision(3);
    if (s.indexOf(".") >= 0) s = s.replace(/\.?0+$/, "");
    return s;
  }

  // Deterministic RNG for the harness (mulberry32).
  function seeded(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var FFF = {
    TUNE: TUNE, ORDER: ORDER, WEIGHT: WEIGHT,
    gaussian: gaussian, contribution: contribution, windowHalf: windowHalf,
    cumulativeHalf: cumulativeHalf, deliver: deliver,
    newRun: newRun, resolveDay: resolveDay, finalScore: finalScore,
    fmt: fmt, seeded: seeded, clamp: clamp
  };

  if (typeof module !== "undefined" && module.exports) module.exports = FFF;
  else root.FFF = FFF;
})(this);
