// Greedy-but-competent bot that plays Open Gym through the same public
// surface a player has: tryMoveOrCapture, tryMerge, signMember, endTurn.
// No access to hidden RNG or internal favoritism beyond what's visible on
// state.
"use strict";

function neighborsOf(ctx, q, r) {
  return ctx.DIRS.map((d) => ({ q: q + d[0], r: r + d[1] }));
}

function forecastForOwner(ctx, owner) {
  // Mirrors forecastText()/resolveEconomy() math for the given owner's circuits.
  const circuits = ctx.computeCircuits(owner);
  let total = 0;
  let foldRisk = false;
  circuits.forEach((c) => {
    const gym = c.gyms[0];
    if (!gym) return;
    let income = c.blocks.length;
    if (owner === "rival" && ctx.state.rival) income = Math.round(income * ctx.state.rival.mult);
    const load = c.blocks.reduce((s, b) => s + (b.unit ? ctx.LOAD[b.unit.tier] : 0), 0);
    const drag = c.blocks.some((b) =>
      neighborsOf(ctx, b.q, b.r).some((n) => {
        const nb = ctx.state.blocks[ctx.key(n.q, n.r)];
        return nb && !nb.owner && nb.state === "lapsed";
      })
    ) ? ctx.DRAG_PENALTY : 0;
    const delta = income - load - drag;
    total += delta;
    if (gym.momentum + delta < 0) foldRisk = true;
  });
  return { total, foldRisk };
}

function ownUnits(ctx, owner) {
  return Object.keys(ctx.state.blocks)
    .map((k) => ctx.state.blocks[k])
    .filter((b) => b.owner === owner && b.unit && !b.unit.movedThisTurn);
}

function emptyOwnedBlocks(ctx, owner) {
  return Object.keys(ctx.state.blocks)
    .map((k) => ctx.state.blocks[k])
    .filter((b) => b.owner === owner && !b.unit && !b.isBranch);
}

function circuitLoad(ctx, circuit) {
  return circuit.blocks.reduce((s, b) => s + (b.unit ? ctx.LOAD[b.unit.tier] : 0), 0);
}

function circuitBordersLapsed(ctx, circuit) {
  return circuit.blocks.some((b) =>
    neighborsOf(ctx, b.q, b.r).some((n) => {
      const nb = ctx.state.blocks[ctx.key(n.q, n.r)];
      return nb && !nb.owner && nb.state === "lapsed";
    })
  );
}

function neutralNeighborCount(ctx, t) {
  return neighborsOf(ctx, t.q, t.r).filter((n) => {
    const nb = ctx.state.blocks[ctx.key(n.q, n.r)];
    return nb && !nb.owner;
  }).length;
}

// Target priority: blank (defense 0, no state) first, then Sedentary, then
// rival-owned, then Lapsed (defense 1, hardest to justify with a Trial).
function targetRank(t) {
  if (!t.owner) {
    if (!t.state) return 0; // blank
    if (t.state === "sedentary") return 1;
    if (t.state === "lapsed") return 3;
    return 1;
  }
  return 2; // rival
}

// A "guard": a unit standing on the Gym itself, or adjacent to it, that we
// avoid pulling away when a Lapsed block borders the circuit (Lapsed can
// take empty owned blocks, and an unguarded Gym block itself has defense 1
// baked in via defenseOf(), but an adjacent empty owned block does not).
function findGuard(ctx, circuit) {
  const gym = circuit.gyms[0];
  if (!gym) return null;
  if (gym.unit) return gym;
  const adj = neighborsOf(ctx, gym.q, gym.r)
    .map((n) => ctx.state.blocks[ctx.key(n.q, n.r)])
    .find((b) => b && b.owner === "player" && b.unit);
  return adj || null;
}

// One bot turn. Returns a short list of action-log strings for diagnosis.
function playTurn(ctx) {
  const log = [];
  const owner = "player";

  // ---- (1) Merge pass: proactive merging, not just brink-of-fold. ----
  let progressedMerge = true;
  let guardMerge = 0;
  while (progressedMerge && guardMerge++ < 30) {
    progressedMerge = false;
    const circuits = ctx.computeCircuits(owner);
    outer:
    for (const c of circuits) {
      const load = circuitLoad(ctx, c);
      const income = c.blocks.length;
      const budget = income - 1;
      const lapsedBorder = circuitBordersLapsed(ctx, c);
      for (const b of c.blocks) {
        if (!b.unit || b.unit.movedThisTurn) continue;
        if (b.unit.tier === "lifer") continue;
        const partner = neighborsOf(ctx, b.q, b.r)
          .map((n) => ctx.state.blocks[ctx.key(n.q, n.r)])
          .find((nb) => nb && nb.owner === owner && nb.unit && !nb.unit.movedThisTurn && nb.unit.tier === b.unit.tier && nb !== b);
        if (!partner) continue;
        const mergedTier = ctx.TIERS[ctx.TIERS.indexOf(b.unit.tier) + 1];

        // (a) a neutral/rival block borders the circuit that neither unit
        // could beat alone, but the merged tier could.
        const nearby = [];
        [b, partner].forEach((u) => {
          neighborsOf(ctx, u.q, u.r).forEach((n) => {
            const t = ctx.state.blocks[ctx.key(n.q, n.r)];
            if (t && t.owner !== owner) nearby.push(t);
          });
        });
        const worthMergingForThreat = nearby.some((t) => {
          const def = ctx.defenseOf(t);
          return ctx.STRENGTH[b.unit.tier] <= def && ctx.STRENGTH[mergedTier] > def;
        });

        // Merge Trials into a Member as soon as any Lapsed borders the circuit.
        const trialsVsLapsed = b.unit.tier === "trial" && lapsedBorder;

        // (b) load budget exceeded.
        const overBudget = load > budget;

        if (worthMergingForThreat || trialsVsLapsed || overBudget) {
          const ok = ctx.tryMerge({ q: b.q, r: b.r }, { q: partner.q, r: partner.r });
          if (ok) {
            log.push(`merge at ${ctx.key(partner.q, partner.r)}`);
            progressedMerge = true;
            break outer;
          }
        }
      }
    }
  }

  // ---- (2) Captures: prefer blank/Sedentary, expand toward blocks with the
  // most neutral neighbours, keep a guard near the Gym if Lapsed borders. ----
  let progressed = true;
  let guard = 0;
  while (progressed && guard++ < 60) {
    progressed = false;
    const units = ownUnits(ctx, owner);
    for (const u of units) {
      if (u.unit.movedThisTurn) continue;
      const circuit = ctx.circuitOf(u.q, u.r);
      const lapsedBorder = circuit && circuitBordersLapsed(ctx, circuit);
      const guardBlock = circuit && lapsedBorder ? findGuard(ctx, circuit) : null;
      const isSoleGuard = guardBlock && guardBlock.q === u.q && guardBlock.r === u.r;

      const targets = neighborsOf(ctx, u.q, u.r)
        .map((n) => ctx.state.blocks[ctx.key(n.q, n.r)])
        .filter((t) => t && t.owner !== owner)
        .filter((t) => ctx.STRENGTH[u.unit.tier] > ctx.defenseOf(t));
      if (!targets.length) continue;
      // Gym can't be taken by Lapsed any more (game fix), so guards may act.

      targets.sort((a, b) => {
        const ra = targetRank(a), rb = targetRank(b);
        if (ra !== rb) return ra - rb;
        return neutralNeighborCount(ctx, b) - neutralNeighborCount(ctx, a);
      });
      const target = targets[0];
      const wasOwner = target.owner;
      const wasState = target.state;
      const ok = ctx.tryMoveOrCapture({ q: u.q, r: u.r }, { q: target.q, r: target.r });
      if (ok) {
        log.push(`capture ${ctx.key(target.q, target.r)} (was ${wasOwner || wasState})`);
        progressed = true;
      }
    }
  }

  // ---- (3) Idle units with no capture: shuffle toward the frontier. ----
  {
    const units = ownUnits(ctx, owner);
    for (const u of units) {
      if (u.unit.movedThisTurn) continue;
      const circuit = ctx.circuitOf(u.q, u.r);
      if (!circuit) continue;
      const lapsedBorder = circuitBordersLapsed(ctx, circuit);
      const guardBlock = lapsedBorder ? findGuard(ctx, circuit) : null;

      const isFrontier = (b) => neighborsOf(ctx, b.q, b.r).some((n) => {
        const nb = ctx.state.blocks[ctx.key(n.q, n.r)];
        return nb && (nb.owner !== owner);
      });
      if (isFrontier(u)) continue; // already at the frontier

      const emptySpots = circuit.blocks.filter((b) => !b.unit && !b.isBranch && isFrontier(b));
      if (!emptySpots.length) continue;
      emptySpots.sort((a, b) => ctx.hexDist ? 0 : 0); // no distance helper exposed; take first
      const dest = emptySpots[0];
      const ok = ctx.tryMoveOrCapture({ q: u.q, r: u.r }, { q: dest.q, r: dest.r });
      if (ok) log.push(`shuffle to ${ctx.key(dest.q, dest.r)}`);
    }
  }

  // ---- (4) Sign: budget rule + bank rather than spend on Trials when a
  // Lapsed/rival threat can't be beaten yet. ----
  const emptySpots = emptyOwnedBlocks(ctx, owner);
  const extraLoadByGymKey = {};
  for (const spot of emptySpots) {
    const circuit = ctx.circuitOf(spot.q, spot.r);
    const gym = circuit && circuit.gyms[0];
    if (!gym) continue;
    const gymKey = ctx.key(gym.q, gym.r);
    const income = circuit.blocks.length;
    const currentLoad = circuitLoad(ctx, circuit) + (extraLoadByGymKey[gymKey] || 0);
    const budget = income - 1;
    const lapsedBorder = circuitBordersLapsed(ctx, circuit);
    const canAlreadyBeatLapsed = circuit.blocks.some((b) => b.unit && ctx.STRENGTH[b.unit.tier] > 1);

    let chosen = null;
    for (let i = ctx.TIERS.length - 1; i >= 0; i--) {
      const t = ctx.TIERS[i];
      const newLoad = currentLoad + ctx.LOAD[t];
      if (newLoad > budget) continue;
      if (gym.momentum < ctx.COST[t]) continue;
      // Rule 3: don't spend on Trials while a Lapsed/rival threat borders
      // that nothing can beat yet — bank toward a Member or a merge.
      if (t === "trial" && lapsedBorder && !canAlreadyBeatLapsed) continue;
      chosen = t;
      break;
    }
    if (chosen) {
      ctx.signMember(spot, chosen, gym);
      extraLoadByGymKey[gymKey] = (extraLoadByGymKey[gymKey] || 0) + ctx.LOAD[chosen];
      log.push(`sign ${chosen} at ${ctx.key(spot.q, spot.r)}`);
    }
  }

  ctx.endTurn();
  return log;
}

module.exports = { playTurn, forecastForOwner, neighborsOf };
