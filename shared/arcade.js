/* Lettuce Arcade — shared runtime. Keep this file dependency-free. */

(function () {
  "use strict";

  var Arcade = {};

  Arcade.VERSION = 36;

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
  //   rules        - array of strings, one per line, for "How to play". A
  //                  line starting "# " is a section heading (a game with
  //                  two modes gets two sections); or
  //   help         - a function that opens the game's own rules screen.
  //   describeSave - function returning one line naming what a reset wipes,
  //                  in the game's own words ("Totodile · 23 care-days …").
  //   canOpen      - function returning false while the menu must stay shut
  //                  (a reel mid-spin, a run in flight).
  //
  // The reset is toddler-proofed three ways: the wipe button sits at the top
  // of the card and Cancel at the thumb; the wipe button is inert for the
  // first second; and the card says what dies before it asks.

  var sheetCssDone = false;
  function sheetCss() {
    if (sheetCssDone) return;
    sheetCssDone = true;
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
      ".arc-box h3{text-align:left;font-size:1.05rem;margin:14px 0 2px;color:#ffe066;letter-spacing:0.04em;text-transform:uppercase}" +
      ".arc-box h3:first-of-type{margin-top:0}" +
      ".arc-box .btn{width:100%;min-height:60px;font-size:1.15rem;font-weight:800}" +
      ".arc-box .btn.quiet{background:var(--bg-elevated)}" +
      ".arc-box .btn.danger{background:#ff8a7a;color:#2b0f0a}" +
      ".arc-box .btn.danger:disabled{opacity:0.35}" +
      ".arc-box .spacer{min-height:32px;flex:1}" +
      ".arc-stats{display:flex;flex-direction:column;gap:2px;text-align:left}" +
      ".arc-stats h3{margin:14px 0 4px}" +
      ".arc-stats h3:first-child{margin-top:0}" +
      ".arc-stat{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.08);font-size:1rem}" +
      ".arc-stat span:first-child{color:var(--fg-dim)}" +
      ".arc-stat span:last-child{color:#ffe066;font-weight:800;font-variant-numeric:tabular-nums;text-align:right}" +
      ".arc-stats .note{color:var(--fg-dim);font-size:0.9rem;margin-top:12px;text-align:center}";
    document.head.appendChild(css);
  }

  Arcade.menuButton = function (opts) {
    opts = opts || {};
    sheetCss();

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
      // Game-supplied actions, e.g. { label: "New run", confirm: "This run is
      // gone.", onClick: fn }. With `confirm` set, the action gets its own
      // confirmation screen; without it, it fires straight away.
      (opts.actions || []).forEach(function (a) {
        kids.push(button(a.label, "btn quiet", function () {
          if (a.confirm) showConfirm(a); else { close(); a.onClick(); }
        }));
      });
      kids.push(button("Reset this game's save", "btn quiet", showReset));
      kids.push(el("div", "spacer"));
      kids.push(button("Close", "btn quiet", close));
      fill(kids);
    }

    function showRules() {
      var kids = [el("h2", null, "How to play")];
      var ul = null;
      (opts.rules || []).forEach(function (t) {
        if (String(t).indexOf("# ") === 0) {
          kids.push(el("h3", null, String(t).slice(2)));
          ul = null;
          return;
        }
        if (!ul) { ul = el("ul"); kids.push(ul); }
        ul.appendChild(el("li", null, t));
      });
      kids.push(el("div", "spacer"));
      kids.push(button("Back", "btn", showMain));
      fill(kids);
    }

    function showConfirm(a) {
      fill([
        el("h2", null, a.label + "?"),
        el("p", null, String(a.confirm)),
        button(a.label, "btn danger", function () { close(); a.onClick(); }),
        el("div", "spacer"),
        button("Cancel", "btn", showMain)
      ]);
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
    resetting = true;
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

  // ---- share ----------------------------------------------------------
  //
  // One share path for every end card. payload: { text, title, file }.
  // Tries the native share sheet (with the image when one is given and the
  // platform takes files), then the clipboard, then the old execCommand
  // copy. Resolves to one of "shared" | "cancelled" | "copied" | "failed";
  // it never rejects, so a game can wire it straight to a button.

  Arcade.share = function (payload) {
    payload = payload || {};
    var text = payload.text || "";
    var title = payload.title || "";

    function copy() {
      return new Promise(function (resolve) {
        if (!text) { resolve("failed"); return; }
        function legacy() {
          try {
            var ta = document.createElement("textarea");
            ta.value = text;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed"; ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            var ok = document.execCommand("copy");
            document.body.removeChild(ta);
            resolve(ok ? "copied" : "failed");
          } catch (e) { resolve("failed"); }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { resolve("copied"); }, legacy);
        } else legacy();
      });
    }

    function native(data) {
      return navigator.share(data).then(function () { return "shared"; }, function (err) {
        if (err && err.name === "AbortError") return "cancelled";
        return null; // let the caller fall through
      });
    }

    var chain = Promise.resolve(null);
    if (payload.file && navigator.share && navigator.canShare) {
      var withFile = { files: [payload.file] };
      if (title) withFile.title = title;
      var ok = false;
      try { ok = navigator.canShare(withFile); } catch (e) { ok = false; }
      if (ok) chain = chain.then(function () { return native(withFile); });
    }
    chain = chain.then(function (r) {
      if (r) return r;
      if (navigator.share && text) {
        var data = { text: text };
        if (title) data.title = title;
        return native(data);
      }
      return null;
    });
    return chain.then(function (r) { return r || copy(); });
  };

  // Wires a button to Arcade.share. build() returns the payload (called on
  // each tap, so it sees the latest run); hintEl gets a one-line result.
  Arcade.shareButton = function (btn, hintEl, build) {
    var label = btn.textContent;
    btn.addEventListener("click", function () {
      var payload;
      try { payload = build(); } catch (e) { payload = null; }
      if (!payload) { if (hintEl) hintEl.textContent = "Screenshot the card to share it"; return; }
      btn.disabled = true;
      Arcade.share(payload).then(function (r) {
        btn.disabled = false;
        if (r === "copied") {
          btn.textContent = "Copied";
          setTimeout(function () { btn.textContent = label; }, 1500);
          if (hintEl) hintEl.textContent = "Copied — paste it in the chat";
        } else if (r === "failed") {
          if (hintEl) hintEl.textContent = "Screenshot the card to share it";
        } else if (hintEl) {
          hintEl.textContent = "";
        }
      });
    });
    return btn;
  };

  // ---- celebration ------------------------------------------------------
  //
  // The same new-best moment in every game: a stamp animation for the
  // headline (add the class "arc-stamp" to any element) and a confetti fall.
  // Both are no-ops under prefers-reduced-motion.

  var celebrateCss = null;
  function ensureCelebrateCss() {
    if (celebrateCss) return;
    celebrateCss = document.createElement("style");
    celebrateCss.textContent =
      "@keyframes arc-stamp{0%{transform:scale(2);opacity:0}60%{transform:scale(.95);opacity:1}100%{transform:none;opacity:1}}" +
      ".arc-stamp{animation:arc-stamp .45s cubic-bezier(.2,.9,.3,1.2) both}" +
      ".arc-confetti{position:fixed;top:-14px;width:8px;height:14px;border-radius:2px;z-index:9500;pointer-events:none;animation:arc-fall 2.8s linear forwards}" +
      "@keyframes arc-fall{to{transform:translateY(110vh) rotate(720deg);opacity:.85}}" +
      "@media (prefers-reduced-motion:reduce){.arc-stamp,.arc-confetti{animation:none!important}}";
    document.head.appendChild(celebrateCss);
  }

  Arcade.reducedMotion = function () {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };

  Arcade.confetti = function (colors) {
    if (Arcade.reducedMotion()) return;
    ensureCelebrateCss();
    colors = colors || ["#4adec5", "#f6e7c1", "#ffd166", "#ef476f", "#ffffff"];
    for (var k = 0; k < 60; k++) {
      var p = document.createElement("div");
      p.className = "arc-confetti";
      p.style.left = (Math.random() * 100) + "vw";
      p.style.background = colors[k % colors.length];
      p.style.animationDelay = (Math.random() * 0.8) + "s";
      p.style.animationDuration = (2.2 + Math.random() * 1.2) + "s";
      document.body.appendChild(p);
      (function (el) { setTimeout(function () { el.remove(); }, 4500); })(p);
    }
  };

  Arcade.stampIn = function (el) {
    ensureCelebrateCss();
    el.classList.remove("arc-stamp");
    void el.offsetWidth;
    el.classList.add("arc-stamp");
  };

  // Short date for the corner of a card: "Sep 4".
  Arcade.cardDate = function () {
    try { return new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
    catch (e) { return Arcade.dailySeed(); }
  };

  // ---- brag line ------------------------------------------------------
  //
  // One line per game for the arcade index's trophy shelf ("Best 91",
  // "🔥 4-day streak"). Saved under the game's own namespace, so the game's
  // save reset wipes it too. The index reads every game's line by slug.

  Arcade.brag = function (text) {
    Arcade.save("brag", text ? String(text) : "");
  };

  Arcade.bragFor = function (slug) {
    var k = "arcade:" + slug + ":brag";
    try {
      var raw = localStorage.getItem(k);
      if (raw !== null) return String(JSON.parse(raw) || "");
    } catch (e) { /* fall through */ }
    return Object.prototype.hasOwnProperty.call(memoryFallback, k) ? String(memoryFallback[k] || "") : "";
  };

  // ---- lifetime stats -------------------------------------------------
  //
  // The brag's longer cousin. A game hands over its lifetime numbers wherever
  // it saves its brag:
  //
  //   Arcade.stats([["Bunnies fed", 12], ["Bowls served", 4], "# Spin", ...])
  //
  // Each row is [label, value]; a string starting "# " is a section heading,
  // as in the menu's rules. Saved under the game's own namespace, so the
  // game's save reset wipes it. The index puts a 📊 on the corner of any tile
  // whose game has reported stats and opens them in a sheet, without
  // launching the game. Nothing here counts across phones.

  Arcade.stats = function (rows) {
    Arcade.save("stats", Array.isArray(rows) && rows.length ? rows : null);
  };

  Arcade.statsFor = function (slug) {
    var k = "arcade:" + slug + ":stats";
    var rows = null;
    try {
      var raw = localStorage.getItem(k);
      if (raw !== null) rows = JSON.parse(raw);
    } catch (e) { rows = null; }
    if (rows === null && Object.prototype.hasOwnProperty.call(memoryFallback, k)) rows = memoryFallback[k];
    return Array.isArray(rows) && rows.length ? rows : null;
  };

  // Opens the sheet the index uses. Rows as above; numbers get separators.
  Arcade.statsSheet = function (title, rows) {
    sheetCss();
    var sheet = document.createElement("div");
    sheet.className = "arc-sheet show";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    var box = document.createElement("div");
    box.className = "arc-box";
    var h2 = document.createElement("h2");
    h2.textContent = title;
    box.appendChild(h2);
    var list = document.createElement("div");
    list.className = "arc-stats";
    (rows || []).forEach(function (r) {
      if (typeof r === "string") {
        if (r.indexOf("# ") === 0) {
          var h3 = document.createElement("h3");
          h3.textContent = r.slice(2);
          list.appendChild(h3);
        }
        return;
      }
      if (!Array.isArray(r) || r.length < 2) return;
      var row = document.createElement("div");
      row.className = "arc-stat";
      var label = document.createElement("span");
      label.textContent = String(r[0]);
      var value = document.createElement("span");
      value.textContent = typeof r[1] === "number" ? r[1].toLocaleString() : String(r[1]);
      row.appendChild(label);
      row.appendChild(value);
      list.appendChild(row);
    });
    var note = document.createElement("div");
    note.className = "note";
    note.textContent = "Lifetime, on this phone.";
    list.appendChild(note);
    box.appendChild(list);
    var spacer = document.createElement("div");
    spacer.className = "spacer";
    box.appendChild(spacer);
    var close = document.createElement("button");
    close.className = "btn quiet";
    close.textContent = "Close";
    close.addEventListener("click", function () { sheet.remove(); });
    box.appendChild(close);
    sheet.appendChild(box);
    document.body.appendChild(sheet);
    return sheet;
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
      recordPlay(gameNamespace());
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

  // Once a reset has started, nothing may write: games save on
  // visibilitychange / pagehide, and those fire during the reload the reset
  // triggers, which would put the wiped state straight back.
  var resetting = false;

  Arcade.save = function (key, value) {
    if (resetting) return;
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

  // ---- play counts --------------------------------------------------
  //
  // One tally for the whole arcade, keyed by game slug. It lives under the
  // index's own namespace, not the game's, so "Reset this game's save" leaves
  // it alone. A play is the tap on the boot overlay: the moment gameplay
  // starts. The index reads it to sort tiles and tag never-played games.

  var PLAYS_KEY = "arcade:arcade:plays";
  var BETA_KEY = "arcade:arcade:beta";

  // Beta games never tally. The index tells us which slugs are beta on every
  // visit (it's the only page that reads games.json), and any count a beta
  // game somehow picked up is pruned, so when the game graduates to the main
  // list it still gets its "New!" tag.
  function betaSlugs() {
    var slugs = null;
    try {
      slugs = JSON.parse(localStorage.getItem(BETA_KEY));
    } catch (e) { /* storage unavailable or corrupt; fall through */ }
    if (!Array.isArray(slugs)) slugs = memoryFallback[BETA_KEY] || [];
    return slugs;
  }

  Arcade.setBetaSlugs = function (slugs) {
    slugs = Array.isArray(slugs) ? slugs : [];
    try {
      localStorage.setItem(BETA_KEY, JSON.stringify(slugs));
    } catch (e) {
      memoryFallback[BETA_KEY] = slugs;
    }
    var counts = Arcade.playCounts();
    var dirty = false;
    slugs.forEach(function (slug) {
      if (Object.prototype.hasOwnProperty.call(counts, slug)) {
        delete counts[slug];
        dirty = true;
      }
    });
    if (dirty) writePlayCounts(counts);
  };

  function writePlayCounts(counts) {
    try {
      localStorage.setItem(PLAYS_KEY, JSON.stringify(counts));
    } catch (e) {
      memoryFallback[PLAYS_KEY] = counts;
    }
  }

  Arcade.playCounts = function () {
    var counts = null;
    try {
      counts = JSON.parse(localStorage.getItem(PLAYS_KEY));
    } catch (e) { /* storage unavailable or corrupt; fall through */ }
    if (!counts || typeof counts !== "object") counts = memoryFallback[PLAYS_KEY] || {};
    return counts;
  };

  function recordPlay(slug) {
    if (betaSlugs().indexOf(slug) !== -1) return;
    var counts = Arcade.playCounts();
    counts[slug] = (counts[slug] || 0) + 1;
    writePlayCounts(counts);
  }

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
