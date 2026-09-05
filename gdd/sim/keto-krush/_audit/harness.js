// Parity harness: loads the SHIPPED game script in Node with a stubbed DOM,
// with setTimeout/rAF made synchronous and Math.random seeded, so the game's
// own resolveCascade/endOfMove run headlessly. Read-only w.r.t. games/.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const { mulberry32 } = require("../engine.js");

const HTML = path.join(__dirname, "..", "..", "..", "..", "games", "keto-krush", "index.html");

function extractScript() {
  const lines = fs.readFileSync(HTML, "utf8").split(/\r?\n/);
  let start = -1, end = -1;
  for (let i = 0; i < lines.length; i++) {
    if (start === -1 && lines[i].trim() === "<script>") start = i + 1;
    else if (start !== -1 && lines[i].trim() === "</" + "script>") { end = i; break; }
  }
  return lines.slice(start, end).join("\n");
}

function makeEl(tag) {
  const el = {
    tagName: tag, dataset: {},
    style: { setProperty() {}, removeProperty() {}, getPropertyValue() { return ""; } },
    children: [], firstChild: null,
    textContent: "", innerHTML: "", offsetWidth: 0, className: "",
    _cls: new Set(),
    appendChild(c) { el.children.push(c); el.firstChild = el.children[0]; return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); el.firstChild = el.children[0] || null; return c; },
    remove() {},
    addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute() { return null; },
    querySelector() { return makeEl("div"); }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 40, height: 40 }; },
    focus() {}, blur() {}, click() {},
    getContext() { return null; }, toBlob: null,
  };
  el.classList = {
    add() { for (const c of arguments) el._cls.add(c); },
    remove() { for (const c of arguments) el._cls.delete(c); },
    toggle(c, on) { if (on === undefined) { if (el._cls.has(c)) el._cls.delete(c); else el._cls.add(c); } else if (on) el._cls.add(c); else el._cls.delete(c); },
    contains(c) { return el._cls.has(c); },
  };
  return el;
}

function run(seed, chooser, maxMoves) {
  const rand = mulberry32(seed);
  let rafT = 0;
  const sandbox = {};
  const document = {
    body: makeEl("body"),
    documentElement: makeEl("html"),
    getElementById() { return makeEl("div"); },
    createElement: makeEl,
    createElementNS: function (ns, t) { return makeEl(t); },
    createTextNode: function (t) { return { nodeValue: t }; },
    querySelector: function () { return makeEl("div"); },
    querySelectorAll: function () { return []; },
    addEventListener() {}, removeEventListener() {},
  };
  const Arcade = {
    boot(cb) { cb(); },
    backButton() {}, menuButton() {}, brag() {}, confetti() {},
    share() { return Promise.resolve({}); },
    cardDate() { return ""; }, audioCtx: null,
    _store: {},
    save(k, v) { Arcade._store[k] = v; },
    load(k, d) { return Object.prototype.hasOwnProperty.call(Arcade._store, k) ? Arcade._store[k] : d; },
    VERSION: 0,
  };
  const win = {
    innerWidth: 400, innerHeight: 800, matchMedia: null, File: null,
    addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1,
  };
  Object.assign(sandbox, {
    document: document, window: win, Arcade: Arcade, navigator: { share: null },
    localStorage: { getItem: function () { return null; }, setItem() {}, removeItem() {} },
    setTimeout: function (fn) { fn(); return 0; },
    clearTimeout() {}, setInterval: function () { return 0; }, clearInterval() {},
    requestAnimationFrame: function (fn) { rafT += 1e6; fn(rafT); return 0; },
    cancelAnimationFrame() {},
    Math: Object.create(Math), console: console,
    performance: { now: function () { rafT += 1e6; return rafT; } },
  });
  sandbox.Math.random = rand;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  const tail = "\n__exposed = {" +
    " get grid(){return grid;}, get ketosis(){return ketosis;}, get score(){return score;}," +
    " get movesLeft(){return movesLeft;}, get movesTaken(){return movesTaken;}," +
    " get frenzyMoves(){return frenzyMoves;}, get runOver(){return runOver;}," +
    " get armKeto(){return armKeto;}, get armDeep(){return armDeep;}," +
    " get frenzies(){return run.frenzies;}, get maxCombo(){return run.maxCombo;}," +
    " get byTier(){return run.byTier;}, get peak(){return run.peak;}," +
    " findMatches: findMatches, swapCells: swapCells, PROTEIN_ICONS: PROTEIN_ICONS," +
    " N: N, attemptSwap: attemptSwap };";
  vm.runInContext("var __exposed = null;\n" + extractScript() + tail, sandbox);
  const G = sandbox.__exposed;

  function legalMoves() {
    const out = [];
    for (let row = 0; row < G.N; row++) for (let col = 0; col < G.N; col++) {
      const dirs = [];
      if (col + 1 < G.N) dirs.push({ row: row, col: col + 1 });
      if (row + 1 < G.N) dirs.push({ row: row + 1, col: col });
      for (const t of dirs) {
        G.swapCells(row, col, t.row, t.col);
        const m = G.findMatches();
        const tiles = m.map(function (p) { return G.grid[p.row][p.col]; });
        G.swapCells(row, col, t.row, t.col);
        if (!m.length) continue;
        out.push({ a: { row: row, col: col }, b: t, size: m.length,
                   protein: tiles.some(function (x) { return G.PROTEIN_ICONS[x.icon]; }) });
      }
    }
    return out;
  }

  const trace = [];
  let i = 0;
  while (!G.runOver && i < (maxMoves || 100000)) {
    const moves = legalMoves();
    if (!moves.length) break;
    const mv = chooser(moves, i);
    const before = G.ketosis, mlBefore = G.movesLeft;
    G.attemptSwap(mv.a, mv.b);
    trace.push({ n: G.movesTaken, meterBefore: before, meterAfter: G.ketosis,
      score: G.score, movesLeft: G.movesLeft, refund: G.movesLeft - (mlBefore - 1),
      frenzyMoves: G.frenzyMoves, peak: G.peak, maxCombo: G.maxCombo });
    i++;
  }
  return { trace: trace, score: G.score, moves: G.movesTaken, ketosis: G.ketosis,
           frenzies: G.frenzies, maxCombo: G.maxCombo, movesLeft: G.movesLeft, over: G.runOver };
}
module.exports = { run: run };
