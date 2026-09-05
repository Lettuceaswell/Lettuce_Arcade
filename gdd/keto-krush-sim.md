# Keto Krush — simulation spec

Purpose: a headless, deterministic simulator of the shipped Keto Krush rules,
a set of bot players, and a battery of measurements that answer two
questions: **is the game balanced** (skill matters, luck doesn't dominate,
the carb/protein choice is real) and **does it leave dopamine on the table**
(reward rhythm, near misses, how runs end, whether casual players ever see the
good part).

Everything lives in `gdd/sim/keto-krush/`. Nothing under `games/` changes.
Nothing here is deployed or referenced by the site.

Source of truth for the rules: `games/keto-krush/index.html`. Where this spec
and the game disagree, **the game wins** — note the discrepancy in
`SIM-NOTES.md` and port the game's behaviour.

## Constraints

- Plain JavaScript run with Node (`node sim.js`). Zero dependencies, no npm,
  no package.json. Built-in modules only (`fs`, `path`).
- A seeded PRNG (mulberry32 or xorshift; do not use `Math.random`) so every
  run is reproducible from `(seed, bot, config)`.
- One process, one file for the engine (`engine.js`), one for the bots
  (`bots.js`), one for the experiment runner (`sim.js`), one for the report
  renderer (`report.js`). Keep each under ~400 lines.
- Fast: 10,000 casual runs should finish in well under a minute.

## Files to produce

```
gdd/sim/keto-krush/
  engine.js        game rules, no I/O
  bots.js          the player strategies
  sim.js           runs experiments, writes results/*.json and results/*.csv
  report.js        reads results/, writes report.html (self-contained, inline SVG, no CDN)
  results/         raw output (checked in; keep under 5 MB total)
  SIM-NOTES.md     what was built, what was unclear, any deviations from this spec
```

---

## 1. Engine — the rules to port exactly

### Board

- 6×6 grid. Five icons: two protein (`🍖`, `🧀`), three carb (`🍕`, `🥐`, `🍪`).
  Use small ints internally (0,1 protein; 2,3,4 carb).
- Initial board: fill row-major; for each cell draw icons uniformly at random,
  rejecting any icon that would complete a horizontal or vertical run of 3
  with already-placed neighbours (`wouldMatch`). Regenerate the whole board
  if it has no legal move.
- Refill: after clearing, each column collapses down (surviving tiles keep
  order), empty cells at the top are filled with uniform random icons. **No
  match rejection on refills** — cascades happen naturally.
- A tile carries a `type`: `normal`, `row`, `col`, or `cross`.

### Moves

- A legal move is a swap of two orthogonally adjacent tiles that produces at
  least one run of 3+ identical icons (specials do not matter for legality;
  only icon equality).
- A swap that produces no match is rejected and costs nothing (bots never
  attempt these — they enumerate legal moves via probe swaps, exactly like
  `scanMoves`).

### Cascade resolution (`resolveCascade`) — one *move* = one or more *steps*

Per step, with `comboStep` starting at 0 and incremented at the start of
each step:

1. **Find runs**: every maximal straight horizontal or vertical run of ≥3
   identical icons. A tile can belong to both a row run and a column run.
2. **Cleared set** = union of all run positions.
3. **New specials**: for every run of length ≥4, the tile at index
   `floor(len/2)` of that run becomes a special of kind `row` (for a
   horizontal run) or `col` (vertical). If the same position gets both, it's
   `cross`. These positions **stay on the board as specials** — they are
   converted, not removed — but they **do count** toward `gained`,
   `proteinCount`/`carbCount`, and score for this step.
4. **Chain-detonate existing specials**: walk the cleared set as a queue. For
   each position that is *not* a new-special-in-the-making: if the tile there
   is `row` or `cross`, add its whole row to the cleared set; if `col` or
   `cross`, add its whole column. Newly added positions go on the queue too,
   so specials chain. (An existing special that gets hit by a new run of 4
   at its own position: the game marks it via `markSpecial`, which turns a
   different kind into `cross`; replicate `markSpecial` exactly.)
5. **Count**: `gained` = number of tiles in the cleared set; split into
   `proteinCount` and `carbCount` by icon.
6. **Score (read multiplier BEFORE the meter moves)**:
   - `mult` = 4 if in frenzy, else the tier multiplier for the current meter.
   - `rush` = 1.5 if `gained > 0 && proteinCount === 0`, else 1.
   - `pts = round(gained * 10 * comboStep * mult * rush)`.
   - Attribute `pts` to the tier/state held at this moment (for the
     points-by-tier breakdown).
7. **Meter reacts** (skip entirely if in frenzy — the meter is frozen and
   carbs cost nothing):
   - `loss = carbCount * 3`, `gain = proteinCount * 4`.
   - `floor = comboStep > 1 ? min(meter, tierMin(meter)) : 0` — a cascade
     step (step 2+) can never drop you below the bottom of the tier you held
     going into that step. Step 1 (the player's own match) can.
   - `meter = max(floor, min(100, meter + gain - loss))`.
   - If `meter >= 100`: enter frenzy — `frenzyMoves = 5`,
     `frenzyJustStarted = true`, `movesLeft += 5`, and **disarm both tier
     refunds** without paying them (a jump from 84 straight to 100 skips the
     deep refund; the frenzy refund is all you get).
   - Else run `payRefunds()` (see below).
8. Remove cleared tiles (except the new specials, which stay converted),
   collapse, refill. If the refilled board has any run of 3+, go to the next
   step. Otherwise the move is over: run `endOfMove()`.

### Tiers

| meter | tier | mult | drain/move |
|---|---|---|---|
| 0–15 | crash | 0.5 | 1 |
| 16–69 | normal | 1 | 1 |
| 70–84 | keto | 2 | 3 |
| 85–99 | deep | 3 | 5 |
| 100 | (fires frenzy) | 4 | — |

`tierFor(v)` = the highest tier whose `min <= v`. State name is `frenzy` while
`frenzyMoves > 0`, else the tier name.

### Refunds (`payRefunds`)

```
if (meter < 70) armKeto = true
if (meter < 85) armDeep = true
if (meter >= 70 && armKeto) { movesLeft += 2; armKeto = false }
if (meter >= 85 && armDeep) { movesLeft += 2; armDeep = false }
```

Called after every non-frenzy cascade step and once at end of move. Starting
state: `armKeto = true`, `armDeep = true` (start meter is 50).

### End of move (`endOfMove`) — once per resolved move, never per step

```
if (frenzyMoves > 0) {
  if (frenzyJustStarted) frenzyJustStarted = false      // triggering move is free
  else { frenzyMoves--; if (frenzyMoves === 0) meter = 70 }  // landing
} else if (meter > 40) {
  meter = max(40, meter - drain(tierFor(meter)))        // drain floors at 40
}
payRefunds()          // arming only in practice; nothing can pay here
movesLeft--
movesTaken++
```

Then: the run ends if `movesLeft <= 0` **or** the board has no legal move.
Record which.

### Run start

`meter = 50`, `score = 0`, `movesLeft = 25`, `frenzyMoves = 0`, arms as above.

### Engine API (suggested)

```js
const g = new Game(seed, config);   // config overrides any constant below
g.legalMoves();                     // [{a:{r,c}, b:{r,c}, size, protein:bool, tiles:[...]}]
g.previewMove(move);                // { ptsStep1, proteinCount, carbCount, meterAfterStep1 } without mutating
g.applyMove(move);                  // resolves the whole cascade + endOfMove; returns a MoveRecord
g.over, g.overReason                // 'budget' | 'lock'
g.state()                           // meter, score, movesLeft, tier, frenzyMoves, ...
```

All constants must be overridable via `config` for the sensitivity sweep:
`drain` (per tier), `refund` {keto, deep, frenzy}, `sugarRush`, `frenzyMoves`,
`frenzyLand`, `moveBudget`, `carbLoss`, `proteinGain`, `drainFloor`,
`pointsPerTile`, `frenzyMult`, tier `mult`s and `min`s.

### MoveRecord (one per resolved move, feeds every metric)

```
{ move, meterBefore, meterAfter, tierBefore, stateAfter, pts, steps (cascade length),
  gained, protein, carb, rushTaken (bool: step 1 was all-carb), tierChange (-1/0/+1 or 'frenzy'),
  refund (moves granted this move), frenzyStarted, frenzyEnded, movesLeftAfter,
  altProteinPts (best protein option's step-1 pts at decision time, or null),
  altCarbPts (best carb option's step-1 pts, or null) }
```

`altProteinPts`/`altCarbPts` are computed from `legalMoves()` + `previewMove()`
before the bot chooses, so every metric about "was the choice real" comes from
the same data regardless of which bot moved.

---

## 2. Bots (`bots.js`)

Each bot is `choose(game, rng) -> move`. All see the same `legalMoves()`.

1. **random** — uniform over legal moves.
2. **greedy** — largest `size`; ties broken randomly. Ignores the meter.
3. **keto** — any protein move if one exists (random among them), else random
   carb. The "read the rules once" player.
4. **ketoBig** — the largest protein move if any exists, else the largest carb
   move. Mirrors the game's own hint (`findHint`).
5. **tempted(k)** — like `ketoBig`, but takes the best carb move whenever
   `altCarbPts >= k * altProteinPts` (step-1 points, sugar rush included).
   Run at k = 1.0, 1.25, 1.5, 2.0. This is the dial that shows whether the
   sugar rush actually tempts.
6. **lookahead** — for each legal move, clone the game, apply it, then score
   `pts + valueOf(stateAfter)` where `valueOf` = the expected step-1 points of
   the best move on the resulting board plus a bonus for meter gained toward
   the next tier (weight ≈ 5 pts per meter point below 100, 0 in frenzy).
   Clone-and-apply must use a fixed RNG substream so refills are deterministic
   per candidate. Depth 1 is enough; note in SIM-NOTES if you find depth 2 is
   cheap. This is the ceiling, not a realistic player.
7. **casual** — 70% random, 30% ketoBig, chosen per move. The best guess at a
   kid or a distracted adult.

---

## 3. Experiments (`sim.js`)

Default: **2,000 runs per bot** at the shipped config, seeds 1..2000 so every
bot sees the same 2,000 starting boards (paired comparison). Write
`results/runs-<bot>.csv` (one row per run) and `results/moves-<bot>.csv`
(one row per move, for the first 200 runs only to keep size down).

### Per-run row

`seed, bot, score, moves, movesEarned, endReason, frenzies, peakMeter,
crashed (bool), maxCombo, bestMovePts, proteinTiles, carbTiles,
pctMovesByState (crash/normal/keto/deep/frenzy), tierUpsSeen, firstTierUpMove
(or -1), endState (state at final move), endedWithin5OfFrenzy (bool: any of
the last 3 moves had meter in 95..99 with no frenzy after), longestDryGap
(see 4.2), rewardEvents (count), pointsByTier (5 numbers)`.

### Sensitivity sweep

For each knob below, run **500 runs per bot** for bots `casual`, `ketoBig`,
`lookahead` at each value (same seeds 1..500). Write
`results/sweep.csv`: `knob, value, bot, medianScore, p10Score, p90Score,
medianMoves, p90Moves, maxMoves, pctBudgetEnd, avgFrenzies, pctRunsWithFrenzy,
pctRunsWithTierUp, medianLongestDryGap`.

| knob | values |
|---|---|
| refund.deep | 1, 2, 3 |
| refund.keto | 1, 2, 3 |
| refund.frenzy | 3, 5, 7 |
| moveBudget | 20, 25, 30, 35 |
| drain (keto/deep pairs) | 2/3, 3/5, 4/6, 3/7 |
| sugarRush | 1.25, 1.5, 1.75, 2.0 |
| frenzyMoves | 3, 5, 7 |
| frenzyLand | 55, 70, 80 |
| carbLoss | 2, 3, 4 |
| proteinGain | 3, 4, 5 |

Shipped values must appear in each row set so the table has a baseline.

---

## 4. Metrics — what the report must answer

### 4.1 Balance

- **Skill spread**: median score per bot, plus p10/p90. Report the ratio
  lookahead : random and ketoBig : random.
- **Luck overlap**: fraction of seeds where `random` beats `ketoBig` on the
  same seed, and where `casual` beats `lookahead`. Paired by seed.
- **Choice reality**: over all decision points (from moves CSVs), the share
  where `altCarbPts > altProteinPts`, split by tier held at the time. Also the
  share of decision points where *no* protein move exists at all, by tier.
- **Tier occupancy** per bot (the table already in the GDD, reproduced).
- **Run length** distribution per bot: median, p90, max, % ending on budget.
- **Runaway check**: any bot with p90 moves > 400 or max > 1,500 is flagged.

### 4.2 Dopamine / rhythm

Define a **reward event** as any move where at least one holds: cascade of
3+ steps, tier went up, frenzy started, refund granted, move pts ≥ 2× the
run's median move pts so far, or a special detonated.

- **Dry gaps**: per run, the longest stretch of consecutive moves with no
  reward event. Report median and p90 of that longest gap, per bot. The
  casual bot's number is the one that matters.
- **Reward density**: reward events per 10 moves, per bot.
- **First good thing**: move index of the first tier-up (or frenzy), per bot;
  and % of runs that never see one. The "does a casual player ever see
  ketosis" question.
- **Near misses**: % of runs that end with peak meter in 90..99 and zero
  frenzies. And % of runs that ever sit at 95..99 and then fall back without
  a frenzy.
- **How runs end**: distribution of `endState` per bot (crash / normal / keto
  / deep / frenzy), and % of runs whose final move was itself a reward event.
- **Climb variability**: for runs with ≥1 frenzy, the distribution of moves
  from entering keto (≥70) to hitting 100. Median, p10, p90. A narrow band
  means the frenzy is predictable.
- **Frenzy value**: mean points earned inside frenzies vs outside, per move.
  Frenzy share of total score for ketoBig.
- **Crash tier**: % of runs that ever crash, per bot. If only `random` ever
  crashes, say so.

### 4.3 Sanity checks against the GDD's earlier measurements

The GDD (`gdd/keto-krush.md`, "Measured" tables) reports medians of ~31
moves casual, ~134 perfect-protein, ~170 biggest-protein, and ~29% frenzy
occupancy for perfect protein. Those were measured **before** the v28 change
(cascade steps can't drop you a tier) so they will not match exactly, but
they should be in the same neighbourhood. If the sim's `keto`/`ketoBig`
medians are off by more than ~2×, something in the port is wrong — stop and
find it before running anything else.

---

## 5. Report (`report.js` → `report.html`)

Self-contained HTML, inline CSS and inline SVG charts, no external requests.
Sections in this order:

1. Headline table: one row per bot — median score, p10–p90, median moves,
   % budget end, avg frenzies, % runs with a tier-up, median longest dry gap.
2. Score distributions per bot (histograms, same x-axis).
3. Choice reality: stacked bars per tier of "carb pays more / protein pays
   more / no protein move".
4. Rhythm: histogram of longest dry gap for casual and ketoBig; reward
   density per bot.
5. Endings: stacked bar of endState per bot; near-miss rates.
6. Climb variability histogram.
7. Sensitivity heat map: knobs × outcome (median moves, median score, %
   frenzy runs, % tier-up runs), colour = change vs shipped baseline.
8. Flags: any automated warning (runaway, sanity-check mismatch, a bot whose
   scores don't beat random, a dry gap p90 > 12 for casual).

No prose interpretation in the report — numbers and pictures only. The
interpretation is a separate step.

---

## 6. Hand-off

`SIM-NOTES.md` must contain:

- A checklist of every rule in §1 with "ported" / "ported with note" /
  "unclear".
- Any place where the game code and this spec disagreed, and which you
  followed (should be the game).
- Runtime per experiment.
- Anything you'd want the auditor to double-check first.
