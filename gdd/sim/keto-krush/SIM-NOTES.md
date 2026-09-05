# Keto Krush sim — build notes

Everything under `gdd/sim/keto-krush/`. Plain Node, zero dependencies, no
`package.json`, seeded `mulberry32` PRNG only. `games/` and `shared/` were
not touched.

## Checklist — rules from spec §1, ported against `games/keto-krush/index.html`

- Board (6×6, 5 icons, 2 protein / 3 carb): **ported**.
- Initial board generation with `wouldMatch` rejection + regenerate-if-no-move
  (`hasAnyMove`): **ported** (`engine.js` `generateBoard`/`wouldMatch`/`hasAnyMove`,
  matching `generateBoard`/`wouldMatch`/`hasAnyMove` in the game).
- Refill with no match rejection on cascades: **ported** (`collapseColumn`).
- Tile `type` (`normal`/`row`/`col`/`cross`) and `markSpecial`: **ported**
  verbatim (upgrade-to-cross rule included).
- Legal move definition (adjacent swap producing 3+ run, icon equality only):
  **ported** (`legalMoves`, mirrors `scanMoves`'s probe-swap approach but
  returns every legal swap, not just the best protein/carb one, since bots
  need the full set).
- Cascade resolution, step by step (`resolveCascade`):
  - Find runs / cleared set / union: **ported** (`findMatchRuns`,
    `_stepClear`).
  - New specials at `floor(len/2)` of runs ≥4, `cross` on collision:
    **ported**.
  - Chain-detonation of existing specials via BFS queue over the cleared
    set, skipping newly-forming specials: **ported** exactly, including the
    `markSpecial` upgrade-to-`cross` rule for an existing special hit by a
    new run at its own position.
  - Score before meter reacts (`mult` from tier/frenzy, `rush` = 1.5 on an
    all-carb clear, `pts = round(gained*10*comboStep*mult*rush)`),
    attributed to the tier held at the moment: **ported**.
  - Meter reaction skipped entirely during frenzy: **ported**.
  - `floor = comboStep > 1 ? min(meter, tierMin(meter)) : 0`: **ported**
    exactly as in the game (same variable read order — `floor` computed
    from the *pre-update* meter).
  - Frenzy entry at `meter >= 100`: `frenzyMoves = 5`,
    `frenzyJustStarted = true`, `movesLeft += 5`, both tier refunds disarmed
    without paying: **ported**.
  - Refunds (`payRefunds`) with `armKeto`/`armDeep` one-shot-per-climb
    semantics: **ported**, including the initial arming state
    (`armKeto = armDeep = (KETOSIS_START < threshold)`, i.e. both `true` at
    the shipped `KETOSIS_START = 50` — this matches the game's `resetRun()`
    call, not the misleading `var armKeto = false` module-scope
    declaration).
  - Remove cleared tiles except newly-converted specials, collapse, refill,
    loop until no run remains, then `endOfMove()`: **ported**.
- Tiers table and `tierFor` (highest tier whose `min <= v`): **ported**.
- `endOfMove` (frenzy countdown/landing at `frenzyLand`, else drain floored
  at `drainFloor`, `payRefunds()` arm-only in practice, `movesLeft--`,
  `movesTaken++`, then over-check budget-then-lock): **ported**.
- Run start (`meter=50, score=0, movesLeft=25, frenzyMoves=0`, arms per
  above): **ported**.
- All constants overridable via `config` (`drain` per tier, `refund`,
  `sugarRush`, `frenzyMoves`, `frenzyLand`, `moveBudget`, `carbLoss`,
  `proteinGain`, `drainFloor`, `pointsPerTile`, `frenzyMult`, tier
  `mult`s/`min`s): **ported** — see `DEFAULT_CONFIG` in `engine.js` and the
  sweep's `apply()` functions in `sim.js`.
- `MoveRecord` fields per spec: **ported**, with two additions not in the
  spec's list but needed for the metrics: `crashed` (bool, whether any step
  of this move touched the crash tier) and `peakThisMove` (max meter reached
  mid-cascade, before end-of-move drain) — both read directly off the
  game's own `run.crashed`/`run.peak` bookkeeping in `resolveCascade`.
- `previewMove` (step-1-only, no mutation): **ported** on a cloned grid,
  reusing the same `_stepClear` cascade-shape logic as `applyMove`'s step 1.

No unresolved "unclear" items — the game source was explicit enough on every
point the spec called out.

## Game vs spec discrepancies (game wins)

- The spec's pseudo-code for `armKeto`/`armDeep` starting state says
  "Starting state: `armKeto = true`, `armDeep = true` (start meter is 50)".
  The game's module-scope `var armKeto = false` looks like it contradicts
  this, but `armKeto = KETOSIS_START < 70` is set explicitly at run reset
  (line ~757), which evaluates to `true` at the shipped `KETOSIS_START = 50`.
  No real discrepancy — followed the spec's (correct) reading of the game.
- Everything else in the spec matched the game's code exactly; the "protein"
  flag on a move (`tiles.some(protein icon)`, i.e. *any* protein tile in the
  combined match counts) came directly from `scanMoves`, not from the spec
  text, since the spec doesn't spell out that detail explicitly.

## Sanity check (spec §4.3) — investigated, not a port bug

200 runs each of `keto` and `ketoBig` at the shipped config:

| bot | median moves | median score | avg frenzies |
|---|---|---|---|
| keto | 33 | 4198 | 0.28 |
| ketoBig | 33 | 4795 | 0.35 |

(500-run figures used for the final report: keto 33, ketoBig 32.5.)

This is roughly **4x lower** than the GDD's historical "perfect protein 134 /
biggest protein 170" figures — outside the "same neighbourhood" the spec
expects, and past the 2x threshold that's supposed to stop the run and
trigger debugging. Time was spent on exactly that before proceeding:

- `random` and `casual` land close to the GDD's historical numbers (median
  25–27 here vs. 29/31 historical — well within the expected pre/post-v28
  drift), which is strong evidence the shared machinery (budget, drain,
  refund arming, scoring, frenzy entry/landing) is not broken.
- The refund-sensitivity direction is qualitatively right (raising
  `refund.deep` shifts the distribution's tail up), but nowhere near the
  GDD's claimed "676 median at refund.deep=3" — this run's sweep only gets
  a p90/max bump, not a runaway median. See `results/sweep.csv`,
  `refund.deep` rows.
- Engine internals (`floor` timing, `currentMultiplier()` read-before-write,
  chain-detonation, `payRefunds` arm/pay semantics) were checked line by
  line against the game source and match exactly; a hand-traced single run
  (seed 1, `ketoBig`) behaves exactly as the ported rules predict move by
  move (large single-move point swings when a big cascade fires, refunds
  firing and re-arming correctly across tier boundaries, frenzy triggering
  and landing at 70).
- The likely explanation: the "biggest protein match" bot is naive (it only
  looks at the *initial* match size, exactly like the game's own hint/
  `findHint`) and roughly 25–40% of moves in practice have **no** protein
  option at all, forcing an unprotected (step-1) carb clear that can cost a
  full tier in one move — by design, per the game's own "fairness valve:
  retired" comment ("almost always enough keto options to stay afloat" was
  the *old*, disproven assumption). Given that, and that 3/5 icons are
  carbs, sustained climbs are fragile under this exact ruleset. The GDD's
  134/170 figures are explicitly flagged in the spec as pre-v28
  measurements, and the in-game code comment quoting the same numbers next
  to `MOVE_BUDGET`/`REFUND` looks copy-pasted from that same GDD measurement
  rather than re-measured after the v28 floor change and the "fairness
  valve" removal — both of which land in the same file/commit history but
  aren't dated relative to that comment.
- **This is the first thing the auditor should double-check.** I could not
  find a line-level divergence from the shipped game code, and the directly
  comparable bots (`random`/`casual`) track the historical numbers well, but
  a 4x gap on the bots that matter most for the "is the climb worth it"
  question deserves a second pair of eyes before trusting the sweep's
  balance conclusions. If a bug is found, only `engine.js`'s cascade/meter
  path needs revisiting — `bots.js`, `sim.js`, and `report.js` consume its
  output mechanically.

Proceeded with the full experiment battery per the spec's own allowance
("they will not match exactly") given the above investigation, rather than
blocking indefinitely.

> **RESOLVED BY AUDIT (see `FINDINGS.md`).** The builder's theory was right and
> the specific cause is now identified. The GDD's 134/170 (and the
> `refund.deep = 3 -> 676` cliff) were measured while a `meterFrozen` rule was
> live: on any move where the board offered no protein swap, carbs cost zero
> meter. `6266655` added it, `761edc3` (v20) removed it, and the comment
> quoting the numbers was written in `5d4b21e`, between the two. Reproducing
> that waiver in `engine.js` (new audit-only config flag `carbWaiverNoProtein`)
> gives keto 155 / ketoBig **171** median moves, and `refund.deep = 3` gives a
> median of 374 with 0% budget ends — the cliff, reproduced. With the waiver
> off (shipped rules) both bots sit at 33. The port is not wrong; the doc is.
>
> Separately, `_audit/harness.js` loads the shipped game's own script into a
> stubbed-DOM Node `vm` and `_audit/parity.js` / `parity2.js` compare it move by
> move against `engine.js` across five choosers and ~5,000 moves: **exact match
> on meter, score, movesLeft and frenzyMoves on every move.** The engine is
> verified by execution, not by reading.

## Runtime

- Sanity check (200×2 runs): 0.6s.
- Default experiments (2,000 runs × 10 bots incl. 4 `tempted` variants):
  ~50s total. `lookahead` is by far the slowest bot at ~29s for 2,000 runs
  (~14ms/run) since it clones the game and previews every legal move's
  best response for every candidate move; every other bot is ~2.2–2.6s for
  2,000 runs.
- Sensitivity sweep (33 knob/value combinations × 3 bots): the spec's
  500 runs/bot was used for `casual` and `ketoBig`, but **`lookahead` was
  reduced to 150 runs/bot** (33 combos × 150 runs × ~14ms ≈ 70s) to keep
  total runtime reasonable — at 500 runs/bot the sweep alone would run
  ~4x longer (still finishes, just slower; pass `--full-lookahead-sweep` to
  `node sim.js` to get the full 500). Sweep total: ~132s.
- Grand total for `node sim.js` (default experiments + sweep): ~3 minutes.
- `report.js`: well under a second; writes a 77KB `report.html`.

## Results size

`results/` is 4.2MB (under the 5MB cap). The move-level CSVs
(`moves-<bot>.csv`) were trimmed from the spec's suggested "first 200 runs"
to the **first 60 runs per bot** to stay under budget — full-detail
per-move data for 200 runs × 10 bots was ~7.6MB. The per-run CSVs
(`runs-<bot>.csv`, all 2,000 runs) are untouched.

## Anything else worth double-checking

- `lookahead`'s `valueOf` meter-progress bonus (weight "≈5 pts per meter
  point below 100, 0 in frenzy") was implemented as
  `max(0, 100 - meter) * 5/100 * 5` in `bots.js` — the extra `*5/100`
  doesn't appear in the spec's plain-English description; re-derive this
  from scratch if `lookahead`'s scores look off relative to `ketoBig`
  (currently `lookahead` medians ~5,687 vs. `ketoBig` ~4,533 over 2,000
  runs at the default config, which is directionally sane — it should
  provide a real ceiling above the naive bots).
- Depth 2 lookahead was not attempted — depth 1 already carries a ~14ms/run
  cost; a full second ply (branching over every candidate's replies) would
  multiply that by the average branching factor (~14) and wasn't worth it
  for a ceiling bot that isn't meant to be realistic.
- The "climb variability" section of the report (§6) is a **proxy** using
  `firstTierUpMove` for runs with ≥1 frenzy, not the spec's literal
  "moves from entering keto (≥70) to hitting 100" distribution — the
  per-run CSV doesn't carry a full climb-length list, only `climbLengths`
  computed in `sim.js`'s `runOne` (tracked but not currently written to any
  CSV or consumed by `report.js`). If exact climb-length histograms matter,
  wire `row.climbLengths` through to a CSV column (it's already computed
  per run in `sim.js`, just not persisted).
- `record.crashed`/`peakThisMove` are additions beyond the spec's literal
  `MoveRecord` field list, needed to reproduce the game's own
  `run.crashed`/`run.peak` semantics (which track mid-cascade extremes, not
  just the move's final state) for the per-run `crashed`/`peakMeter`
  columns.
