/* Tonight's Sky — deterministic rules engine.
   Pure functions only: deck building, move legality, move application, and
   a bounded solvability search. game.js drives play by replaying a move
   log through the same applyMove() the solver uses, so "what the player
   can do" and "what the solver proved possible" can never drift apart. */

(function () {
  "use strict";

  var RANK_LABELS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  var SUITS = [
    { sym: "♠", red: false }, // spades
    { sym: "♥", red: true },  // hearts
    { sym: "♦", red: true },  // diamonds
    { sym: "♣", red: false }  // clubs
  ];
  var ROWS = 6;                          // row 0 = North Star tip, row 5 = 6-card base
  var TOTAL_SLOTS = ROWS * (ROWS + 1) / 2; // 21
  var FULL_MASK = (1 << TOTAL_SLOTS) - 1;

  function slotIndex(r, c) { return (r * (r + 1)) / 2 + c; }

  // Each slot's "children": the two slots one row down that must both be
  // cleared before this slot flips face up. The base row has none, so it
  // starts uncovered.
  var META = [];
  (function buildMeta() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c <= r; c++) {
        var children = r < ROWS - 1 ? [slotIndex(r + 1, c), slotIndex(r + 1, c + 1)] : [];
        META.push({ row: r, col: c, children: children });
      }
    }
  })();

  function isUncovered(removedMask, i) {
    var ch = META[i].children;
    if (!ch.length) return true;
    return ((removedMask >> ch[0]) & 1) !== 0 && ((removedMask >> ch[1]) & 1) !== 0;
  }

  // Ranks are adjacent by one step; King-Ace wraps (distance 12 in 1..13).
  function adjacent(a, b) {
    var d = Math.abs(a - b);
    return d === 1 || d === 12;
  }

  function buildDeck(seedString) {
    var rng = Arcade.seededRandom(seedString);
    var cards = [];
    for (var s = 0; s < 4; s++) for (var r = 1; r <= 13; r++) cards.push({ rank: r, suit: s });
    for (var i = cards.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = cards[i]; cards[i] = cards[j]; cards[j] = t;
    }
    return { pyramid: cards.slice(0, TOTAL_SLOTS), stock: cards.slice(TOTAL_SLOTS) };
  }

  // Dynamic state: which pyramid slots are gone, how far into the stock we
  // are, which slot (if any) sits in the pocket, and the waste's rank. The
  // waste starts on the first stock card, per the GDD.
  function initialState(deck) {
    return {
      removedMask: 0,
      stockPtr: deck.stock.length ? 1 : 0,
      pocket: -1,
      wasteRank: deck.stock.length ? deck.stock[0].rank : null
    };
  }

  function legalMoves(deck, s) {
    var moves = [];
    for (var i = 0; i < TOTAL_SLOTS; i++) {
      if ((s.removedMask >> i) & 1) continue;
      if (!isUncovered(s.removedMask, i)) continue;
      if (s.wasteRank != null && adjacent(deck.pyramid[i].rank, s.wasteRank)) moves.push({ t: "play", slot: i });
      if (s.pocket === -1) moves.push({ t: "pocket", slot: i });
    }
    if (s.pocket !== -1) moves.push({ t: "unpocket" });
    if (s.stockPtr < deck.stock.length) moves.push({ t: "draw" });
    return moves;
  }

  function applyMove(deck, s, m) {
    var n = { removedMask: s.removedMask, stockPtr: s.stockPtr, pocket: s.pocket, wasteRank: s.wasteRank };
    if (m.t === "draw") {
      n.wasteRank = deck.stock[n.stockPtr].rank;
      n.stockPtr = n.stockPtr + 1;
    } else if (m.t === "play") {
      n.removedMask = n.removedMask | (1 << m.slot);
      n.wasteRank = deck.pyramid[m.slot].rank;
    } else if (m.t === "pocket") {
      n.removedMask = n.removedMask | (1 << m.slot);
      n.pocket = m.slot;
    } else if (m.t === "unpocket") {
      n.wasteRank = deck.pyramid[n.pocket].rank;
      n.pocket = -1;
    }
    return n;
  }

  function isWin(s) { return s.removedMask === FULL_MASK && s.pocket === -1; }

  // No forward progress: the stock is spent, the waste doesn't unlock
  // anything on the sky, and the pocket (empty or full) doesn't either.
  // An empty pocket is never itself a dead end — pocketing any uncovered
  // star is always legal — so this only fires once the pocket is occupied
  // and useless too.
  function isStuck(deck, s) {
    if (s.stockPtr < deck.stock.length) return false;
    if (isWin(s)) return false;
    var anyUncovered = false;
    for (var i = 0; i < TOTAL_SLOTS; i++) {
      if ((s.removedMask >> i) & 1) continue;
      if (!isUncovered(s.removedMask, i)) continue;
      anyUncovered = true;
      if (s.wasteRank != null && adjacent(deck.pyramid[i].rank, s.wasteRank)) return false;
      if (s.pocket !== -1 && adjacent(deck.pyramid[i].rank, deck.pyramid[s.pocket].rank)) return false;
    }
    if (s.pocket === -1) return false; // free to pocket the next uncovered star instead
    return anyUncovered || s.pocket !== -1;
  }

  // Cards still sitting on the pyramid (a pocketed card has already left it,
  // even though it hasn't reached the waste yet).
  function starsLeft(s) {
    var left = 0;
    for (var i = 0; i < TOTAL_SLOTS; i++) if (!((s.removedMask >> i) & 1)) left++;
    return left;
  }

  // Replays a move log from scratch. Trusts the log (it was only ever
  // built by this same engine), so it applies moves without re-checking
  // legality — replay is how the current state is reconstructed after
  // every save/reload/undo.
  function replay(deck, moves) {
    var s = initialState(deck);
    for (var i = 0; i < moves.length; i++) s = applyMove(deck, s, moves[i]);
    return s;
  }

  // Bounded DFS with memoized visited-states, ordered to try direct
  // progress before busywork. Stops and reports "not solved" once the
  // node budget is spent, rather than exhausting the whole space.
  function solve(deck, nodeBudget) {
    var visited = new Set();
    var nodes = 0;
    var overBudget = false;
    var ORDER = { play: 0, unpocket: 1, pocket: 2, draw: 3 };

    function stateKey(s) {
      return s.removedMask * 100000 + s.stockPtr * 3000 + (s.pocket + 1) * 14 + (s.wasteRank || 0);
    }

    function dfs(s) {
      nodes++;
      if (nodes > nodeBudget) { overBudget = true; return false; }
      if (isWin(s)) return true;
      var key = stateKey(s);
      if (visited.has(key)) return false;
      visited.add(key);
      var moves = legalMoves(deck, s);
      moves.sort(function (a, b) { return ORDER[a.t] - ORDER[b.t]; });
      for (var i = 0; i < moves.length; i++) {
        if (dfs(applyMove(deck, s, moves[i]))) return true;
        if (overBudget) return false;
      }
      return false;
    }

    var solved = dfs(initialState(deck));
    return { solved: solved, nodes: nodes, overBudget: overBudget };
  }

  // Tries baseSeed, then baseSeed#1, #2, ... until one solves within the
  // node budget or attempts run out; falls back to the last candidate
  // tried (per the GDD) rather than leaving the deal undefined.
  function findSolvableDeal(baseSeed, opts) {
    opts = opts || {};
    var maxAttempts = opts.maxAttempts || 200;
    var nodeBudget = opts.nodeBudget || 25000;
    var seed = baseSeed, deck = null, result = null;
    for (var i = 0; i < maxAttempts; i++) {
      seed = i === 0 ? baseSeed : (baseSeed + "#" + i);
      deck = buildDeck(seed);
      result = solve(deck, nodeBudget);
      if (result.solved) return { seed: seed, deck: deck, solvable: true, attempts: i + 1 };
    }
    return { seed: seed, deck: deck, solvable: false, attempts: maxAttempts };
  }

  window.SkyCore = {
    RANK_LABELS: RANK_LABELS,
    SUITS: SUITS,
    META: META,
    ROWS: ROWS,
    TOTAL_SLOTS: TOTAL_SLOTS,
    FULL_MASK: FULL_MASK,
    slotIndex: slotIndex,
    isUncovered: isUncovered,
    adjacent: adjacent,
    buildDeck: buildDeck,
    initialState: initialState,
    legalMoves: legalMoves,
    applyMove: applyMove,
    isWin: isWin,
    isStuck: isStuck,
    starsLeft: starsLeft,
    replay: replay,
    solve: solve,
    findSolvableDeal: findSolvableDeal
  };
})();
