/* Lettuce Arcade — shared runtime. Keep this file dependency-free. */

(function () {
  "use strict";

  var Arcade = {};

  Arcade.VERSION = 26;

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

  // ---- menu: how to play + save reset ---------------------------------
  //
  // Every game calls Arcade.menuButton(opts) after backButton(). One ☰ at
  // the top right (games with a mute button sit it at right: 60px). The
  // sheet offers the rules and a reset of this game's save, and nothing
  // else. opts:
  //   title        - shown at the top of the sheet; defaults to the <title>
  //                  up to the " — ".
  //   rules        - array of strings, one per line, for "How to play"; or
  //   help         - a function that opens the game's own rules screen.
  //   describeSave - function returning one line naming what a reset wipes,
  //                  in the game's own words ("Totodile · 23 care-days …").
  //   canOpen      - function returning false while the menu must stay shut
  //                  (a reel mid-spin, a run in flight).
  //
  // The reset is toddler-proofed three ways: the wipe button sits at the top
  // of the card and Cancel at the thumb; the wipe button is inert for the
  // first second; and the card says what dies before it asks.

  Arcade.menuButton = function (opts) {
    opts = opts || {};
    var css = document.createElement("style");
    css.textContent =
      ".arc-menu-btn{position:fixed;top:calc(8px + env(safe-area-inset-top,0px));right:calc(8px + env(safe-area-inset-right,0px));" +
      "min-height:44px;min-width:44px;padding:8px 12px;z-index:9999;background:rgba(0,0,0,0.5);font-size:1.25rem;line-height:1}" +
      ".arc-sheet{position:fixed;inset:0;z-index:10002;background:rgba(8,55,52,0.97);display:none;align-items:center;justify-content:center;" +
      "padding:calc(56px + env(safe-area-inset-top,0px)) 20px calc(24px + env(safe-area-inset-bottom,0px));overflow-y:auto;text-align:center}" +
      ".arc-sheet.show{display:flex}" +
      ".arc-box{width:100%;max-width:360px;display:flex;flex-direction:column;align-items:stretch;gap:12px}" +
      ".arc-box h2{font-size:1.5rem;line-height:1.2;text-align:center}" +
      ".arc-box p{color:var(--fg-dim);font-size:1rem;text-align:center}" +
      ".arc-box ul{text-align:left;color:var(--fg);padding-left:1.2em;font-size:1rem}" +
      ".arc-box li{margin:8px 0}" +
      ".arc-box .btn{width:100%;min-height:60px;font-size:1.15rem;font-weight:800}" +
      ".arc-box .btn.quiet{background:var(--bg-elevated)}" +
      ".arc-box .btn.danger{background:#ff8a7a;color:#2b0f0a}" +
      ".arc-box .btn.danger:disabled{opacity:0.35}" +
      ".arc-box .spacer{min-height:32px;flex:1}";
    document.head.appendChild(css);

    var title = opts.title || String(document.title).split(" — ")[0] || "This game";
    var sheet = document.createElement("div");
    sheet.className = "arc-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    var box = document.createElement("div");
    box.className = "arc-box";
    sheet.appendChild(box);
    document.body.appendChild(sheet);

    function el(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }
    function button(label, cls, onClick) {
      var b = el("button", cls, label);
      b.addEventListener("click", onClick);
      return b;
    }
    function fill(kids) {
      box.innerHTML = "";
      kids.forEach(function (k) { box.appendChild(k); });
    }
    function close() {
      sheet.classList.remove("show");
      if (opts.onClose) opts.onClose();
    }

    function showMain() {
      var kids = [el("h2", null, title)];
      if (opts.rules || opts.help) kids.push(button("How to play", "btn", function () {
        if (opts.help) { close(); opts.help(); } else showRules();
      }));
      kids.push(button("Reset this game's save", "btn quiet", showReset));
      kids.push(el("div", "spacer"));
      kids.push(button("Close", "btn quiet", close));
      fill(kids);
    }

    function showRules() {
      var ul = el("ul");
      (opts.rules || []).forEach(function (t) { ul.appendChild(el("li", null, t)); });
      fill([el("h2", null, "How to play"), ul, el("div", "spacer"), button("Back", "btn", showMain)]);
    }

    function showReset() {
      var what = "";
      try { what = opts.describeSave ? String(opts.describeSave() || "") : ""; } catch (e) { what = ""; }
      var wipe = button("Wipe it", "btn danger", function () { Arcade.resetSave(); });
      wipe.disabled = true;
      setTimeout(function () { wipe.disabled = false; }, 1000);
      fill([
        el("h2", null, "Reset " + title + "?"),
        el("p", null, what || "Everything this game has saved on this phone."),
        el("p", null, "This can't be undone."),
        wipe,
        el("div", "spacer"),
        button("Cancel", "btn", showMain)
      ]);
    }

    var btn = button("☰", "btn arc-menu-btn", function () {
      if (opts.canOpen && !opts.canOpen()) return;
      showMain();
      sheet.classList.add("show");
      if (opts.onOpen) opts.onOpen();
    });
    btn.setAttribute("aria-label", "Menu");
    document.body.appendChild(btn);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sheet.classList.contains("show")) close();
    });
    return btn;
  };

  // Wipes every key this game has saved (its storage prefix), keeps the
  // sound preference, and reloads so the game boots as if new.
  Arcade.resetSave = function () {
    var prefix = "arcade:" + gameNamespace() + ":";
    var keep = prefix + "muted";
    try {
      var doomed = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(prefix) === 0 && k !== keep) doomed.push(k);
      }
      doomed.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* storage unavailable; the in-memory copy goes below */ }
    Object.keys(memoryFallback).forEach(function (k) {
      if (k.indexOf(prefix) === 0 && k !== keep) delete memoryFallback[k];
    });
    location.reload();
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

    // Game pages (never the index — it doesn't call boot) also swallow iOS's
    // proprietary pinch gesture events, which is the only way to stop pinch
    // zoom in older Safari that ignores touch-action. Scrolling is untouched.
    function swallow(e) { e.preventDefault(); }
    ["gesturestart", "gesturechange", "gestureend"].forEach(function (name) {
      document.addEventListener(name, swallow, { passive: false });
    });

    // iOS suspends the context whenever the phone locks, the app switches, a
    // call comes in, or (on older Safari) when the unlocking gesture was a
    // pointerdown rather than a touchend/click. A one-shot resume at boot is
    // not enough, so every later tap re-arms it. Playing a one-sample silent
    // buffer inside the gesture is the classic full-unlock for old iOS.
    function armAudio() {
      var ctx = Arcade.audioCtx;
      if (!ctx) return;
      try {
        if (ctx.state !== "running") ctx.resume();
        var buf = ctx.createBuffer(1, 1, 22050);
        var src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } catch (e) { /* best effort */ }
    }

    function begin() {
      overlay.removeEventListener("pointerdown", begin);
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC && !Arcade.audioCtx) Arcade.audioCtx = new AC();
      } catch (e) {
        /* audio unavailable; game must tolerate a null audioCtx */
      }
      armAudio();
      ["touchend", "pointerup", "click"].forEach(function (name) {
        document.addEventListener(name, function () {
          var ctx = Arcade.audioCtx;
          if (ctx && ctx.state !== "running") armAudio();
        }, { passive: true });
      });
      overlay.remove();
      startFn();
    }

    overlay.addEventListener("pointerdown", begin, { once: true });
    overlay.addEventListener("touchend", armAudio, { once: true, passive: true });
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
