/* Holey Cheese — presentation, pacing, and the one attempt a day.
   The rule itself lives in core.js. */

(function () {
  "use strict";

  var C = window.Cheese;
  var $ = function (id) { return document.getElementById(id); };

  // ---- tuning ----------------------------------------------------------
  // Tap count and hole density trade against each other; both were settled
  // against simulated play rather than argued about. See gdd/holey-cheese.md.
  var TAPS = 5;
  var HOLE_MIN = 19, HOLE_MAX = 21;

  // The collapse is the entertainment, so it is paced, not instant. A
  // generation gets its own beat and the beats lengthen slightly as the
  // damage travels, which is what makes a deep cascade feel like it is
  // deciding whether to stop. A six-generation collapse lands near a second.
  var PUNCH_MS = 160, GEN_MS = 120, GEN_RAMP = 14, GEN_MAX = 190;
  var SETTLE_MS = 420, STILL_MS = 700, SHRINK_MS = 460, TAIL_MS = 900;

  var reduced = Arcade.reducedMotion();
  if (reduced) { PUNCH_MS = 90; GEN_MS = 80; GEN_RAMP = 0; GEN_MAX = 80; SETTLE_MS = 0; STILL_MS = 400; SHRINK_MS = 0; }

  // Named by how much of the wheel survived in one piece. The middle band is
  // where a decent player lands; the top one should feel earned.
  var TIERS = [
    [85, "🧀 Textbook"],
    [70, "🧀 The wheel holds"],
    [55, "🧀 Swiss enough"],
    [40, "🧀 Crumbly"],
    [20, "🧀 Ruins"],
    [1,  "🧀 A crumb"],
    [0,  "🧀 Dust"]
  ];
  function tierFor(pct) {
    for (var i = 0; i < TIERS.length; i++) if (pct >= TIERS[i][0]) return TIERS[i][1];
    return TIERS[TIERS.length - 1][1];
  }

  // ---- persistence -----------------------------------------------------
  //
  // Today's result, the best slab ever, and a plain count of days played.
  // No streak, no history, no replays: a missed day costs nothing and is
  // invisible.

  function freshData() {
    return { v: 1, mode: "daily", daily: null, practice: null, today: null, best: 0, days: 0, sound: false, met: false };
  }
  var data = Arcade.load("save", null);
  if (!data || typeof data !== "object" || data.v !== 1) data = freshData();
  ["best", "days"].forEach(function (k) { if (typeof data[k] !== "number") data[k] = 0; });
  if (typeof data.sound !== "boolean") data.sound = false;
  function persist() { Arcade.save("save", data); }

  var today = Arcade.dailySeed();

  function prettyDate(key) {
    var p = String(key).split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    try { return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
    catch (e) { return key; }
  }

  // ---- boards ----------------------------------------------------------

  function encode(grid) {
    var s = "";
    for (var i = 0; i < C.CELLS; i++) s += grid[i] ? "1" : "0";
    return s;
  }
  function decode(str) {
    var g = new Uint8Array(C.CELLS);
    if (typeof str !== "string" || str.length !== C.CELLS) return null;
    for (var i = 0; i < C.CELLS; i++) g[i] = str.charCodeAt(i) === 49 ? 1 : 0;
    return g;
  }

  function makeBoard(seedString) {
    var rand = Arcade.seededRandom(seedString);
    var target = HOLE_MIN + Math.floor(rand() * (HOLE_MAX - HOLE_MIN + 1));
    var grid = C.generate(rand, target);
    // §4.2 is a hard requirement, not a preference: never hand the player a
    // wheel that is already falling apart. Redraw rather than ship one.
    for (var guard = 0; guard < 8 && !C.isStable(grid); guard++) grid = C.generate(rand, target);
    return grid;
  }

  function newRun(seedString, key) {
    var grid = makeBoard(seedString);
    return { key: key || null, grid: encode(grid), taps: 0, cheese0: C.countCheese(grid) };
  }
  function newDaily() { return newRun("holey-cheese:" + today, today); }
  function newPractice() {
    return newRun("hc-practice:" + Date.now().toString(36) + ":" + Math.floor(Math.random() * 1e9).toString(36));
  }

  // A new day wipes yesterday entirely: yesterday's result is not today's.
  if (data.today && data.today.key !== today) data.today = null;
  if (data.daily && data.daily.key !== today) data.daily = null;
  if (!data.today && !data.daily) data.daily = newDaily();
  if (data.mode !== "practice") data.mode = "daily";

  // ---- live state ------------------------------------------------------

  var grid = null;        // Uint8Array, the board as it stands
  var run = null;         // the persisted run record backing it
  var busy = false;       // a collapse or the ending is playing
  var selected = -1;
  var ended = false;
  var finalScore = 0, finalPct = 0, endedEarly = false, brokeRecord = false;

  function practiceMode() { return data.mode === "practice"; }
  function tapsLeft() { return Math.max(0, TAPS - (run ? run.taps : 0)); }

  // ---- DOM -------------------------------------------------------------

  var playView = $("play"), boardEl = $("board"), captionEl = $("caption");
  var dayLabel = $("dayLabel"), pipsEl = $("pips"), tapsLabel = $("tapsLabel");
  var peakEl = $("peak"), verdictEl = $("verdict"), headlineEl = $("headline");
  var sublineEl = $("subline"), tierEl = $("tier");
  var tailEl = $("tail"), statCard = $("statCard"), actionsEl = $("actions"), shareHint = $("shareHint");
  var firstRun = $("firstRun"), modeLink = $("tryPractice");
  var helpSheet = $("helpSheet"), soundToggle = $("soundToggle");

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

  var cells = [];
  function buildBoard() {
    boardEl.innerHTML = "";
    cells = [];
    for (var i = 0; i < C.CELLS; i++) {
      var b = document.createElement("button");
      b.className = "cell";
      b.dataset.i = String(i);
      b.setAttribute("role", "gridcell");
      cells.push(b);
      boardEl.appendChild(b);
    }
    boardEl.addEventListener("click", function (e) {
      var t = e.target.closest(".cell");
      if (t) onCellTap(+t.dataset.i);
    });
  }

  function renderCell(i) {
    var c = cells[i], hole = grid[i] === C.HOLE;
    c.classList.toggle("hole", hole);
    c.classList.toggle("sel", i === selected);
    c.disabled = hole || busy || ended;
    var r = ((i / C.N) | 0) + 1, col = (i % C.N) + 1;
    c.setAttribute("aria-label", "Row " + r + ", column " + col + ", " + (hole ? "hole" : "cheese"));
  }
  function render() {
    for (var i = 0; i < C.CELLS; i++) renderCell(i);
    renderChrome();
  }

  function renderChrome() {
    dayLabel.textContent = practiceMode() ? "Practice wheel" : prettyDate(today);
    pipsEl.innerHTML = "";
    for (var i = 0; i < TAPS; i++) {
      var p = el("div", "pip" + (i < (run ? run.taps : 0) ? " spent" : ""));
      pipsEl.appendChild(p);
    }
    var left = tapsLeft();
    tapsLabel.textContent = left + " left";
    if (ended) { firstRun.hidden = true; return; }
    if (practiceMode()) {
      modeLink.textContent = "← Back to today's wheel";
      firstRun.hidden = false;
    } else if (!data.met) {
      modeLink.textContent = "New here? Punch a practice wheel first";
      firstRun.hidden = false;
    } else {
      firstRun.hidden = true;
    }
  }

  var captionTimer = null;
  function say(text, holdMs) {
    if (captionTimer) { clearTimeout(captionTimer); captionTimer = null; }
    captionEl.textContent = text;
    if (holdMs) captionTimer = setTimeout(function () { captionEl.textContent = idleCaption(); }, holdMs);
  }
  function idleCaption() {
    if (ended) return "";
    if (selected >= 0) return "Tap it again to punch it.";
    var left = tapsLeft();
    if (left === TAPS) return "Punch " + TAPS + " holes. Keep the wheel whole.";
    if (left === 1) return "One punch left.";
    return "";
  }

  // ---- sound -----------------------------------------------------------
  //
  // Generated in code, never shipped, and off until asked for: this gets
  // played in quiet rooms at the end of the day.

  function beep(freq, dur, vol, at, type, slideTo) {
    var ctx = Arcade.audioCtx;
    if (!ctx || !data.sound) return;
    try {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, at);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(at); o.stop(at + dur + 0.03);
    } catch (e) { /* audio is a nicety */ }
  }
  function now() { return Arcade.audioCtx ? Arcade.audioCtx.currentTime : 0; }
  function sfx(kind, n) {
    if (!data.sound || !Arcade.audioCtx) return;
    var t = now();
    if (kind === "select") beep(560, 0.05, 0.05, t, "sine");
    else if (kind === "punch") beep(220, 0.16, 0.14, t, "triangle", 70);
    else if (kind === "wave") beep(260 * Math.pow(1.17, n || 0), 0.09, 0.09, t, "square");
    else if (kind === "settle") beep(160, 0.26, 0.07, t, "sine", 120);
    else if (kind === "fill") beep([523, 587, 659, 784, 880][(n || 0) % 5], 0.11, 0.06, t, "sine");
    else if (kind === "land") { [523, 659, 784, 1047].forEach(function (f, k) { beep(f, 0.7, 0.08, t + k * 0.07, "sine"); }); }
  }

  // ---- the turn --------------------------------------------------------

  function onCellTap(i) {
    if (busy || ended || grid[i] === C.HOLE) return;
    if (selected !== i) {
      // First tap selects and reveals nothing. A mistap on a small screen
      // must never be able to spend one of the five.
      var prev = selected;
      selected = i;
      if (prev >= 0) renderCell(prev);
      renderCell(i);
      sfx("select");
      say(idleCaption());
      return;
    }
    commit(i);
  }

  function commit(i) {
    busy = true;
    selected = -1;
    say("");
    for (var n = 0; n < C.CELLS; n++) cells[n].classList.remove("near");
    var cell = cells[i];
    cell.classList.remove("sel");
    cell.classList.add("punch");
    grid[i] = C.HOLE;
    sfx("punch");
    for (var k = 0; k < C.CELLS; k++) cells[k].disabled = true;

    // The collapse is computed now and revealed a generation at a time.
    var gens = C.collapse(grid);
    var touched = [i];
    gens.forEach(function (g) { touched = touched.concat(g); });

    setTimeout(function () {
      cell.classList.remove("punch");
      cell.classList.add("hole");
      playGenerations(gens, i, function () { afterCollapse(gens, touched); });
    }, PUNCH_MS);
  }

  function playGenerations(gens, from, done) {
    var t = 0;
    gens.forEach(function (gen, gi) {
      var beat = Math.min(GEN_MAX, GEN_MS + gi * GEN_RAMP);
      t += beat;
      // Within a beat the cells go in order of distance from the punch, so
      // the wave reads as radiating rather than blinking flat.
      var fr = (from / C.N) | 0, fc = from % C.N;
      var ordered = gen.slice().sort(function (a, b) {
        return (Math.abs(((a / C.N) | 0) - fr) + Math.abs((a % C.N) - fc)) -
               (Math.abs(((b / C.N) | 0) - fr) + Math.abs((b % C.N) - fc));
      });
      var step = ordered.length > 1 ? Math.min(12, 54 / (ordered.length - 1)) : 0;
      ordered.forEach(function (idx, k) {
        setTimeout(function () {
          var c = cells[idx];
          c.classList.add("fall");
          setTimeout(function () { c.classList.remove("fall"); c.classList.add("hole"); }, 190);
        }, t + k * step);
      });
      setTimeout(function () { sfx("wave", gi); }, t);
    });
    setTimeout(done, t + (gens.length ? 230 : 40));
  }

  function afterCollapse(gens, touched) {
    run.taps++;
    run.grid = encode(grid);
    persist();

    // The near-miss gets its beat. It is the most interesting thing that
    // just happened, and hiding it would waste it.
    var near = C.nearMisses(grid, touched);
    if (SETTLE_MS && near.length) {
      near.forEach(function (idx) {
        var c = cells[idx];
        c.classList.remove("near");
        void c.offsetWidth;
        c.classList.add("near");
        setTimeout(function () { c.classList.remove("near"); }, SETTLE_MS + 40);
      });
    }
    if (gens.length) sfx("settle");

    var line = "";
    if (!gens.length) line = "Clean punch — nothing moved.";
    else if (gens.length >= 3) line = gens.length + " waves.";
    else if (near.length) line = "It held.";

    var cheeseLeft = C.countCheese(grid);
    var over = run.taps >= TAPS;
    // §4.5: if the wheel can no longer pay for the punches still owed, the
    // run is over now, and it scores whatever survived.
    if (!over && cheeseLeft < tapsLeft()) { over = true; endedEarly = true; }

    if (over) { setTimeout(finish, SETTLE_MS ? SETTLE_MS : 60); return; }
    busy = false;
    renderChrome();
    for (var k = 0; k < C.CELLS; k++) renderCell(k);
    if (line) say(line, 1800); else say(idleCaption());
  }

  // ---- the ending ------------------------------------------------------
  //
  // A beat of stillness, then the surviving slab fills in from its own
  // middle with the count climbing beside it, and it stops there.

  function finish() {
    busy = true; ended = true;
    say("");
    // The pinned button polls its own visibility about once a second, which
    // is long enough to leave it sitting on top of the ending. The poll will
    // keep it hidden from here; this just gets it out of the way now.
    var pin = document.querySelector(".arc-pin");
    if (pin) pin.hidden = true;
    for (var k = 0; k < C.CELLS; k++) cells[k].disabled = true;

    var best = C.largestGroup(grid);
    finalScore = best.size;
    finalPct = run.cheese0 ? Math.round((best.size / run.cheese0) * 100) : 0;

    if (!practiceMode()) {
      // Whether this beat a standing record has to be judged before the
      // record moves, and a first-ever run has nothing to have beaten.
      brokeRecord = data.days > 0 && finalScore > data.best;
      data.today = {
        key: today, score: finalScore, intact: finalPct,
        grid: encode(grid), cheese0: run.cheese0, early: endedEarly
      };
      data.daily = null;
      data.days += 1;
      if (finalScore > data.best) data.best = finalScore;
    } else {
      data.practice = null;
    }
    persist();
    updateShelf();

    setTimeout(function () { playEnding(best, true); }, STILL_MS);
  }

  function playEnding(best, animate) {
    playView.classList.add("ended");
    renderChrome();
    peakEl.hidden = false;
    verdictEl.textContent = practiceMode()
      ? "Practice wheel"
      : (endedEarly ? "The wheel ran out" : (brokeRecord ? "New best" : "Today's wheel"));
    headlineEl.textContent = animate ? "0" : String(finalScore);
    sublineEl.textContent = "";
    tierEl.textContent = "";

    var slab = {};
    best.cells.forEach(function (i) { slab[i] = true; });

    function land() {
      headlineEl.textContent = String(finalScore);
      sublineEl.textContent = finalScore === 1
        ? "1 square, in one piece · " + finalPct + "% of the wheel"
        : finalScore + " squares joined · " + finalPct + "% of the wheel";
      tierEl.textContent = tierFor(finalPct);
      if (animate) {
        Arcade.stampIn(headlineEl);
        sfx("land");
        if (brokeRecord) Arcade.confetti(["#4adec5", "#f3c14b", "#ffe066", "#eafffb"]);
      }
      showTail(animate);
    }

    if (!animate || !finalScore) {
      for (var i = 0; i < C.CELLS; i++) {
        if (slab[i]) cells[i].classList.add("slab");
        else cells[i].classList.add("dim");
      }
      land();
      return;
    }

    setTimeout(function () {
      for (var i = 0; i < C.CELLS; i++) if (!slab[i]) cells[i].classList.add("dim");
      var step = Math.max(16, Math.min(46, Math.round(760 / best.size)));
      best.cells.forEach(function (idx, k) {
        setTimeout(function () {
          cells[idx].classList.add("slab");
          headlineEl.textContent = String(k + 1);
          if (k % 3 === 0) sfx("fill", Math.floor(k / 3));
        }, k * step);
      });
      setTimeout(land, best.size * step + 120);
    }, SHRINK_MS);
  }

  function showTail(animate) {
    function build() {
      statCard.innerHTML = "";
      actionsEl.innerHTML = "";
      shareHint.textContent = "";

      if (!practiceMode()) {
        [["Best slab", data.best], ["Days played", data.days]].forEach(function (r) {
          var row = el("div", "statRow");
          row.appendChild(el("span", null, r[0]));
          row.appendChild(el("b", null, String(r[1])));
          statCard.appendChild(row);
        });
        var shareBtn = el("button", "btn", "Share");
        Arcade.shareButton(shareBtn, shareHint, sharepayload);
        actionsEl.appendChild(shareBtn);
      }
      if (practiceMode()) actionsEl.appendChild(button("Today's wheel", "btn quiet", goDaily));
      actionsEl.appendChild(button(practiceMode() ? "Another practice wheel" : "Practice wheel", "link", startPractice));

      tailEl.hidden = false;
    }
    if (animate) setTimeout(build, TAIL_MS); else build();
  }

  // The line carries the date, the slab and the percentage, and nothing
  // that could reconstruct where the holes went — it has to be safe to send
  // before the rest of the family has played.
  function shareplain() {
    return "🧀 Holey Cheese · " + prettyDate(today) + " · " + finalScore + " slab · " + finalPct + "% intact";
  }
  function sharepayload() {
    return {
      text: shareplain(),
      title: "Holey Cheese",
      card: {
        game: "🧀 Holey Cheese",
        date: prettyDate(today),
        verdict: endedEarly ? "The wheel ran out" : "Largest slab",
        headline: String(finalScore),
        tier: tierFor(finalPct),
        rows: [["wheel intact", finalPct + "%"], ["punches", String(TAPS)], ["best slab", String(data.best)]],
        filename: "holey-cheese"
      }
    };
  }

  // ---- the arcade shelf ------------------------------------------------

  function updateShelf() {
    if (data.days > 0) {
      Arcade.stats([
        ["Days played", data.days],
        ["Best slab", data.best],
        ["Today", data.today ? data.today.score : "—"]
      ]);
    } else Arcade.stats(null);
    Arcade.brag(data.today ? "🧀 " + data.today.score + " slab today" : (data.best ? "🧀 Best slab " + data.best : ""));
  }

  // ---- switching wheels ------------------------------------------------

  function loadRun(record) {
    run = record;
    grid = decode(record.grid);
    if (!grid) { grid = makeBoard("hc-repair:" + Date.now()); run.grid = encode(grid); run.cheese0 = C.countCheese(grid); run.taps = 0; }
    if (typeof run.cheese0 !== "number" || !run.cheese0) run.cheese0 = C.countCheese(grid);
    selected = -1;
    ended = false; busy = false; endedEarly = false; brokeRecord = false;
    playView.classList.remove("ended");
    peakEl.hidden = true; tailEl.hidden = true;
    for (var i = 0; i < C.CELLS; i++) cells[i].classList.remove("slab", "dim", "near", "fall", "punch");
    render();
    say(idleCaption());
  }

  function showFinishedDaily() {
    run = { key: today, grid: data.today.grid, taps: TAPS, cheese0: data.today.cheese0 };
    grid = decode(data.today.grid) || new Uint8Array(C.CELLS);
    finalScore = data.today.score;
    finalPct = data.today.intact;
    endedEarly = !!data.today.early;
    ended = true; busy = false; selected = -1;
    for (var i = 0; i < C.CELLS; i++) cells[i].classList.remove("slab", "dim", "near", "fall", "punch");
    render();
    playEnding(C.largestGroup(grid), false);
  }

  function goDaily() {
    data.mode = "daily";
    persist();
    if (data.today) { showFinishedDaily(); return; }
    if (!data.daily) data.daily = newDaily();
    persist();
    loadRun(data.daily);
  }

  function startPractice() {
    data.mode = "practice";
    data.met = true;
    data.practice = newPractice();
    persist();
    loadRun(data.practice);
  }

  modeLink.addEventListener("click", function () {
    if (practiceMode()) goDaily(); else startPractice();
  });

  // ---- help sheet ------------------------------------------------------

  function openHelp() {
    soundToggle.classList.toggle("on", !!data.sound);
    helpSheet.hidden = false;
  }
  $("helpClose").addEventListener("click", function () { helpSheet.hidden = true; });
  soundToggle.addEventListener("click", function () {
    data.sound = !data.sound;
    soundToggle.classList.toggle("on", data.sound);
    persist();
    if (data.sound) sfx("select");
  });

  // ---- menu ------------------------------------------------------------
  //
  // Today's wheel is one attempt and cannot be restarted — that is what
  // makes comparing results mean anything. But a run that has gone sour
  // still needs a way out, so the pinned button offers a fresh practice
  // wheel instead. Today's wheel stays exactly where it was left.

  var practiceAction = {
    label: "Practice",
    pinned: true,
    confirm: "A fresh practice wheel. Nothing scored is lost.",
    onClick: startPractice,
    show: function () { return !ended && (practiceMode() || (run && run.taps > 0)); },
    nudge: function () {
      if (ended || !grid || !run || run.taps < 1) return false;
      // A lost cause: what is left could not amount to much however well the
      // remaining punches are spent.
      return C.largestGroup(grid).size <= 8;
    }
  };
  function refreshConfirm() {
    practiceAction.confirm = practiceMode()
      ? "This practice wheel is gone. Nothing scored is lost."
      : "Today's wheel is saved exactly where it is — you can come back to it.";
  }

  Arcade.backButton();
  Arcade.menuButton({
    title: "Holey Cheese",
    help: openHelp,
    describeSave: function () {
      return "Best slab " + data.best + ", " + data.days + (data.days === 1 ? " day" : " days") + " played, and today's wheel.";
    },
    canOpen: function () { refreshConfirm(); return !busy; },
    actions: [practiceAction]
  });

  // ---- midnight ---------------------------------------------------------

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && Arcade.dailySeed() !== today) location.reload();
  });

  // ---- start ------------------------------------------------------------

  function start() {
    buildBoard();
    playView.hidden = false;
    updateShelf();
    refreshConfirm();
    if (data.mode === "practice" && data.practice) loadRun(data.practice);
    else goDaily();
  }

  Arcade.boot(start);
})();
