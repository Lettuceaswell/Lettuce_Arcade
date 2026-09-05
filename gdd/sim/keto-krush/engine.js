// Keto Krush — headless engine port.
// Ports games/keto-krush/index.html rules exactly (see SIM-NOTES.md for any
// discrepancies found & resolved in the game's favour). No I/O, no DOM.
"use strict";

const N = 6;
// icons: 0,1 = protein (meat, cheese); 2,3,4 = carb (pizza, croissant, cookie)
const PROTEIN = { 0: true, 1: true };

const DEFAULT_CONFIG = {
  N,
  ketosisStart: 50,
  proteinGain: 4,
  carbLoss: 3,
  tiers: [
    { name: "crash", min: 0, mult: 0.5, drain: 1 },
    { name: "normal", min: 16, mult: 1, drain: 1 },
    { name: "keto", min: 70, mult: 2, drain: 2 },
    { name: "deep", min: 85, mult: 3, drain: 3 },
  ],
  drainFloor: 40,
  sugarRush: 1.5,
  frenzyMult: 4,
  frenzyMoves: 5,
  frenzyLand: 70,
  pointsPerTile: 10,
  moveBudget: 30,
  refund: { keto: 2, deep: 2, frenzy: 5 },
  // Audit-only historical toggles. Both default to the SHIPPED behaviour.
  // `carbWaiverNoProtein` reproduces the pre-v20 `meterFrozen` rule (carbs cost
  // no meter on a move where the board offered no protein swap); `cascadeTierFloor`
  // off reproduces the pre-v28 rule (cascade steps could drop you a tier).
  carbWaiverNoProtein: false,
  cascadeTierFloor: true,
  // New tuning-experiment flags. specialFloorStep1 shipped in v33 (now the
  // default, on); detonationCarbsFree remains an audit-only experiment (off).
  specialFloorStep1: true,
  detonationCarbsFree: false,
};

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function tierFor(tiers, value) {
  let t = tiers[0];
  for (let i = 1; i < tiers.length; i++) if (value >= tiers[i].min) t = tiers[i];
  return t;
}

function cloneGrid(grid) {
  const out = new Array(N);
  for (let r = 0; r < N; r++) {
    out[r] = new Array(N);
    for (let c = 0; c < N; c++) out[r][c] = { icon: grid[r][c].icon, type: grid[r][c].type };
  }
  return out;
}

function wouldMatch(grid, row, col, icon) {
  if (col >= 2) {
    const a = grid[row][col - 1], b = grid[row][col - 2];
    if (a && b && a.icon === icon && b.icon === icon) return true;
  }
  if (row >= 2) {
    const c = grid[row - 1][col], d = grid[row - 2][col];
    if (c && d && c.icon === icon && d.icon === icon) return true;
  }
  return false;
}

function findMatchRuns(grid) {
  const runs = [];
  for (let row = 0; row < N; row++) {
    let runStart = 0, runIcon = grid[row][0].icon;
    for (let col = 1; col <= N; col++) {
      const icon = col < N ? grid[row][col].icon : null;
      if (col < N && icon === runIcon) continue;
      if (col - runStart >= 3) {
        const positions = [];
        for (let k = runStart; k < col; k++) positions.push({ row, col: k });
        runs.push({ positions, orientation: "row" });
      }
      runStart = col; runIcon = icon;
    }
  }
  for (let col = 0; col < N; col++) {
    let runStart = 0, runIcon = grid[0][col].icon;
    for (let row = 1; row <= N; row++) {
      const icon = row < N ? grid[row][col].icon : null;
      if (row < N && icon === runIcon) continue;
      if (row - runStart >= 3) {
        const positions = [];
        for (let k = runStart; k < row; k++) positions.push({ row: k, col });
        runs.push({ positions, orientation: "col" });
      }
      runStart = row; runIcon = icon;
    }
  }
  return runs;
}

function findMatchPositions(grid) {
  const runs = findMatchRuns(grid);
  const seen = {};
  const out = [];
  runs.forEach((run) => run.positions.forEach((p) => {
    const key = p.row + "," + p.col;
    if (!seen[key]) { seen[key] = true; out.push(p); }
  }));
  return out;
}

function swapCells(grid, r1, c1, r2, c2) {
  const tmp = grid[r1][c1];
  grid[r1][c1] = grid[r2][c2];
  grid[r2][c2] = tmp;
}

function hasAnyMove(grid) {
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      if (col + 1 < N) {
        swapCells(grid, row, col, row, col + 1);
        const m1 = findMatchPositions(grid).length > 0;
        swapCells(grid, row, col, row, col + 1);
        if (m1) return true;
      }
      if (row + 1 < N) {
        swapCells(grid, row, col, row + 1, col);
        const m2 = findMatchPositions(grid).length > 0;
        swapCells(grid, row, col, row + 1, col);
        if (m2) return true;
      }
    }
  }
  return false;
}

function markSpecial(tile, kind) {
  if (tile.type === kind) return;
  if (tile.type !== "normal" && tile.type !== kind) kind = "cross";
  tile.type = kind;
}

class Game {
  constructor(seed, config) {
    this.cfg = Object.assign({}, DEFAULT_CONFIG, config || {});
    this.cfg.tiers = (config && config.tiers) || DEFAULT_CONFIG.tiers;
    this.cfg.refund = Object.assign({}, DEFAULT_CONFIG.refund, (config && config.refund) || {});
    this.rng = mulberry32(seed);
    this.score = 0;
    this.ketosis = this.cfg.ketosisStart;
    this.frenzyMoves = 0;
    this.frenzyJustStarted = false;
    this.movesLeft = this.cfg.moveBudget;
    this.movesTaken = 0;
    this.armKeto = true;
    this.armDeep = true;
    this.over = false;
    this.overReason = null;
    this.frenzies = 0;
    this.generateBoard();
  }

  randomIcon() { return Math.floor(this.rng() * 5); }

  generateBoard() {
    do {
      const grid = new Array(N);
      for (let row = 0; row < N; row++) {
        grid[row] = new Array(N);
        for (let col = 0; col < N; col++) {
          let icon;
          do { icon = this.randomIcon(); } while (wouldMatch(grid, row, col, icon));
          grid[row][col] = { icon, type: "normal" };
        }
      }
      this.grid = grid;
    } while (!hasAnyMove(this.grid));
  }

  tierFor(v) { return tierFor(this.cfg.tiers, v); }

  currentMultiplier() {
    return this.frenzyMoves > 0 ? this.cfg.frenzyMult : this.tierFor(this.ketosis).mult;
  }

  currentStateName() {
    return this.frenzyMoves > 0 ? "frenzy" : this.tierFor(this.ketosis).name;
  }

  legalMoves() {
    const grid = this.grid;
    const moves = [];
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const dirs = [];
        if (col + 1 < N) dirs.push({ row, col: col + 1 });
        if (row + 1 < N) dirs.push({ row: row + 1, col });
        for (const target of dirs) {
          swapCells(grid, row, col, target.row, target.col);
          const matches = findMatchPositions(grid);
          const tiles = matches.map((p) => ({ row: p.row, col: p.col, icon: grid[p.row][p.col].icon }));
          swapCells(grid, row, col, target.row, target.col);
          if (!matches.length) continue;
          moves.push({
            a: { row, col }, b: target,
            size: matches.length,
            protein: tiles.some((t) => PROTEIN[t.icon]),
            tiles,
          });
        }
      }
    }
    return moves;
  }

  // Step-1-only preview (no mutation): the score/meter effect of the initial
  // match, before any cascade resolution or refill.
  previewMove(move) {
    const grid = cloneGrid(this.grid);
    swapCells(grid, move.a.row, move.a.col, move.b.row, move.b.col);
    const runs = findMatchRuns(grid);
    const { gained, proteinCount, carbCount } = this._stepClear(grid, runs, {});
    const rush = gained > 0 && proteinCount === 0 ? this.cfg.sugarRush : 1;
    const mult = this.currentMultiplier();
    const ptsStep1 = Math.round(gained * this.cfg.pointsPerTile * 1 * mult * rush);
    let meterAfterStep1 = this.ketosis;
    if (this.frenzyMoves === 0) {
      const loss = carbCount * this.cfg.carbLoss;
      meterAfterStep1 = Math.max(0, Math.min(100, this.ketosis + proteinCount * this.cfg.proteinGain - loss));
    }
    return { ptsStep1, proteinCount, carbCount, meterAfterStep1 };
  }

  // Shared cleared-set computation (runs -> clearedSet with chain-detonation
  // of existing specials, plus new-special assignment). Mutates `newSpecials`
  // (caller-provided map) in place; does not mutate grid/tile types.
  _stepClear(grid, runs, newSpecials) {
    const clearedSet = {};
    const runOrigin = {};
    runs.forEach((run) => {
      run.positions.forEach((p) => {
        const k = p.row + "," + p.col;
        clearedSet[k] = true;
        runOrigin[k] = true;
      });
      if (run.positions.length >= 4) {
        const mid = run.positions[Math.floor(run.positions.length / 2)];
        const key = mid.row + "," + mid.col;
        const kind = run.orientation === "row" ? "row" : "col";
        if (newSpecials[key] && newSpecials[key] !== kind) newSpecials[key] = "cross";
        else if (!newSpecials[key]) newSpecials[key] = kind;
      }
    });
    const queue = Object.keys(clearedSet);
    let qi = 0;
    let triggeredSpecial = false;
    while (qi < queue.length) {
      const key = queue[qi++];
      const [r, c] = key.split(",").map(Number);
      const t = grid[r] && grid[r][c];
      if (!t || newSpecials[key]) continue;
      if (t.type === "row" || t.type === "cross") {
        triggeredSpecial = true;
        for (let cc = 0; cc < N; cc++) {
          const k2 = r + "," + cc;
          if (!clearedSet[k2]) { clearedSet[k2] = true; queue.push(k2); }
        }
      }
      if (t.type === "col" || t.type === "cross") {
        triggeredSpecial = true;
        for (let rr = 0; rr < N; rr++) {
          const k3 = rr + "," + c;
          if (!clearedSet[k3]) { clearedSet[k3] = true; queue.push(k3); }
        }
      }
    }
    let gained = 0, proteinCount = 0, carbCount = 0, carbCountDetonation = 0;
    Object.keys(clearedSet).forEach((key) => {
      const [r, c] = key.split(",").map(Number);
      const t = grid[r][c];
      if (!t) return;
      gained++;
      if (PROTEIN[t.icon]) proteinCount++;
      else {
        carbCount++;
        if (!runOrigin[key]) carbCountDetonation++;
      }
    });
    return { clearedSet, triggeredSpecial, gained, proteinCount, carbCount, carbCountDetonation };
  }

  collapseColumn(col) {
    const grid = this.grid;
    const existing = [];
    for (let row = 0; row < N; row++) {
      if (grid[row][col]) existing.push(grid[row][col]);
      grid[row][col] = null;
    }
    let writeRow = N - 1;
    for (let i = existing.length - 1; i >= 0; i--) {
      grid[writeRow][col] = existing[i];
      writeRow--;
    }
    for (let row = writeRow; row >= 0; row--) {
      grid[row][col] = { icon: this.randomIcon(), type: "normal" };
    }
  }

  payRefunds(record) {
    const cfg = this.cfg;
    if (this.ketosis < 70) this.armKeto = true;
    if (this.ketosis < 85) this.armDeep = true;
    if (this.ketosis >= 70 && this.armKeto) {
      this.movesLeft += cfg.refund.keto;
      if (record) record.refund += cfg.refund.keto;
      this.armKeto = false;
    }
    if (this.ketosis >= 85 && this.armDeep) {
      this.movesLeft += cfg.refund.deep;
      if (record) record.refund += cfg.refund.deep;
      this.armDeep = false;
    }
  }

  endOfMove(record) {
    const cfg = this.cfg;
    if (this.frenzyMoves > 0) {
      if (this.frenzyJustStarted) {
        this.frenzyJustStarted = false;
      } else {
        this.frenzyMoves--;
        if (this.frenzyMoves === 0) {
          this.ketosis = cfg.frenzyLand;
          record.frenzyEnded = true;
        }
      }
    } else if (this.ketosis > cfg.drainFloor) {
      this.ketosis = Math.max(cfg.drainFloor, this.ketosis - this.tierFor(this.ketosis).drain);
    }
    this.payRefunds(record);
    this.movesLeft--;
    this.movesTaken++;
  }

  applyMove(move, extra) {
    extra = extra || {};
    const cfg = this.cfg;
    const grid = this.grid;
    const meterBefore = this.ketosis;
    const stateBefore = this.currentStateName();
    const tierBefore = stateBefore;

    const record = {
      move: this.movesTaken + 1,
      meterBefore, meterAfter: null,
      tierBefore, stateAfter: null,
      pts: 0, steps: 0, gained: 0, protein: 0, carb: 0,
      rushTaken: false, tierChange: 0,
      refund: 0, frenzyStarted: false, frenzyEnded: false,
      movesLeftAfter: null, crashed: false, peakThisMove: meterBefore,
      altProteinPts: extra.altProteinPts != null ? extra.altProteinPts : null,
      altCarbPts: extra.altCarbPts != null ? extra.altCarbPts : null,
    };

    const meterFrozen = cfg.carbWaiverNoProtein
      ? !this.legalMoves().some((m) => m.protein)
      : false;

    swapCells(grid, move.a.row, move.a.col, move.b.row, move.b.col);
    let comboStep = 0;
    let runs = findMatchRuns(grid);

    const step = () => {
      comboStep++;
      const newSpecials = {};
      const { clearedSet, triggeredSpecial, gained, proteinCount, carbCount, carbCountDetonation } = this._stepClear(grid, runs, newSpecials);

      const rush = gained > 0 && proteinCount === 0 ? cfg.sugarRush : 1;
      if (comboStep === 1) record.rushTaken = rush > 1;
      const mult = this.currentMultiplier();
      const pts = Math.round(gained * cfg.pointsPerTile * comboStep * mult * rush);
      this.score += pts;
      record.pts += pts;
      record.gained += gained;
      record.protein += proteinCount;
      record.carb += carbCount;
      record.steps = comboStep;
      if (!record.pointsByTier) record.pointsByTier = { crash: 0, normal: 0, keto: 0, deep: 0, frenzy: 0 };
      record.pointsByTier[this.currentStateName()] += pts;
      if (triggeredSpecial) record.specialDetonated = true;

      if (this.frenzyMoves === 0) {
        const effectiveCarbCount = cfg.detonationCarbsFree ? carbCount - carbCountDetonation : carbCount;
        const loss = meterFrozen ? 0 : effectiveCarbCount * cfg.carbLoss;
        const floor = (comboStep > 1 && cfg.cascadeTierFloor) ||
          (comboStep === 1 && cfg.specialFloorStep1 && triggeredSpecial)
          ? Math.min(this.ketosis, this.tierFor(this.ketosis).min) : 0;
        this.ketosis = Math.max(floor, Math.min(100, this.ketosis + proteinCount * cfg.proteinGain - loss));
        if (this.ketosis > record.peakThisMove) record.peakThisMove = this.ketosis;
        if (this.tierFor(this.ketosis).name === "crash") record.crashed = true;
        if (this.ketosis >= 100) {
          this.frenzyMoves = cfg.frenzyMoves;
          this.frenzyJustStarted = true;
          this.frenzies++;
          this.movesLeft += cfg.refund.frenzy;
          record.refund += cfg.refund.frenzy;
          record.frenzyStarted = true;
          this.armKeto = false;
          this.armDeep = false;
        } else {
          this.payRefunds(record);
        }
      }

      // Convert new specials; clear the rest.
      const cols = {};
      Object.keys(clearedSet).forEach((key) => {
        const [r, c] = key.split(",").map(Number);
        if (newSpecials[key]) {
          markSpecial(grid[r][c], newSpecials[key]);
          return;
        }
        grid[r][c] = null;
        cols[c] = true;
      });
      Object.keys(cols).forEach((c) => this.collapseColumn(Number(c)));

      const next = findMatchRuns(grid);
      if (next.length) {
        runs = next;
        step();
      } else {
        this.endOfMove(record);
      }
    };
    step();

    record.meterAfter = this.ketosis;
    record.stateAfter = this.currentStateName();
    const tierRank = { crash: 0, normal: 1, keto: 2, deep: 3, frenzy: 4 };
    record.tierChange = record.stateAfter === "frenzy" && tierBefore !== "frenzy"
      ? "frenzy"
      : Math.sign((tierRank[record.stateAfter] || 0) - (tierRank[tierBefore] || 0));
    record.movesLeftAfter = this.movesLeft;

    if (this.movesLeft <= 0) {
      this.over = true; this.overReason = "budget";
    } else if (!hasAnyMove(this.grid)) {
      this.over = true; this.overReason = "lock";
    }
    return record;
  }

  state() {
    return {
      meter: this.ketosis,
      score: this.score,
      movesLeft: this.movesLeft,
      tier: this.currentStateName(),
      frenzyMoves: this.frenzyMoves,
      movesTaken: this.movesTaken,
    };
  }
}

module.exports = { Game, mulberry32, tierFor, findMatchRuns, findMatchPositions, hasAnyMove, N, PROTEIN, DEFAULT_CONFIG };
