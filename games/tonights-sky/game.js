(function () {
  "use strict";

  Arcade.backButton();

  var SC = window.SkyCore;
  var $ = function (id) { return document.getElementById(id); };

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

  // ---- persistence --------------------------------------------------

  function freshData() {
    return {
      v: 1,
      settings: { glow: true, sound: false },
      seenCaption: false,
      seenPocketHint: false,
      current: null,
      days: {},
      playedDates: {},
      best: 0
    };
  }

  var data = Arcade.load("save", null);
  if (!data || typeof data !== "object") data = freshData();
  if (!data.settings || typeof data.settings !== "object") data.settings = { glow: true, sound: false };
  if (typeof data.settings.glow !== "boolean") data.settings.glow = true;
  if (typeof data.settings.sound !== "boolean") data.settings.sound = false;
  if (!data.days || typeof data.days !== "object") data.days = {};
  if (!data.playedDates || typeof data.playedDates !== "object") data.playedDates = {};
  if (typeof data.best !== "number") data.best = 0;
  data.seenCaption = !!data.seenCaption;
  data.seenPocketHint = !!data.seenPocketHint;

  function persist() { Arcade.save("save", data); }

  var today = Arcade.dailySeed();

  function prettyDate(key) {
    try {
      return new Date(key + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch (e) { return key; }
  }

  // ---- deal management ------------------------------------------------

  function newDailyCurrent() {
    var found = SC.findSolvableDeal(today, {});
    return { seed: found.seed, moves: [], practice: false, dateKey: today };
  }
  function newPracticeCurrent() {
    var raw = "practice:" + Date.now().toString(36) + ":" + Math.floor(Math.random() * 1e9).toString(36);
    var found = SC.findSolvableDeal(raw, {});
    return { seed: found.seed, moves: [], practice: true, dateKey: today };
  }

  function ensureCurrent() {
    var c = data.current;
    var stale = !c || typeof c !== "object" || !Array.isArray(c.moves) || typeof c.seed !== "string";
    if (!stale && !c.practice && c.dateKey !== today) stale = true; // a fresh day, no penalty for last night
    if (stale) { data.current = newDailyCurrent(); persist(); }
  }

  var deck, sim, wasteCard;

  // Mirrors SkyCore.replay(), but also tracks the exact card (rank + suit)
  // sitting on the Waste — the solver only needs its rank, but the table
  // needs to draw it.
  function replayView(moves) {
    var s = SC.initialState(deck);
    var wc = deck.stock.length ? deck.stock[0] : null;
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      if (m.t === "draw") wc = deck.stock[s.stockPtr];
      else if (m.t === "play") wc = deck.pyramid[m.slot];
      else if (m.t === "unpocket") wc = deck.pyramid[s.pocket];
      s = SC.applyMove(deck, s, m);
    }
    return { state: s, wasteCard: wc };
  }

  function loadActive() {
    deck = SC.buildDeck(data.current.seed);
    var v = replayView(data.current.moves);
    sim = v.state;
    wasteCard = v.wasteCard;
  }

  function markPlayedToday() {
    if (!data.playedDates[today]) { data.playedDates[today] = true; }
  }

  // ---- DOM refs ---------------------------------------------------------

  var playView = $("play"), resultEl = $("result"), resultInner = $("resultInner");
  var archiveEl = $("archive"), archiveField = $("archiveField"), archiveStats = $("archiveStats");
  var helpSheet = $("helpSheet");
  var pyramidEl = $("pyramid"), captionEl = $("caption"), hintEl = $("hint");
  var dateLabel = $("dateLabel");
  var stockPile = $("stockPile"), stockCard = $("stockCard"), stockCount = $("stockCount");
  var wastePile = $("wastePile"), wasteCardEl = $("wasteCard");
  var pocketPile = $("pocketPile"), pocketCardEl = $("pocketCard");
  var undoBtn = $("undoBtn");
  var glowToggle = $("glowToggle"), soundToggle = $("soundToggle");

  var pocketArmed = false;
  var starEls = [];
  var cardW = 56, cardH = 80, gapPx = 5;

  // ---- layout -------------------------------------------------------

  function leftEdge(r, c) { return (cardW + gapPx) * (c + (5 - r) / 2); }
  function topEdge(r) { return r * (cardH * 0.6); }

  function layout() {
    var stageWidth = document.querySelector(".stage").clientWidth || window.innerWidth - 16;
    var byWidth = Math.floor((stageWidth - 5 * 4) / 6);
    cardW = Math.max(52, Math.min(64, byWidth));
    gapPx = Math.max(3, Math.round(cardW * 0.08));
    cardH = Math.round(cardW * 1.43);
    var pyramidW = 6 * cardW + 5 * gapPx;
    var pyramidH = topEdge(5) + cardH;
    pyramidEl.style.width = pyramidW + "px";
    pyramidEl.style.height = pyramidH + "px";
    for (var i = 0; i < SC.TOTAL_SLOTS; i++) {
      var m = SC.META[i], e = starEls[i];
      e.style.left = leftEdge(m.row, m.col) + "px";
      e.style.top = topEdge(m.row) + "px";
      e.style.width = cardW + "px";
      e.style.height = cardH + "px";
    }
  }

  function buildPyramidDom() {
    pyramidEl.innerHTML = "";
    starEls = [];
    for (var i = 0; i < SC.TOTAL_SLOTS; i++) {
      var b = document.createElement("button");
      b.className = "star";
      b.dataset.slot = i;
      b.style.zIndex = SC.META[i].row;
      b.innerHTML =
        '<div class="back"></div>' +
        '<div class="face"><span class="rank"></span><span class="suit"></span><span class="rank br"></span></div>';
      b.addEventListener("click", onTapStar);
      pyramidEl.appendChild(b);
      starEls.push(b);
    }
  }

  // ---- sound --------------------------------------------------------

  function beep(freq, dur, vol, at) {
    var ctx = Arcade.audioCtx;
    if (!ctx) return;
    try {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(at); o.stop(at + dur + 0.05);
    } catch (e) { /* audio is optional */ }
  }
  function tone(kind) {
    if (!data.settings.sound || !Arcade.audioCtx) return;
    var t = Arcade.audioCtx.currentTime;
    if (kind === "play") beep(700, 0.12, 0.07, t);
    else if (kind === "pocket") beep(520, 0.14, 0.06, t);
    else if (kind === "draw") beep(340, 0.08, 0.05, t);
    else if (kind === "north") {
      beep(523.25, 0.4, 0.15, t); beep(659.25, 0.4, 0.15, t + 0.12);
      beep(783.99, 0.6, 0.18, t + 0.24); beep(1046.5, 0.8, 0.14, t + 0.36);
    }
  }

  // ---- hints / captions -----------------------------------------------

  var hintTimer = null;
  function flashHint(text) {
    hintEl.textContent = text;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { hintEl.textContent = ""; }, 2200);
  }

  function updateCaption() {
    if (!data.seenCaption) {
      captionEl.textContent = "Tap a star one above or below the " + SC.RANK_LABELS[sim.wasteRank] + ".";
      return;
    }
    if (!data.seenPocketHint) {
      var anyDirect = false;
      for (var i = 0; i < SC.TOTAL_SLOTS; i++) {
        if ((sim.removedMask >> i) & 1) continue;
        if (!SC.isUncovered(sim.removedMask, i)) continue;
        if (SC.adjacent(deck.pyramid[i].rank, sim.wasteRank)) { anyDirect = true; break; }
      }
      if (!anyDirect && sim.pocket === -1 && !pocketArmed) {
        captionEl.textContent = "You can pocket a card for later.";
        data.seenPocketHint = true;
        persist();
        return;
      }
    }
    captionEl.textContent = "";
  }

  // ---- rendering ------------------------------------------------------

  function render() {
    dateLabel.textContent = data.current.practice ? "Practice sky" : prettyDate(today);

    for (var i = 0; i < SC.TOTAL_SLOTS; i++) {
      var card = deck.pyramid[i], e = starEls[i];
      var removed = !!((sim.removedMask >> i) & 1);
      var uncovered = SC.isUncovered(sim.removedMask, i);
      var suitInfo = SC.SUITS[card.suit];
      e.classList.toggle("removed", removed);
      e.classList.toggle("faceup", uncovered && !removed);
      e.classList.toggle("covered", !uncovered);
      e.classList.toggle("red", suitInfo.red);
      if (uncovered) {
        var label = SC.RANK_LABELS[card.rank];
        e.querySelector(".rank:not(.br)").textContent = label;
        e.querySelector(".rank.br").textContent = label;
        e.querySelector(".suit").textContent = suitInfo.sym;
      }
      var playable = !removed && uncovered && sim.wasteRank != null && SC.adjacent(card.rank, sim.wasteRank);
      var pocketable = !removed && uncovered && sim.pocket === -1 && pocketArmed;
      e.classList.toggle("playable", data.settings.glow && playable);
      e.classList.toggle("pocketable", data.settings.glow && pocketable && !playable);
      e.style.pointerEvents = removed ? "none" : (uncovered ? "auto" : "none");
    }

    var remaining = deck.stock.length - sim.stockPtr;
    stockCount.textContent = remaining;
    stockCard.style.opacity = remaining > 0 ? "1" : "0.35";

    wasteCardEl.className = "pileCard";
    if (wasteCard) {
      wasteCardEl.classList.add("filled");
      if (SC.SUITS[wasteCard.suit].red) wasteCardEl.classList.add("red");
      wasteCardEl.textContent = SC.RANK_LABELS[wasteCard.rank] + SC.SUITS[wasteCard.suit].sym;
    } else {
      wasteCardEl.textContent = "";
    }

    pocketCardEl.className = "pileCard";
    if (sim.pocket !== -1) {
      var pc = deck.pyramid[sim.pocket];
      pocketCardEl.classList.add("filled");
      if (SC.SUITS[pc.suit].red) pocketCardEl.classList.add("red");
      pocketCardEl.textContent = SC.RANK_LABELS[pc.rank] + SC.SUITS[pc.suit].sym;
    } else {
      pocketCardEl.textContent = "—";
    }
    pocketPile.classList.toggle("glow", pocketArmed && sim.pocket === -1);

    undoBtn.disabled = data.current.moves.length === 0;

    updateCaption();
  }

  // ---- moves ----------------------------------------------------------

  function afterStateChange() {
    persist();
    render();
    if (SC.isWin(sim)) { onWin(); return; }
    if (SC.isStuck(deck, sim)) { onMiss(); }
  }

  function pushMove(m) {
    // Capture the card the move puts on the Waste before applyMove advances
    // the pointers it reads (deck.stock[sim.stockPtr], deck.pyramid[sim.pocket]).
    if (m.t === "draw") wasteCard = deck.stock[sim.stockPtr];
    else if (m.t === "play") wasteCard = deck.pyramid[m.slot];
    else if (m.t === "unpocket") wasteCard = deck.pyramid[sim.pocket];
    data.current.moves.push(m);
    sim = SC.applyMove(deck, sim, m);
    if (!data.seenCaption) { data.seenCaption = true; }
    markPlayedToday();
    afterStateChange();
  }

  function tapStar(i) {
    if ((sim.removedMask >> i) & 1) return;
    if (!SC.isUncovered(sim.removedMask, i)) return;
    var card = deck.pyramid[i];
    if (sim.wasteRank != null && SC.adjacent(card.rank, sim.wasteRank)) {
      pushMove({ t: "play", slot: i });
      tone("play");
      return;
    }
    if (pocketArmed && sim.pocket === -1) {
      pocketArmed = false;
      pushMove({ t: "pocket", slot: i });
      tone("pocket");
      return;
    }
    if (sim.pocket === -1) {
      flashHint("Tap the Pocket first to tuck this star away");
    } else {
      flashHint("Needs to be next to the " + SC.RANK_LABELS[sim.wasteRank]);
    }
  }
  function onTapStar(ev) { tapStar(+ev.currentTarget.dataset.slot); }

  stockPile.addEventListener("click", function () {
    if (sim.stockPtr >= deck.stock.length) { flashHint("Stock is empty for tonight"); return; }
    pushMove({ t: "draw" });
    tone("draw");
  });

  pocketPile.addEventListener("click", function () {
    if (sim.pocket !== -1) {
      pushMove({ t: "unpocket" });
      tone("pocket");
      return;
    }
    pocketArmed = !pocketArmed;
    render();
  });

  undoBtn.addEventListener("click", function () {
    if (!data.current.moves.length) return;
    data.current.moves.pop();
    var v = replayView(data.current.moves);
    sim = v.state; wasteCard = v.wasteCard;
    pocketArmed = false;
    hideResult();
    persist();
    render();
  });

  function restartSame() {
    data.current.moves = [];
    var v = replayView(data.current.moves);
    sim = v.state; wasteCard = v.wasteCard;
    pocketArmed = false;
    hideResult();
    persist();
    render();
  }

  function startPractice() {
    data.current = newPracticeCurrent();
    loadActive();
    pocketArmed = false;
    hideResult();
    persist();
    render();
  }

  // ---- brag / lifetime stats -------------------------------------------

  function solvedCount() {
    var n = 0;
    Object.keys(data.days).forEach(function (d) { if (data.days[d].solved) n++; });
    return n;
  }

  function updateBrag() {
    var nights = Object.keys(data.playedDates).length;
    if (nights > 0) {
      Arcade.stats([
        ["Nights played", nights],
        ["Dailies solved", solvedCount()],
        ["Best to spare", data.best]
      ]);
    } else Arcade.stats(null);
    var todayRec = data.days[today];
    Arcade.brag(todayRec && todayRec.solved ? "✦ Solved · " + todayRec.spare + " to spare" : "");
  }

  // ---- win / miss -------------------------------------------------------

  function signoffLine() {
    return new Date().getHours() >= 21 ? "Goodnight." : "See you tonight.";
  }

  // Idempotent: safe to call every time a win is observed, including on
  // resume, so a solved day is never lost to an interrupted save.
  function recordWinIfNeeded() {
    if (data.current.practice) return;
    var spare = deck.stock.length - sim.stockPtr;
    var already = data.days[today];
    if (!already || !already.solved) {
      data.days[today] = { solved: true, spare: spare };
      if (spare > data.best) data.best = spare;
      persist();
    }
  }

  function onWin() {
    recordWinIfNeeded();
    updateBrag();
    showResultWin(true);
  }

  function onMiss() {
    showResultMiss();
  }

  function hideResult() { resultEl.hidden = true; }

  function buildCascadeSvg(container, reduced) {
    var UNIT = 26, GAP = 5;
    function le(r, c) { return (UNIT + GAP) * (c + (5 - r) / 2); }
    function te(r) { return r * (UNIT * 0.72); }
    var W = 6 * UNIT + 5 * GAP, H = te(5) + UNIT;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var pts = [];
    for (var i = 0; i < SC.TOTAL_SLOTS; i++) {
      var m = SC.META[i];
      pts[i] = { x: le(m.row, m.col) + UNIT / 2, y: te(m.row) + UNIT / 2 };
    }
    var STEP = 420, LINEDUR = 460, maxDelay = 0;
    for (i = 0; i < SC.TOTAL_SLOTS; i++) {
      var mm = SC.META[i];
      if (!mm.children.length) continue;
      var delay = reduced ? 0 : (4 - mm.row) * STEP;
      if (delay > maxDelay) maxDelay = delay;
      for (var k = 0; k < mm.children.length; k++) {
        var ch = mm.children[k];
        var line = document.createElementNS(svg.namespaceURI, "line");
        line.setAttribute("x1", pts[i].x); line.setAttribute("y1", pts[i].y);
        line.setAttribute("x2", pts[ch].x); line.setAttribute("y2", pts[ch].y);
        line.setAttribute("class", "peakLine");
        if (!reduced) line.style.animationDelay = delay + "ms";
        svg.appendChild(line);
      }
    }
    for (i = 0; i < SC.TOTAL_SLOTS; i++) {
      var c = document.createElementNS(svg.namespaceURI, "circle");
      c.setAttribute("cx", pts[i].x); c.setAttribute("cy", pts[i].y);
      c.setAttribute("r", i === 0 ? 3.4 : 2.2);
      c.setAttribute("class", "peakDot" + (i === 0 ? " north" : ""));
      if (i === 0) {
        c.classList.add("northFlare");
        if (!reduced) c.style.animationDelay = (maxDelay + LINEDUR) + "ms";
      }
      svg.appendChild(c);
    }
    container.appendChild(svg);
    return reduced ? 0 : (maxDelay + LINEDUR);
  }

  function showResultWin(fresh) {
    resultEl.hidden = false;
    resultInner.innerHTML = "";
    var reduced = Arcade.reducedMotion() || !fresh;
    var practice = !!data.current.practice;
    var spare = deck.stock.length - sim.stockPtr;

    var stage = el("div", "peakStage");
    resultInner.appendChild(stage);
    var totalMs = buildCascadeSvg(stage, reduced);

    if (!practice) {
      var name = window.SkyNames.pick(data.current.seed);
      var nameEl = el("div", "constellation", "✦ " + name);
      if (reduced) { nameEl.style.animation = "none"; nameEl.style.opacity = "1"; }
      else nameEl.style.animationDelay = totalMs + "ms";
      resultInner.appendChild(nameEl);
    }
    if (fresh) tone("north");

    resultInner.appendChild(el("div", "verdict", practice ? "Practice sky" : "Tonight's sky"));
    resultInner.appendChild(el("div", "headline", "Solved"));
    resultInner.appendChild(el("div", "subline", spare + (spare === 1 ? " card" : " cards") + " to spare"));

    var stat = el("div", "statCard");
    var nights = Object.keys(data.playedDates).length;
    [["Nights played", nights], ["Dailies solved", solvedCount()], ["Best to spare", data.best]].forEach(function (r) {
      var row = el("div", "statRow");
      row.appendChild(el("span", null, r[0]));
      row.appendChild(el("b", null, String(r[1])));
      stat.appendChild(row);
    });
    resultInner.appendChild(stat);
    resultInner.appendChild(el("div", "signoff", signoffLine()));

    var actions = el("div", "actions");
    var shareHint = el("div", "shareHint");
    var shareBtn = el("button", "btn", "Share");
    Arcade.shareButton(shareBtn, shareHint, function () {
      return {
        text: "Tonight's Sky · " + prettyDate(today) + " · ✦ Solved, " + spare + " to spare",
        title: "Tonight's Sky"
      };
    });
    actions.appendChild(shareBtn);
    actions.appendChild(button("Another sky", "btn quiet", startPractice));
    actions.appendChild(button("Your sky", "btn quiet", function () { showArchive(); }));
    resultInner.appendChild(actions);
    resultInner.appendChild(shareHint);

    if (fresh && (spare >= 15 || (data.best === spare && spare > 0))) Arcade.confetti(["#ffe066", "#a5f3ef", "#eafffb"]);
  }

  function showResultMiss() {
    resultEl.hidden = false;
    resultInner.innerHTML = "";
    var practice = !!data.current.practice;
    var left = SC.starsLeft(sim);

    resultInner.appendChild(el("div", "headline", left + (left === 1 ? " star short." : " stars short.")));
    resultInner.appendChild(el("div", "subline", "Same sky, try again?"));

    var actions = el("div", "actions");
    if (data.current.moves.length) {
      actions.appendChild(button("Undo", "btn quiet", function () {
        data.current.moves.pop();
        var v = replayView(data.current.moves);
        sim = v.state; wasteCard = v.wasteCard;
        hideResult();
        persist();
        render();
      }));
    }
    actions.appendChild(button(practice ? "Try this sky again" : "Try tonight's sky again", "btn", restartSame));
    actions.appendChild(button("Another sky", "btn quiet", startPractice));
    resultInner.appendChild(actions);
  }

  // ---- archive ("Your sky") --------------------------------------------

  function showArchive() {
    archiveEl.hidden = false;
    buildArchive();
  }
  function buildArchive() {
    archiveField.innerHTML = "";
    var dates = Object.keys(data.playedDates).sort();
    dates.forEach(function (d) {
      var rng = Arcade.seededRandom("tonights-sky-archive:" + d);
      var x = 6 + rng() * 86, y = 8 + rng() * 78;
      var rec = data.days[d];
      var star = el("div", "archiveStar" + (rec && rec.solved ? " solved" : "") + (d === today ? " today" : ""));
      star.style.left = x + "%";
      star.style.top = y + "%";
      star.addEventListener("click", function () { showArchiveDetail(d); });
      archiveField.appendChild(star);
    });

    archiveStats.innerHTML = "";
    var nights = dates.length;
    [["Nights played", nights], ["Dailies solved", solvedCount()], ["Best to spare", data.best], ["Current run", nights]]
      .forEach(function (r) {
        var row = el("div", "row");
        row.appendChild(el("span", null, r[0]));
        row.appendChild(el("b", null, String(r[1])));
        archiveStats.appendChild(row);
      });
  }
  function showArchiveDetail(d) {
    var existing = archiveField.querySelector(".archiveDetail");
    if (existing) existing.remove();
    var rec = data.days[d];
    var box = el("div", "archiveDetail", prettyDate(d) + " — " + (rec && rec.solved ? ("Solved, " + rec.spare + " to spare") : "Played, not solved"));
    archiveField.appendChild(box);
  }
  $("archiveClose").addEventListener("click", function () { archiveEl.hidden = true; });

  // ---- help / settings sheet --------------------------------------------

  function openHelp() {
    glowToggle.classList.toggle("on", data.settings.glow);
    soundToggle.classList.toggle("on", data.settings.sound);
    helpSheet.hidden = false;
  }
  glowToggle.addEventListener("click", function () {
    data.settings.glow = !data.settings.glow;
    glowToggle.classList.toggle("on", data.settings.glow);
    persist();
    render();
  });
  soundToggle.addEventListener("click", function () {
    data.settings.sound = !data.settings.sound;
    soundToggle.classList.toggle("on", data.settings.sound);
    persist();
  });
  $("helpClose").addEventListener("click", function () { helpSheet.hidden = true; });

  Arcade.menuButton({
    title: "Tonight's Sky",
    help: openHelp,
    describeSave: function () {
      return "Nights played, best to-spare, and tonight's progress in Tonight's Sky.";
    },
    actions: [{
      label: "Try tonight's sky again",
      pinned: true,
      confirm: "This sky resets to the start. Nothing scored is lost.",
      onClick: restartSame,
      show: function () {
        return !!data.current && !data.current.practice && data.current.moves.length > 0 && resultEl.hidden;
      },
      nudge: function () {
        return !!data.current && !data.current.practice && !!deck && SC.isStuck(deck, sim) && resultEl.hidden;
      }
    }]
  });

  // ---- midnight rollover -------------------------------------------------

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && Arcade.dailySeed() !== today) location.reload();
  });

  window.addEventListener("resize", layout);

  // ---- start -------------------------------------------------------------

  function start() {
    ensureCurrent();
    loadActive();
    buildPyramidDom();
    layout();
    playView.hidden = false;
    render();
    if (SC.isWin(sim)) { recordWinIfNeeded(); updateBrag(); showResultWin(false); }
    else { updateBrag(); if (SC.isStuck(deck, sim)) showResultMiss(); }
  }

  Arcade.boot(start);
})();
