/* Lettuce Arcade — shared runtime. Keep this file dependency-free. */

(function () {
  "use strict";

  var Arcade = {};

  Arcade.VERSION = 4;

  // ---- namespacing --------------------------------------------------

  function gameNamespace() {
    // e.g. /games/tap-race/index.html -> "tap-race"; falls back to full path.
    var parts = location.pathname.split("/").filter(Boolean);
    var gi = parts.indexOf("games");
    if (gi !== -1 && parts[gi + 1]) return parts[gi + 1];
    return "arcade";
  }

  // ---- version stamp --------------------------------------------------

  Arcade.stamp = function () {
    var el = document.createElement("div");
    el.textContent = "v" + Arcade.VERSION;
    el.setAttribute("aria-hidden", "true");
    Object.assign(el.style, {
      position: "fixed",
      right: "calc(4px + env(safe-area-inset-right, 0px))",
      bottom: "calc(4px + env(safe-area-inset-bottom, 0px))",
      fontSize: "10px",
      opacity: "0.4",
      color: "#fff",
      pointerEvents: "none",
      zIndex: "9999"
    });
    document.body.appendChild(el);
  };

  // ---- back button --------------------------------------------------

  Arcade.backButton = function () {
    var a = document.createElement("a");
    a.href = "/";
    a.textContent = "← Arcade";
    a.className = "btn";
    Object.assign(a.style, {
      position: "fixed",
      top: "calc(8px + env(safe-area-inset-top, 0px))",
      left: "calc(8px + env(safe-area-inset-left, 0px))",
      minHeight: "44px",
      minWidth: "44px",
      zIndex: "9999",
      background: "rgba(0,0,0,0.5)"
    });
    document.body.appendChild(a);
    return a;
  };

  // ---- boot / audio unlock --------------------------------------------------

  Arcade.audioCtx = null;

  Arcade.boot = function (startFn) {
    var overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(10, 8, 20, 0.96)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: "10000",
      touchAction: "manipulation"
    });

    var label = document.createElement("div");
    label.textContent = "Tap to start";
    Object.assign(label.style, {
      color: "#fff",
      fontSize: "2rem",
      fontWeight: "700",
      userSelect: "none"
    });
    overlay.appendChild(label);
    document.body.appendChild(overlay);

    function begin() {
      overlay.removeEventListener("pointerdown", begin);
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          if (!Arcade.audioCtx) Arcade.audioCtx = new AC();
          if (Arcade.audioCtx.state === "suspended") {
            Arcade.audioCtx.resume();
          }
        }
      } catch (e) {
        /* audio unavailable; game must tolerate a null audioCtx */
      }
      overlay.remove();
      startFn();
    }

    overlay.addEventListener("pointerdown", begin, { once: true });
  };

  // ---- storage --------------------------------------------------

  function storageKey(key) {
    return "arcade:" + gameNamespace() + ":" + key;
  }

  var memoryFallback = {};

  Arcade.save = function (key, value) {
    var k = storageKey(key);
    try {
      localStorage.setItem(k, JSON.stringify(value));
    } catch (e) {
      memoryFallback[k] = value;
    }
  };

  Arcade.load = function (key, fallback) {
    var k = storageKey(key);
    try {
      var raw = localStorage.getItem(k);
      if (raw === null) {
        return Object.prototype.hasOwnProperty.call(memoryFallback, k) ? memoryFallback[k] : fallback;
      }
      return JSON.parse(raw);
    } catch (e) {
      return Object.prototype.hasOwnProperty.call(memoryFallback, k) ? memoryFallback[k] : fallback;
    }
  };

  // ---- deterministic daily randomness --------------------------------------------------

  Arcade.dailySeed = function () {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  };

  function hashString(str) {
    // xmur3-style string hash -> 32-bit seed
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  Arcade.seededRandom = function (seedString) {
    var seedFn = hashString(String(seedString));
    return mulberry32(seedFn());
  };

  // ---- boot-time stamp --------------------------------------------------

  window.Arcade = Arcade;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", Arcade.stamp);
  } else {
    Arcade.stamp();
  }
})();
