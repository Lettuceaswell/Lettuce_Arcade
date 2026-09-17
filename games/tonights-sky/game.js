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
      v: 2,
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
  // v1 saves were scored while the Pocket ignored rank, so every solve
  // was 30 to spare. Keep nights and settings; wipe scores and the
  // in-progress sky (its log may hold a now-illegal unpocket).
  if (data.v !== 2) {
    data.v = 2;
    data.current = null;
    data.days = {};
    data.best = 0;
    Arcade.save("save", data);
  }
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

  var deck, sim, wasteCard, clearOrder, closestLeft, jitter;

  // Mirrors SkyCore.replay(), but also tracks the exact card (rank + suit)
  // sitting on the Waste — the solver only needs its rank, but the table
  // needs to draw it.
  function replayView(moves) {
    var s = SC.initialState(deck);
    var wc = deck.stock.length ? deck.stock[0] : null;
    var order = [];   // slots in the order they left the pyramid
    var closest = SC.TOTAL_SLOTS;
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      if (m.t === "draw") wc = deck.stock[s.stockPtr];
      else if (m.t === "play") wc = deck.pyramid[m.slot];
      else if (m.t === "unpocket") wc = deck.pyramid[s.pocket];
      if (m.t === "play" || m.t === "pocket") order.push(m.slot);
      s = SC.applyMove(deck, s, m);
      var left = SC.starsLeft(s);
      if (left < closest) closest = left;
    }
    return { state: s, wasteCard: wc, order: order, closest: closest };
  }

  // Which stars join up. Each star, as it is cleared, links to the nearest
  // star already lit — the same rule real constellation figures follow, so
  // the picture stays a figure instead of a scribble, while still being
  // drawn by the player's own route through the sky.
  function constellationEdges(order) {
    var norm = [];
    for (var i = 0; i < SC.TOTAL_SLOTS; i++) {
      var m = SC.META[i];
      norm[i] = {
        x: m.col + (5 - m.row) / 2 + jitter[i].x * 0.28,
        y: m.row * 0.72 + jitter[i].y * 0.28
      };
    }
    var edges = [];
    for (i = 1; i < order.length; i++) {
      var here = norm[order[i]], best = -1, bestD = Infinity;
      for (var j = 0; j < i; j++) {
        var there = norm[order[j]];
        var d = (here.x - there.x) * (here.x - there.x) + (here.y - there.y) * (here.y - there.y);
        if (d < bestD) { bestD = d; best = order[j]; }
      }
      edges.push([best, order[i]]);
    }
    return edges;
  }

  // The constellation is the night's own: each star sits a little off the
  // lattice, by the same seeded amount on the board and on the win screen,
  // so the shape that lights up is the one the player watched build.
  function buildJitter(seed) {
    var rng = Arcade.seededRandom(String(seed) + ":jitter");
    var j = [];
    for (var i = 0; i < SC.TOTAL_SLOTS; i++) j.push({ x: rng() * 2 - 1, y: rng() * 2 - 1 });
    return j;
  }

  function loadActive() {
    deck = SC.buildDeck(data.current.seed);
    jitter = buildJitter(data.current.seed);
    applyView(replayView(data.current.moves));
  }

  function applyView(v) {
    sim = v.state;
    wasteCard = v.wasteCard;
    clearOrder = v.order;
    closestLeft = v.closest;
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
  var linesEl = null;
  var drawing = false;
  var cardW = 56, cardH = 80, gapPx = 5;

  // ---- layout -------------------------------------------------------

  function leftEdge(r, c) { return (cardW + gapPx) * (c + (5 - r) / 2); }
  function topEdge(r) { return r * (cardH * 0.6); }

  // The ☰ menu's pinned restart sits at top 60px and is 44px tall; the sky
  // starts below it. Short screens give up some of that cushion.
  function pinBand() { return window.innerHeight < 660 ? 40 : 52; }

  function layout() {
    var stage = document.querySelector(".stage");
    var stageWidth = stage.clientWidth || window.innerWidth - 16;
    var byWidth = Math.floor((stageWidth - 5 * 4) / 6);
    // A pyramid is four card-heights tall (five 0.6 steps plus one card), so
    // a short screen sizes the cards down rather than pushing the thumb bar
    // off the bottom. Budget from the viewport, not from the stage: the
    // stage's own height depends on what this function decides.
    var reserved = 0;
    [".top", ".caption", ".thumbbar", ".controls"].forEach(function (sel) {
      var e = document.querySelector(sel);
      if (e) reserved += e.offsetHeight;
    });
    reserved += pinBand() + 30; // the pinned restart's band, plus gaps and padding
    var byHeight = Math.floor(Math.max(120, window.innerHeight - reserved) / (4 * 1.43));
    cardW = Math.max(44, Math.min(64, Math.min(byWidth, byHeight)));
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
      e.style.setProperty("--jx", (jitter[i].x * cardW * 0.14).toFixed(1) + "px");
      e.style.setProperty("--jy", (jitter[i].y * cardW * 0.14).toFixed(1) + "px");
    }
    if (linesEl) {
      linesEl.setAttribute("width", pyramidW);
      linesEl.setAttribute("height", pyramidH);
      linesEl.setAttribute("viewBox", "0 0 " + pyramidW + " " + pyramidH);
    }
    drawSkyLines();
  }

  // Where a cleared star sits: the slot's centre, nudged by tonight's jitter.
  function starPoint(i) {
    var m = SC.META[i];
    return {
      x: leftEdge(m.row, m.col) + cardW / 2 + jitter[i].x * cardW * 0.14,
      y: topEdge(m.row) + cardH / 2 + jitter[i].y * cardW * 0.14
    };
  }

  // The constellation draws itself as the sky clears: one line from each
  // cleared star to the one cleared before it.
  function drawSkyLines() {
    if (!linesEl) return;
    while (linesEl.firstChild) linesEl.removeChild(linesEl.firstChild);
    var edges = constellationEdges(clearOrder);
    for (var i = 0; i < edges.length; i++) {
      var a = starPoint(edges[i][0]), b = starPoint(edges[i][1]);
      var line = document.createElementNS(linesEl.namespaceURI, "line");
      line.setAttribute("x1", a.x.toFixed(1)); line.setAttribute("y1", a.y.toFixed(1));
      line.setAttribute("x2", b.x.toFixed(1)); line.setAttribute("y2", b.y.toFixed(1));
      linesEl.appendChild(line);
    }
  }

  function buildPyramidDom() {
    pyramidEl.innerHTML = "";
    linesEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    linesEl.setAttribute("class", "skyLines");
    pyramidEl.appendChild(linesEl);
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
      e.classList.toggle("north", i === 0);
      e.classList.toggle("stranded", !removed && !resultEl.hidden && resultEl.classList.contains("miss"));
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
    var pocketPlayable = sim.pocket !== -1 && sim.wasteRank != null && SC.adjacent(deck.pyramid[sim.pocket].rank, sim.wasteRank);
    pocketPile.classList.toggle("glow", (pocketArmed && sim.pocket === -1) || (data.settings.glow && pocketPlayable));

    undoBtn.disabled = data.current.moves.length === 0;

    drawSkyLines();
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
    if (m.t === "play" || m.t === "pocket") clearOrder.push(m.slot);
    sim = SC.applyMove(deck, sim, m);
    if (SC.starsLeft(sim) < closestLeft) closestLeft = SC.starsLeft(sim);
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
    if (drawing) return;
    if (sim.stockPtr >= deck.stock.length) { flashHint("Stock is empty for tonight"); return; }
    // Near the end, the card you turn over is the whole run. Hold it a beat,
    // and jitter the beat so the wait never settles into a rhythm.
    var left = SC.starsLeft(sim);
    var wait = (left <= 5 && !Arcade.reducedMotion()) ? 240 + Math.floor(Math.random() * 260) : 0;
    if (!wait) { pushMove({ t: "draw" }); tone("draw"); return; }
    drawing = true;
    stockPile.classList.add("shake");
    setTimeout(function () {
      stockPile.classList.remove("shake");
      drawing = false;
      pushMove({ t: "draw" });
      tone("draw");
    }, wait);
  });

  pocketPile.addEventListener("click", function () {
    if (sim.pocket !== -1) {
      if (sim.wasteRank == null || !SC.adjacent(deck.pyramid[sim.pocket].rank, sim.wasteRank)) {
        flashHint("Needs to be next to the " + SC.RANK_LABELS[sim.wasteRank]);
        pocketPile.classList.remove("shake");
        void pocketPile.offsetWidth;
        pocketPile.classList.add("shake");
        return;
      }
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
    applyView(replayView(data.current.moves));
    pocketArmed = false;
    hideResult();
    persist();
    render();
  });

  function restartSame() {
    data.current.moves = [];
    applyView(replayView(data.current.moves));
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

  // Consecutive days played, counted back from today (or from yesterday, so
  // a sky not yet opened tonight doesn't read as a broken run).
  function currentStreak() {
    function keyOf(d) {
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
    var cursor = new Date(today + "T00:00:00");
    if (!data.playedDates[today]) cursor.setDate(cursor.getDate() - 1);
    var n = 0;
    while (data.playedDates[keyOf(cursor)]) {
      n++;
      cursor.setDate(cursor.getDate() - 1);
      if (n > 4000) break;
    }
    return n;
  }

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

  function hideResult() {
    resultEl.hidden = true;
    resultEl.classList.remove("miss");
  }

  // The night's constellation: the stars, in the order the player cleared
  // them, joined one line at a time. Both the shape and the route are the
  // player's own, so no two nights draw the same picture.
  function buildConstellationSvg(container, order, reduced) {
    var UNIT = 26, GAP = 5;
    function le(r, c) { return (UNIT + GAP) * (c + (5 - r) / 2); }
    function te(r) { return r * (UNIT * 0.72); }
    var W = 6 * UNIT + 5 * GAP, H = te(5) + UNIT;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var pts = [];
    for (var i = 0; i < SC.TOTAL_SLOTS; i++) {
      var m = SC.META[i];
      pts[i] = {
        x: le(m.row, m.col) + UNIT / 2 + jitter[i].x * UNIT * 0.28,
        y: te(m.row) + UNIT / 2 + jitter[i].y * UNIT * 0.28
      };
    }

    var STEP = 80, LINEDUR = 320;
    var seq = (order && order.length === SC.TOTAL_SLOTS) ? order : SC.META.map(function (m, k) { return k; });
    var edges = constellationEdges(seq);
    for (i = 0; i < edges.length; i++) {
      var a = pts[edges[i][0]], b = pts[edges[i][1]];
      var line = document.createElementNS(svg.namespaceURI, "line");
      line.setAttribute("x1", a.x); line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x); line.setAttribute("y2", b.y);
      line.setAttribute("class", "peakLine");
      if (!reduced) line.style.animationDelay = (i * STEP) + "ms";
      svg.appendChild(line);
    }
    var total = reduced ? 0 : (edges.length - 1) * STEP + LINEDUR;

    for (i = 0; i < seq.length; i++) {
      var slot = seq[i], p = pts[slot];
      var c = document.createElementNS(svg.namespaceURI, "circle");
      c.setAttribute("cx", p.x); c.setAttribute("cy", p.y);
      c.setAttribute("r", slot === 0 ? 3.4 : 2.2);
      c.setAttribute("class", "peakDot" + (slot === 0 ? " north northFlare" : ""));
      if (!reduced) {
        if (slot === 0) c.style.animationDelay = total + "ms";
        else { c.style.opacity = "0"; c.style.animation = "fadeUp 260ms ease-out forwards"; c.style.animationDelay = (i * STEP) + "ms"; }
      }
      svg.appendChild(c);
    }
    container.appendChild(svg);
    return reduced ? 0 : total + 900;
  }

  function showResultWin(fresh) {
    resultEl.hidden = false;
    resultEl.classList.remove("miss");
    resultInner.innerHTML = "";
    var reduced = Arcade.reducedMotion() || !fresh;
    var practice = !!data.current.practice;
    var spare = deck.stock.length - sim.stockPtr;

    var stage = el("div", "peakStage");
    resultInner.appendChild(stage);
    var totalMs = buildConstellationSvg(stage, clearOrder, reduced);

    // Everything below waits for the sky to finish drawing. The score is the
    // payoff, so it must not be readable while the build-up is still running.
    var at = totalMs;
    function staged(node, gap) {
      at += (gap == null ? 260 : gap);
      if (!reduced) { node.classList.add("staged"); node.style.animationDelay = at + "ms"; }
      resultInner.appendChild(node);
      return node;
    }

    if (!practice) staged(el("div", "constellation", "✦ " + window.SkyNames.pick(data.current.seed)), 60);
    staged(el("div", "verdict", practice ? "Practice sky" : "Tonight's sky"), 340);
    staged(el("div", "headline", "Solved"), 120);
    staged(el("div", "score", spare + (spare === 1 ? " card" : " cards") + " to spare"), 220);
    if (!practice && spare >= data.best && spare > 0) staged(el("div", "subline", "Your best yet."), 160);

    var stat = el("div", "statCard");
    var nights = Object.keys(data.playedDates).length;
    [["Nights played", nights], ["Dailies solved", solvedCount()], ["Best to spare", data.best]].forEach(function (r) {
      var row = el("div", "statRow");
      row.appendChild(el("span", null, r[0]));
      row.appendChild(el("b", null, String(r[1])));
      stat.appendChild(row);
    });
    staged(stat, 260);
    staged(el("div", "signoff", signoffLine()), 200);

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
    staged(actions, 220);
    resultInner.appendChild(shareHint);

    // Anyone who doesn't want to wait out the reveal can tap through it.
    if (!reduced) {
      var skip = function () {
        resultEl.removeEventListener("click", skip);
        [].forEach.call(resultInner.querySelectorAll(".staged"), function (n) {
          n.style.animationDelay = "0ms";
        });
      };
      resultEl.addEventListener("click", skip);
      setTimeout(function () { resultEl.removeEventListener("click", skip); }, at + 600);
    }

    // The chime and the confetti belong to the flare, not to the tap that
    // set it off.
    var bigNight = spare >= 15 || (data.best === spare && spare > 0);
    if (fresh) {
      if (reduced) { tone("north"); if (bigNight) Arcade.confetti(["#ffe066", "#a5f3ef", "#eafffb"]); }
      else {
        setTimeout(function () { tone("north"); }, Math.max(0, totalMs - 900));
        if (bigNight) setTimeout(function () { Arcade.confetti(["#ffe066", "#a5f3ef", "#eafffb"]); }, totalMs);
      }
    }
  }

  function showResultMiss() {
    resultEl.hidden = false;
    resultEl.classList.add("miss");
    resultInner.innerHTML = "";
    var practice = !!data.current.practice;
    var left = SC.starsLeft(sim);

    // The near-miss stays on screen: the sheet sits over the live board and
    // the stranded stars pulse behind it.
    render();

    resultInner.appendChild(el("div", "headline", left + (left === 1 ? " star short." : " stars short.")));
    if (closestLeft < left) {
      resultInner.appendChild(el("div", "peakline", "Closest tonight: " + closestLeft + (closestLeft === 1 ? " star left" : " stars left")));
    }
    resultInner.appendChild(el("div", "subline", "Same sky, try again?"));

    var actions = el("div", "actions");
    if (data.current.moves.length) {
      actions.appendChild(button("Undo", "btn quiet", function () {
        data.current.moves.pop();
        applyView(replayView(data.current.moves));
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
      var x = 8 + rng() * 82, y = 10 + rng() * 74;
      var rec = data.days[d];
      // A 10px dot is a 10px target: the star is a 44px button with the dot
      // drawn in the middle of it.
      var star = el("button", "archiveStar" + (rec && rec.solved ? " solved" : "") + (d === today ? " today" : ""));
      star.setAttribute("aria-label", prettyDate(d) + (rec && rec.solved ? ", solved" : ", played"));
      star.style.left = x + "%";
      star.style.top = y + "%";
      star.addEventListener("click", function () { showArchiveDetail(d); });
      archiveField.appendChild(star);
    });

    var legend = document.querySelector(".archiveLegend");
    if (!legend) {
      legend = el("div", "archiveLegend");
      archiveField.parentNode.insertBefore(legend, archiveField.nextSibling);
    }
    legend.textContent = dates.length ? "Gold: solved · White: played · Tap a star" : "Play a sky and it joins your archive.";

    archiveStats.innerHTML = "";
    var nights = dates.length;
    [["Nights played", nights], ["Dailies solved", solvedCount()], ["Best to spare", data.best], ["Current run", currentStreak()]]
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
      label: "Restart sky",
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
