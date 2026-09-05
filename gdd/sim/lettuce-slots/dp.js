// Exact optimal-stopping DP for Lettuce Slots Run mode.
// State: t spins used (0..SPINS), k streak, B bowl (capped). Serve is free
// and precedes the spin, so V(t,k,B) = max(B + V(t,0,0), spinEV(t,k,B)).
// At t = SPINS, last call serves the bowl: V = B.
"use strict";

function makeRules(o) {
  o = o || {};
  var r = {
    spins: o.spins || 75,
    nsym: 5,
    strip3: o.strip3 || 6,        // 5 symbols + bunny
    bunnyP: null,                 // derived unless given
    matchMult: o.matchMult || 2,
    jackMult: o.jackMult || 3,
    jackBonus: o.jackBonus == null ? 50 : o.jackBonus,
    grace: o.grace || 0,          // bunny can't eat a bowl of ≤ grace (still resets streak? no: treated as leafless no-op)
    sleep: o.sleep || 0,          // bunny can't appear for `sleep` spins after a serve
    growth: o.growth || "tri",    // "tri": +k ; "flat": +1 ; "tri2": +2k
    cap: o.cap || 4000
  };
  r.bunnyP = o.bunnyP != null ? o.bunnyP : 1 / r.strip3;
  var nb = 1 - r.bunnyP;                       // non-bust
  r.pairP = 1 / r.nsym;                        // r1 == r2
  r.jackP = (1 / r.nsym) * (1 / r.nsym) * (nb / r.nsym);   // r1=r2=🥬 (1/25) × r3=🥬 (nb/5 = 1/6)
  r.matchP = (1 / r.nsym) * ((r.nsym - 1) / r.nsym) * (nb / r.nsym); // r1=r2≠🥬 (4/25) × r3 same (1/6)
  r.missP = 1 - r.bunnyP - r.jackP - r.matchP;
  return r;
}

function leafAdd(r, k) { // k = streak after increment
  if (r.growth === "flat") return 1;
  if (r.growth === "tri2") return 2 * k;
  return k;
}

// Returns { value, policy(t,k,B) -> true if serve, V0: array of V(t,0,0) }
function solve(r) {
  var S = r.spins, CAP = r.cap;
  var W = CAP + 1;
  var next = new Float64Array((S + 1) * W); // V[t+1][k][B]  (indexed k*W+B)
  var cur = new Float64Array((S + 1) * W);
  // policy bitmap: serve at (t,k,B)
  var pol = new Uint8Array((S + 1) * (S + 1) * W);
  var V0 = new Float64Array(S + 1);
  // t = S: everything served
  for (var k = 0; k <= S; k++) for (var B = 0; B <= CAP; B++) next[k * W + B] = B;
  V0[S] = 0;
  for (var t = S - 1; t >= 0; t--) {
    // spinning from (t,k,B) → (t+1, ...). First compute spinEV for k=0,B=0 to get V(t,0,0).
    var bunnyP = r.bunnyP, sinceServeSleep = false; // sleep handled via k==0 heuristic below
    function spinEV(k, B, bp) {
      var kk = Math.min(k + 1, S);
      var nbP = 1 - bp;
      var jp = r.jackP * (nbP / (1 - r.bunnyP)), mp = r.matchP * (nbP / (1 - r.bunnyP));
      var missP = nbP - jp - mp;
      var b1 = B + leafAdd(r, k + 1);
      var bj = Math.min(CAP, b1 * r.jackMult + r.jackBonus);
      var bm = Math.min(CAP, Math.floor(b1 * r.matchMult));
      var bl = Math.min(CAP, b1);
      var bustV = B <= r.grace ? next[k * W + B] /* grace: nothing happens */ : next[0];
      return bp * bustV + jp * next[kk * W + bj] + mp * next[kk * W + bm] + missP * next[kk * W + bl];
    }
    var v00 = spinEV(0, 0, r.sleep > 0 ? 0 : bunnyP); // sleep approximated: first spin after serve is safe
    V0[t] = v00;
    for (var k = 0; k <= Math.min(t, S); k++) {
      var kmax = Math.min(t, S);
      for (var B = 0; B <= CAP; B++) {
        var bp = (r.sleep > 0 && k < r.sleep) ? 0 : bunnyP;
        var sv = B + v00;
        var sp = spinEV(k, B, bp);
        var idx = k * W + B;
        if (B > 0 && sv >= sp) { cur[idx] = sv; pol[(t * (S + 1) + k) * W + B] = 1; }
        else { cur[idx] = sp; }
      }
    }
    var tmp = next; next = cur; cur = tmp;
  }
  return {
    value: next[0],
    V0: V0,
    serve: function (t, k, B) { return pol[(t * (S + 1) + k) * W + Math.min(B, CAP)] === 1; },
    rules: r
  };
}

module.exports = { makeRules, solve, leafAdd };

if (require.main === module) {
  var r = makeRules({});
  var t0 = Date.now();
  var s = solve(r);
  console.log("optimal EV", s.value.toFixed(2), "in", Date.now() - t0, "ms");
  // Serve threshold on the pure triangular path, by spins left
  var line = [];
  for (var t = 0; t < r.spins; t++) {
    var kk = null;
    for (var k = 1; k <= t; k++) { var B = k * (k + 1) / 2; if (s.serve(t, k, B)) { kk = k; break; } }
    line.push((r.spins - t) + ":" + (kk == null ? "-" : kk));
  }
  console.log("serve at streak (spinsLeft:streak):", line.join(" "));
}
