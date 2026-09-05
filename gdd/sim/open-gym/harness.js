// Headless Node harness for games/open-gym/index.html.
// Extracts the game's inline script and runs it in a vm context with a
// minimal DOM/Arcade shim, then exposes the game's internals (state,
// functions, LEVELS, etc.) on the returned context for a bot/driver to use.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAME_PATH = path.join(__dirname, "..", "..", "..", "games", "open-gym", "index.html");

function extractGameScript(html) {
  // Grab all inline <script> blocks (no src attr), return the last one
  // (the game logic script, after the <script src="/shared/arcade.js"> tag).
  const blocks = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) blocks.push(m[1]);
  if (!blocks.length) throw new Error("No inline <script> blocks found in " + GAME_PATH);
  return blocks[blocks.length - 1];
}

// ---- mulberry32 / hashString, mirrored from shared/arcade.js ----
function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
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
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededRandom(seedString) {
  const seedFn = hashString(String(seedString));
  return mulberry32(seedFn());
}

// ---- fake DOM ----
function makeStubElement() {
  const el = {
    _children: [],
    textContent: "",
    innerHTML: "",
    disabled: false,
    firstChild: null,
    onclick: null,
    style: { setProperty() {}, },
    classList: {
      _set: new Set(),
      add(...c) { c.forEach((x) => this._set.add(x)); },
      remove(...c) { c.forEach((x) => this._set.delete(x)); },
      toggle(c, force) {
        if (force === undefined) { this._set.has(c) ? this._set.delete(c) : this._set.add(c); }
        else if (force) this._set.add(c); else this._set.delete(c);
      },
      contains(c) { return this._set.has(c); },
    },
    _listeners: {},
    addEventListener(type, fn) {
      (this._listeners[type] = this._listeners[type] || []).push(fn);
    },
    removeEventListener() {},
    appendChild(child) {
      this._children.push(child);
      this.firstChild = this._children[0];
      return child;
    },
    removeChild(child) {
      const i = this._children.indexOf(child);
      if (i !== -1) this._children.splice(i, 1);
      this.firstChild = this._children[0] || null;
      return child;
    },
    setAttribute() {},
    get className() { return this._className || ""; },
    set className(v) {
      this._className = v;
      this.classList._set = new Set(String(v).split(/\s+/).filter(Boolean));
    },
  };
  el.className = "";
  return el;
}

function makeDocument() {
  const elements = {};
  function getOrCreate(id) {
    if (!elements[id]) elements[id] = makeStubElement();
    return elements[id];
  }
  return {
    _elements: elements,
    getElementById(id) { return getOrCreate(id); },
    createElement() { return makeStubElement(); },
    addEventListener() {},
    removeEventListener() {},
    body: makeStubElement(),
    head: makeStubElement(),
    documentElement: makeStubElement(),
    title: "Open Gym — Lettuce Arcade",
    readyState: "complete",
  };
}

function makeWindow(ctx) {
  return {
    innerWidth: 375,
    innerHeight: 812,
    addEventListener() {},
    removeEventListener() {},
    setTimeout: (fn, t) => { if (typeof fn === "function") fn(); return 0; },
    clearTimeout() {},
    matchMedia: () => ({ matches: false }),
    location: { pathname: "/games/open-gym/index.html" },
  };
}

function makeArcade(memory) {
  return {
    boot(fn) { fn(); },
    backButton() { return makeStubElement(); },
    menuButton() { return makeStubElement(); },
    brag() {},
    stats() {},
    save(key, value) { memory[key] = value; },
    load(key, fallback) {
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : fallback;
    },
    seededRandom,
    VERSION: 0,
  };
}

// Builds a fresh vm context running the game script, seeded RNG for
// Math.random, in-memory Arcade.save/load. Returns the context object,
// which exposes state, LEVELS, blockAt, endTurn, etc. directly.
function buildContext({ mathRandomSeed = "seed", memory = {} } = {}) {
  const html = fs.readFileSync(GAME_PATH, "utf8");
  const script = extractGameScript(html);

  const rng = seededRandom(mathRandomSeed);
  const sandbox = {};
  sandbox.document = makeDocument();
  sandbox.window = makeWindow(sandbox);
  sandbox.window.document = sandbox.document;
  sandbox.Arcade = makeArcade(memory);
  sandbox.console = console;
  sandbox.Math = Object.create(Math);
  sandbox.Math.random = rng; // seedable per-run
  sandbox.location = sandbox.window.location;
  sandbox.navigator = { share: undefined };
  sandbox.localStorage = undefined; // Arcade.save/load shimmed above; game never touches this directly

  const context = vm.createContext(sandbox);
  vm.runInContext(script, context, { filename: "open-gym-inline-script.js" });
  return context;
}

module.exports = { buildContext, GAME_PATH, extractGameScript, seededRandom };
