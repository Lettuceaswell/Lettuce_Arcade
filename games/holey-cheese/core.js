/* Holey Cheese — rules engine. No DOM, no Arcade, no globals but Cheese.
   Kept separate from game.js so the rule can be read on its own: it is the
   whole game, and it is nine lines of it. */

(function () {
  "use strict";

  var N = 7;                 // the board is 7x7, permanently.
  var CELLS = N * N;

  // Orthogonal neighbours, precomputed. Diagonals never count, for spreading
  // or for connectivity. Board edges are edges: a border cell is not touching
  // anything outside the grid.
  var NB = (function () {
    var all = [];
    for (var i = 0; i < CELLS; i++) {
      var r = (i / N) | 0, c = i % N, nb = [];
      if (r > 0) nb.push(i - N);
      if (r < N - 1) nb.push(i + N);
      if (c > 0) nb.push(i - 1);
      if (c < N - 1) nb.push(i + 1);
      all.push(nb);
    }
    return all;
  })();

  var CHEESE = 0, HOLE = 1;

  // How many holes a cheese cell has to be touching before it gives way.
  // This is the whole game in one number, and it was settled by simulation,
  // not taste: at two, a collapse on a board this small is self-sustaining
  // (a front of holes advances into any row holding a single hole), so every
  // run ended either untouched or flattened, with nothing in between. At
  // three the damage travels and then stops, which is the game the design
  // asked for. See gdd/holey-cheese.md for the numbers.
  var SPREAD = 3;

  function holeNeighbours(grid, i) {
    var nb = NB[i], n = 0;
    for (var k = 0; k < nb.length; k++) if (grid[nb[k]] === HOLE) n++;
    return n;
  }

  // ---- the one rule ---------------------------------------------------
  //
  // Any cheese cell orthogonally touching three or more holes becomes a hole.
  // Apply repeatedly until nothing more changes.
  //
  // Mutates `grid` and returns the collapse as a list of generations: one
  // array of cell indices per wave. The caller animates a wave per beat,
  // which is the whole feel of the game — the damage has to be seen
  // travelling. A generation resolves simultaneously, so the result never
  // depends on scan order.

  function collapse(grid) {
    var gens = [];
    for (;;) {
      var falling = [];
      for (var i = 0; i < CELLS; i++) {
        if (grid[i] === HOLE) continue;
        if (holeNeighbours(grid, i) >= SPREAD) falling.push(i);
      }
      if (!falling.length) break;
      for (var j = 0; j < falling.length; j++) grid[falling[j]] = HOLE;
      gens.push(falling);
    }
    return gens;
  }

  // A board is stable when no cheese cell is already at the threshold —
  // i.e. when collapse() would do nothing. Every generated board must pass
  // this, or the wheel falls apart before the player touches it.
  function isStable(grid) {
    for (var i = 0; i < CELLS; i++) {
      if (grid[i] === CHEESE && holeNeighbours(grid, i) >= SPREAD) return false;
    }
    return true;
  }

  // ---- scoring ---------------------------------------------------------
  //
  // The score is the size of the largest orthogonally-connected group of
  // surviving cheese. Same adjacency as the spread rule — the player learns
  // one adjacency concept, not two. Returns { size, cells }, cells ordered
  // by breadth from the group's most interior cell so the ending fill can
  // spread outward from within itself.

  function largestGroup(grid) {
    var seen = new Uint8Array(CELLS), best = null;
    var queue = new Int32Array(CELLS);
    for (var s = 0; s < CELLS; s++) {
      if (grid[s] === HOLE || seen[s]) continue;
      var head = 0, tail = 0, group = [];
      queue[tail++] = s; seen[s] = 1;
      while (head < tail) {
        var i = queue[head++];
        group.push(i);
        var nb = NB[i];
        for (var k = 0; k < nb.length; k++) {
          var j = nb[k];
          if (grid[j] === CHEESE && !seen[j]) { seen[j] = 1; queue[tail++] = j; }
        }
      }
      if (!best || group.length > best.length) best = group;
    }
    if (!best) return { size: 0, cells: [] };
    return { size: best.length, cells: spreadOrder(grid, best) };
  }

  // Breadth-first from the cell furthest from the group's edge, so the fill
  // blooms from the middle of the slab rather than crawling in from a corner.
  function spreadOrder(grid, group) {
    var inGroup = new Uint8Array(CELLS);
    group.forEach(function (i) { inGroup[i] = 1; });
    // Multi-source BFS inward from the group's boundary gives each cell its
    // depth; the deepest cell is the heart of the slab.
    var depth = new Int32Array(CELLS);
    for (var d = 0; d < CELLS; d++) depth[d] = -1;
    var q = [];
    group.forEach(function (i) {
      var nb = NB[i], edge = nb.length < 4;
      for (var k = 0; k < nb.length; k++) if (!inGroup[nb[k]]) edge = true;
      if (edge) { depth[i] = 0; q.push(i); }
    });
    for (var h = 0; h < q.length; h++) {
      var i = q[h], nb = NB[i];
      for (var k = 0; k < nb.length; k++) {
        var j = nb[k];
        if (inGroup[j] && depth[j] === -1) { depth[j] = depth[i] + 1; q.push(j); }
      }
    }
    var heart = group[0];
    group.forEach(function (i) { if (depth[i] > depth[heart]) heart = i; });

    var seen = new Uint8Array(CELLS), out = [];
    seen[heart] = 1; out.push(heart);
    for (var p = 0; p < out.length; p++) {
      var nb2 = NB[out[p]];
      for (var m = 0; m < nb2.length; m++) {
        var n2 = nb2[m];
        if (inGroup[n2] && !seen[n2]) { seen[n2] = 1; out.push(n2); }
      }
    }
    return out;
  }

  function countCheese(grid) {
    var n = 0;
    for (var i = 0; i < CELLS; i++) if (grid[i] === CHEESE) n++;
    return n;
  }

  // Survivors that came within one hole of falling. Shown for a beat when a
  // collapse settles — the near-miss is the point, and hiding it wastes the
  // most interesting thing that just happened. It is transient by design:
  // a permanent marker would do the player's counting for them.
  function nearMisses(grid, touched) {
    var flagged = new Uint8Array(CELLS), out = [];
    touched.forEach(function (i) {
      var nb = NB[i];
      for (var k = 0; k < nb.length; k++) {
        var j = nb[k];
        if (grid[j] === CHEESE && !flagged[j] && holeNeighbours(grid, j) === SPREAD - 1) {
          flagged[j] = 1; out.push(j);
        }
      }
    });
    return out;
  }


  // ---- board generation ------------------------------------------------
  //
  // Holes are placed one at a time, and a hole is only ever placed where the
  // board stays stable: every cheese neighbour of the new hole must have had
  // no hole neighbour at all. That single check is what guarantees §4.2's
  // hard requirement, and it has a pleasant side effect — two holes may sit
  // side by side (they share no cheese neighbour) but never two apart, so
  // the generator naturally produces straight "cracks" and isolated pits,
  // and never an L-corner. The cracks are the fault lines the puzzle is made
  // of, so the generator deliberately reaches for them.

  function canPlace(grid, i) {
    if (grid[i] === HOLE) return false;
    var nb = NB[i];
    for (var k = 0; k < nb.length; k++) {
      var j = nb[k];
      // Every cheese neighbour gains a hole; none of them may reach the
      // threshold, or the board would start out already collapsing.
      if (grid[j] === CHEESE && holeNeighbours(grid, j) >= SPREAD - 1) return false;
    }
    return true;
  }

  // Holes are placed one at a time, wherever the board stays stable. That
  // single check is what guarantees §4.2's hard requirement, and it is the
  // only constraint: holes are free to sit side by side and clump, which is
  // what makes the wheel look like swiss cheese rather than polka dots, and
  // what gives a collapse somewhere to travel.
  function generate(rand, target) {
    var grid = new Uint8Array(CELLS);
    var order = [];
    for (var i = 0; i < CELLS; i++) order.push(i);
    for (var a = order.length - 1; a > 0; a--) {      // seeded Fisher-Yates
      var b = (rand() * (a + 1)) | 0;
      var t = order[a]; order[a] = order[b]; order[b] = t;
    }
    var placed = 0;
    for (var p = 0; p < order.length && placed < target; p++) {
      if (!canPlace(grid, order[p])) continue;
      grid[order[p]] = HOLE;
      placed++;
    }
    return grid;
  }

  window.Cheese = {
    N: N, CELLS: CELLS, CHEESE: CHEESE, HOLE: HOLE, NB: NB, SPREAD: SPREAD,
    collapse: collapse,
    isStable: isStable,
    largestGroup: largestGroup,
    countCheese: countCheese,
    generate: generate,
    canPlace: canPlace,
    holeNeighbours: holeNeighbours,
    nearMisses: nearMisses
  };
})();
