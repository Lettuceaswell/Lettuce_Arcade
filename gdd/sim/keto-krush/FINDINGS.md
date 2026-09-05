# Keto Krush sim — audit findings

Audit of `gdd/sim/keto-krush/` against the shipped game
(`games/keto-krush/index.html`). Nothing under `games/` was changed. Numbers
below are from `node sim.js` after the fixes in section 2; the report is
`report.html`. Audit scripts live in `_audit/` (parity harness, hand-check,
table generators).

---

## 1. Verdict: 33 is right, 134/170 are stale

**The sim is correct. The design doc and the in-game comment are stale.** The
`~134` / `~170` medians (and the `refund.deep = 3 -> median 676, max 5,001,
14% budget ends` cliff) were measured under a rule that no longer exists.

### 1a. Line-by-line audit, done by execution rather than by eye

`_audit/harness.js` loads the shipped game's own inline `<script>` into a Node
`vm` context with a stubbed DOM: `setTimeout` and `requestAnimationFrame` run
their callbacks synchronously (so `resolveCascade` resolves in-line),
`Math.random` is replaced with the same `mulberry32(seed)` the engine uses, and
`attemptSwap` is driven directly. `_audit/parity.js` / `_audit/parity2.js` then
replay identical move sequences through the real game and through `engine.js`
and compare `meterBefore`, `meterAfter`, cumulative `score`, `movesLeft` and
`frenzyMoves` after every single move.

| harness run | seeds | result |
|---|---|---|
| random chooser (fixed stream) | 1-60 | **exact match, every move** |
| `proteinBig` chooser | 1-30 | exact match |
| `big` (largest match) chooser | 1-30 | exact match |
| `first` legal move | 1-30 | exact match |
| `last` legal move | 1-30 | exact match |

About 5,000 resolved moves compared, including 27 frenzies, special-tile
creation and chain detonation. Every item on the audit checklist is therefore
confirmed empirically rather than by reading: score-before-meter ordering, the
`comboStep > 1` tier floor, specials counting toward `gained` while staying on
the board, `frenzyJustStarted` skipping the decrement, drain floor 40, refund
arm/pay semantics, frenzy disarming both arms without paying, refill without
match rejection, `hasAnyMove` after `endOfMove`, and the initial-board
`wouldMatch` rejection. **No divergence between `engine.js` and the game was
found.**

### 1b. Where 134/170 actually came from

`git log -S meterFrozen -- games/keto-krush/index.html` finds two commits:
`6266655` added a per-move `meterFrozen` flag ("the board offered you no
protein, so the carbs weren't a choice") that zeroed carb meter loss for the
whole move, and `761edc3` (v20, "Playtest round 2 ... carb cost") **removed**
it. The `~134 / ~170` comment was written in `5d4b21e`, which sits between
those two commits — i.e. it was measured while the waiver was live. The comment
survived the waiver's removal; the numbers did not.

Reproducing that exact rule in the engine (new audit-only config flags
`carbWaiverNoProtein` and `cascadeTierFloor`, both defaulting to the shipped
behaviour) settles it — 400 runs/bot, seeds 1-400:

| config | bot | median moves | p90 | max | median score | avg frenzies | % budget end |
|---|---|---|---|---|---|---|---|
| **shipped** | keto | **33** | 51 | 113 | 4,323 | 0.30 | 94% |
| **shipped** | ketoBig | **33** | 55 | 106 | 4,617 | 0.33 | 93% |
| **shipped** | casual | 27 | 46 | 94 | 3,281 | 0.17 | 94% |
| pre-v28 (no cascade floor) | keto | 31 | 45 | 79 | 3,487 | 0.14 | 95% |
| pre-v28 (no cascade floor) | ketoBig | 29 | 45 | 95 | 3,860 | 0.15 | 94% |
| **pre-v20 (carb waiver + no floor)** | keto | **155** | 294 | 483 | 49,162 | 9.69 | 67% |
| **pre-v20 (carb waiver + no floor)** | ketoBig | **171** | 343 | 934 | 62,965 | 12.91 | 67% |
| pre-v20 (carb waiver + no floor) | casual | 47.5 | 97 | 295 | 8,530 | 1.16 | 90% |

Doc says 134 / 170. Waiver-on engine says **155 / 171**. `ketoBig` is a
bullseye; `keto` is within the difference between "any protein move" and
whatever the original bot did. Removing the waiver alone drops those medians
from 155/171 to 33/33 — a 4.7x / 5.2x collapse that exactly accounts for the
gap the builder flagged. The v28 cascade floor is a *minor* effect in the
opposite direction (+2 to +4 median moves), which is why "pre-v28" alone could
never explain the discrepancy.

### 1c. The refund.deep cliff, same story

300 runs/bot, seeds 1-300:

| config | refund.deep | bot | median moves | p90 | max | % budget end | avg frenzies |
|---|---|---|---|---|---|---|---|
| legacy (waiver) | 1 | ketoBig | 79 | 103 | 140 | 85% | 5.8 |
| legacy (waiver) | 2 | ketoBig | 169.5 | 301 | 468 | 63% | 13.6 |
| legacy (waiver) | **3** | ketoBig | **374** | 1,276 | 3,719 | **0%** | 42.1 |
| legacy (waiver) | 3 | keto | 336.5 | 1,238 | 3,292 | 1% | 38.1 |
| **shipped** | 1 | ketoBig | 32 | 50 | 79 | 94% | 0.3 |
| **shipped** | 2 | ketoBig | 33 | 56 | 106 | 93% | 0.3 |
| **shipped** | 3 | ketoBig | 33 | 62 | 133 | 92% | 0.4 |
| **shipped** | 4 | ketoBig | 33 | 68 | 146 | 92% | 0.4 |
| **shipped** | 5 | ketoBig | 34 | 75 | 159 | 91% | 0.4 |

The doc's "676 median, max 5,001, only 14% ending on the budget" is the same
qualitative runaway the waiver-on engine produces at `refund.deep = 3`
(median 336-374, max ~3,700, 0-1% budget ends); the residual factor-of-two is
the v28 floor plus bot definition. **Under the shipped rules the cliff does not
exist in any form.** `refund.deep` is one of the flattest knobs in the whole
sweep: pushing it from 2 to 5 moves the ketoBig median from 33 to 34.

### 1d. Why the shipped economy caps out near 33 moves

Instrumented `ketoBig` traces (`_audit/dbg.js`, `_audit/handcheck.js`) show the
mechanism. Board icons are uniform over 5 icons, 2 protein / 3 carb, so a
refill tile is worth `0.4 x (+4) - 0.6 x (-3) = -0.2` meter on average. The
player controls only step 1; every cascade step after it is a coin flip that is
slightly meter-negative, and cascades are long (steps of 3-8 clearing 10-35
tiles are routine). A protein 3-match is +12, but a single 5-step cascade can
strip 20-30 meter in one move, and the end-of-move drain then takes 1/3/5 more.
Refunds pay at most 2+2+5 = 9 moves per full climb, while the climb plus the
frenzy costs 6-11 moves of budget, so the cycle is net-negative — as it must
be for 93% of runs to end on the budget. With the waiver on, every
protein-starved move became free, cascades stopped costing meter roughly a
third of the time, and the cycle flipped net-positive: hence 171 and the
runaway.

---

## 2. Bugs found and fixed (all in the sim; the game was not touched)

| # | file | bug | fix | headline effect |
|---|---|---|---|---|
| B1 | `bots.js` | `lookahead`'s meter term was `max(0, 100 - ketosis) * 5 / 100 * 5`, i.e. `(100 - meter) x 0.25` — it **rewarded a low meter**, the opposite of the spec's "bonus for meter gained toward the next tier", and was so small the `pts` term swamped it anyway. | `value += (frenzyMoves > 0 ? 100 : ketosis) * 5` — bonus for meter *held*, with frenzy scored as a full meter so a frenzy-triggering candidate is not penalised. | lookahead (300 runs) median score **5,781 -> 6,056**, median moves **31 -> 33**, avg frenzies 0.467 -> 0.480. Over 2,000 runs the shipped figure is median score 6,238, 2.21x random. |
| B2 | `sim.js` | `tierUpsSeen` / `firstTierUpMove` / the reward-event test used `rec.tierChange`, which compares state *before* the move with state *after* the end-of-move drain. A move that climbed 63 -> 75 and then drained to 72... counted; a move that climbed 58 -> 70 and drained to 67 did **not**, even though the game announces the tier during the cascade and pays the refund. | New `peakTierUp` test: `frenzyStarted \|\| tier(peakThisMove) > tier(tierBefore)`. | `% runs with a tier-up` at the sweep baseline (500 runs): casual **91.4% -> 93.4%**, ketoBig **94.2% -> 96.4%**. Median move of first tier-up for ketoBig is now 3. Reward density rises slightly for every bot. |
| B3 | `sim.js` | `climbLengths` never started a climb that began on the frenzy-landing move: the guard was `!before70 && meterAfter >= 70`, and landing sets the meter to exactly 70 with `before70` already true, so every post-frenzy climb was silently dropped. | Climb starts on any non-frenzy move that ends at meter >= 70 with no climb in progress; resets on drop below 70 and inside frenzy. | ketoBig climbs recorded over 2,000 runs rose from **576 to 641** (+11%; measured by running both detectors side by side); the metric is now exported (see B6). |
| B4 | `sim.js` | `fellBackWithoutFrenzy` was defined as `sawNearFrenzy && frenzies === 0`, so any run that hit 95-99, fell back, and *later* fired a frenzy was not counted — the opposite of the spec's "ever sits at 95..99 and then falls back without a frenzy". | Counted as an event at the moment the meter drops below 95 with no frenzy in between. | ketoBig **19.1% -> 26.0%**, lookahead 14.9% -> 24.3%, keto 23.8%. |
| B5 | `sim.js` | Dead code: `const endedWithin5OfFrenzy = ... ? false : false` (a ternary returning `false` on both arms), immediately superseded by the real computation below it. | Removed. | none (cosmetic). |
| B6 | `sim.js` | `climbLengths`, `nearMissNoFrenzy`, `fellBackWithoutFrenzy`, `lastMoveWasReward` were all computed and then thrown away — never written to the runs CSV, so the report could not use them. | Nine new columns: `nearMissNoFrenzy, fellBackWithoutFrenzy, lastMoveWasReward, ptsInFrenzy, movesInFrenzy, ptsOutside, movesOutside, climbCount, climbLengths` (the last as a `\|`-joined list). | Enables sections 5, 6, 6b of the report. |
| B7 | `sim.js` | Frenzy value (spec 4.2, "mean points earned inside frenzies vs outside") was not computed at all. | `ptsInFrenzy / movesInFrenzy / ptsOutside / movesOutside` accumulated per run and exported. | ketoBig: **563 pts/move in frenzy vs 153 outside**, 15.6% of total score; lookahead 844 vs 215, 21.3%. |
| B8 | `report.js` | Section 6 "climb variability" was a **proxy** — it plotted `firstTierUpMove` and said so in a comment — because the real metric was not in the CSV. | Rewired to the real `climbLengths`: per-bot count / median / p10 / p90 / max plus histograms for ketoBig, lookahead, casual. | ketoBig climbs: median 3, p10 2, p90 6, max 12. |
| B9 | `report.js` | The near-miss table's second column was labelled "ever sat 95-99 then fell back" but read `endedWithin5OfFrenzy`; `nearMissNoFrenzy` was recomputed inline instead of read from the data. | Four distinct columns, each from its own exported field. | see the endings table below. |
| B10 | `report.js` | Spec 4.1/4.2 metrics missing entirely from the report: skill ratio vs random, luck overlap, run-length distribution, tier occupancy, % runs never tier-up, first-tier-up move, crash rate, frenzy value. | New section 6b. | see tables below. |
| B11 | `report.js` | The flags section's sanity line asserted the 134/170 numbers were "GDD historical, pre-v28" with no resolution. | Now states the actual cause (pre-v20 `meterFrozen` waiver, commit `761edc3`) and the reproduction. Added flags for "casual never sees a tier-up", "casual rarely sees a frenzy", and narrow climb bands. | flags now fire on 3 real conditions. |
| B12 | `sim.js` | The sweep ran `lookahead` at 150 runs instead of the spec's 500 (`--full-lookahead-sweep` was opt-in). | Default is now 500; `--fast-lookahead-sweep` opts down. | full sweep runtime 372 s; total `node sim.js` 7m05s. |

Also added (audit instrumentation, shipped defaults unchanged):
`engine.js` gained `carbWaiverNoProtein: false` and `cascadeTierFloor: true`
config flags so the historical rules can be reproduced on demand. With both at
their defaults the engine is byte-for-byte behaviour-identical to the shipped
game (section 1a).

Every flag branch in `report.js` section 8 was verified by injecting synthetic
runs CSVs: the runaway p90/max flags, the "does not beat random" flag, the
casual dry-gap p90 flag and the casual never-tier-up flag all fire when their
condition is met and stay silent otherwise.

---

## 3. Corrected headline table

### Headline (2,000 runs/bot, seeds 1-2000, shipped config)

| bot | median score | p10-p90 score | vs random | median moves | p90 moves | max moves | % budget end | avg frenzies | % runs w/ frenzy | % runs w/ tier-up | median dry gap |
|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 2824 | 1680-6890 | 1.00x | 25 | 42 | 97 | 94.1% | 0.130 | 10.0% | 93.0% | 6 |
| greedy | 3422.5 | 1975-9195 | 1.21x | 27 | 45 | 113 | 93.3% | 0.176 | 13.4% | 95.8% | 5 |
| keto | 4123 | 2116-10775 | 1.46x | 33 | 53 | 113 | 94.3% | 0.283 | 23.3% | 94.8% | 6 |
| ketoBig | 4533 | 2362-12300 | 1.61x | 31 | 54 | 139 | 93.3% | 0.340 | 24.6% | 96.3% | 5 |
| tempted_1_0 | 3144 | 1923-7880 | 1.11x | 25 | 41 | 87 | 96.0% | 0.144 | 10.6% | 97.3% | 5 |
| tempted_1_25 | 3336.5 | 1993-9196 | 1.18x | 25 | 45 | 121 | 94.6% | 0.176 | 12.8% | 96.4% | 5 |
| tempted_1_5 | 3352.5 | 1993-9295 | 1.19x | 27 | 45 | 121 | 94.5% | 0.181 | 13.3% | 96.3% | 5 |
| tempted_2_0 | 4083 | 2278-10615 | 1.45x | 29 | 50 | 102 | 95.0% | 0.240 | 17.8% | 97.0% | 5 |
| lookahead | 6238 | 3190-22491 | 2.21x | 31 | 66 | 200 | 94.2% | 0.510 | 27.5% | 95.0% | 5 |
| casual | 3245 | 1911-8520 | 1.15x | 27 | 46 | 121 | 94.3% | 0.167 | 12.8% | 94.2% | 5 |

---

## 4. Sensitivity sweep

500 runs per bot per value (seeds 1-500), bots `casual`, `ketoBig`,
`lookahead`. Direction summary is for `ketoBig`; shape is classed **CLIFF**
when the best/worst ratio across the tested range exceeds 2x on median moves or
median score, **steep** above 1.25x moves / 1.4x score, else **gentle**.


#### casual

| knob | value | median moves | p90 moves | max moves | median score | % budget end | % runs w/ frenzy | % runs w/ tier-up | median dry gap |
|---|---|---|---|---|---|---|---|---|---|
| refund.deep | 1 | 27 | 42 | 83 | 3277.5 | 94.2% | 12.0% | 93.4% | 5 |
| refund.deep | 2 **(shipped)** | 27 | 45 | 94 | 3304 | 94.2% | 12.0% | 93.4% | 5 |
| refund.deep | 3 | 27 | 48 | 105 | 3316.5 | 94.0% | 12.0% | 93.4% | 5 |
| refund.keto | 1 | 26 | 38 | 78 | 3140 | 94.6% | 11.6% | 93.4% | 5 |
| refund.keto | 2 **(shipped)** | 27 | 45 | 94 | 3304 | 94.2% | 12.0% | 93.4% | 5 |
| refund.keto | 3 | 28 | 52 | 135 | 3460 | 93.6% | 12.4% | 93.4% | 5 |
| refund.frenzy | 3 | 27 | 45 | 88 | 3304 | 94.2% | 12.0% | 93.4% | 5 |
| refund.frenzy | 5 **(shipped)** | 27 | 45 | 94 | 3304 | 94.2% | 12.0% | 93.4% | 5 |
| refund.frenzy | 7 | 27 | 47 | 100 | 3304 | 94.2% | 12.0% | 93.4% | 5 |
| moveBudget | 20 | 22 | 40 | 89 | 2717 | 95.0% | 11.2% | 87.6% | 5 |
| moveBudget | 25 **(shipped)** | 27 | 45 | 94 | 3304 | 94.2% | 12.0% | 93.4% | 5 |
| moveBudget | 30 | 33 | 52 | 99 | 3876 | 93.4% | 12.2% | 95.0% | 6 |
| moveBudget | 35 | 39 | 57 | 104 | 4470.5 | 92.2% | 13.4% | 96.2% | 6 |
| drain | 2/3 | 27 | 49 | 147 | 3421 | 93.6% | 19.2% | 93.4% | 5 |
| drain | 3/5 **(shipped)** | 27 | 45 | 94 | 3304 | 94.2% | 12.0% | 93.4% | 5 |
| drain | 4/6 | 27 | 42 | 88 | 3258 | 94.2% | 10.2% | 93.4% | 5 |
| drain | 3/7 | 27 | 45 | 86 | 3292.5 | 94.2% | 10.6% | 93.4% | 5 |
| sugarRush | 1.25 | 27 | 45 | 94 | 2973 | 94.2% | 12.0% | 93.4% | 6 |
| sugarRush | 1.5 **(shipped)** | 27 | 45 | 94 | 3304 | 94.2% | 12.0% | 93.4% | 5 |
| sugarRush | 1.75 | 27 | 45 | 94 | 3661.5 | 94.2% | 12.0% | 93.4% | 5 |
| sugarRush | 2 | 27 | 45 | 94 | 4007.5 | 94.2% | 12.0% | 93.4% | 5 |
| frenzyMoves | 3 | 27 | 46 | 86 | 3295 | 94.0% | 12.0% | 93.4% | 5 |
| frenzyMoves | 5 **(shipped)** | 27 | 45 | 94 | 3304 | 94.2% | 12.0% | 93.4% | 5 |
| frenzyMoves | 7 | 27 | 46 | 83 | 3304 | 94.2% | 12.0% | 93.4% | 5 |
| frenzyLand | 55 | 27 | 44 | 76 | 3304 | 94.0% | 12.0% | 93.4% | 5 |
| frenzyLand | 70 **(shipped)** | 27 | 45 | 94 | 3304 | 94.2% | 12.0% | 93.4% | 5 |
| frenzyLand | 80 | 27 | 47 | 87 | 3304 | 94.0% | 12.0% | 93.4% | 5 |
| carbLoss | 2 | 66.5 | 137 | 307 | 13875 | 85.4% | 69.4% | 94.2% | 6 |
| carbLoss | 3 **(shipped)** | 27 | 45 | 94 | 3304 | 94.2% | 12.0% | 93.4% | 5 |
| carbLoss | 4 | 25 | 33 | 59 | 2609.5 | 95.0% | 4.2% | 97.0% | 5 |
| proteinGain | 3 | 25 | 29 | 54 | 2448 | 95.2% | 0.8% | 91.2% | 5 |
| proteinGain | 4 **(shipped)** | 27 | 45 | 94 | 3304 | 94.2% | 12.0% | 93.4% | 5 |
| proteinGain | 5 | 53 | 118 | 314 | 9921.5 | 87.6% | 65.8% | 97.6% | 6 |

#### ketoBig

| knob | value | median moves | p90 moves | max moves | median score | % budget end | % runs w/ frenzy | % runs w/ tier-up | median dry gap |
|---|---|---|---|---|---|---|---|---|---|
| refund.deep | 1 | 31 | 49 | 79 | 4367.5 | 92.8% | 23.0% | 96.4% | 5 |
| refund.deep | 2 **(shipped)** | 32.5 | 54 | 106 | 4464 | 92.4% | 23.2% | 96.4% | 5 |
| refund.deep | 3 | 33 | 61 | 133 | 4516 | 91.6% | 23.4% | 96.4% | 5 |
| refund.keto | 1 | 29 | 46 | 76 | 4167.5 | 93.2% | 21.6% | 96.4% | 5 |
| refund.keto | 2 **(shipped)** | 32.5 | 54 | 106 | 4464 | 92.4% | 23.2% | 96.4% | 5 |
| refund.keto | 3 | 35 | 65 | 147 | 4999 | 91.4% | 24.2% | 96.4% | 5 |
| refund.frenzy | 3 | 31.5 | 52 | 100 | 4464 | 92.4% | 23.2% | 96.4% | 5 |
| refund.frenzy | 5 **(shipped)** | 32.5 | 54 | 106 | 4464 | 92.4% | 23.2% | 96.4% | 5 |
| refund.frenzy | 7 | 33 | 57 | 126 | 4464 | 92.4% | 23.2% | 96.4% | 5 |
| moveBudget | 20 | 26 | 48 | 101 | 3640 | 93.8% | 21.6% | 94.4% | 5 |
| moveBudget | 25 **(shipped)** | 32.5 | 54 | 106 | 4464 | 92.4% | 23.2% | 96.4% | 5 |
| moveBudget | 30 | 38 | 61 | 113 | 5317 | 91.4% | 24.6% | 98.0% | 5 |
| moveBudget | 35 | 43 | 67 | 130 | 5985 | 90.0% | 25.0% | 98.8% | 6 |
| drain | 2/3 | 33 | 58 | 104 | 4780.5 | 91.2% | 35.0% | 96.4% | 5 |
| drain | 3/5 **(shipped)** | 32.5 | 54 | 106 | 4464 | 92.4% | 23.2% | 96.4% | 5 |
| drain | 4/6 | 31 | 51 | 141 | 4255.5 | 93.0% | 17.0% | 96.4% | 5 |
| drain | 3/7 | 31 | 53 | 106 | 4324 | 92.6% | 18.4% | 96.4% | 5 |
| sugarRush | 1.25 | 32.5 | 54 | 106 | 4014 | 92.4% | 23.2% | 96.4% | 5 |
| sugarRush | 1.5 **(shipped)** | 32.5 | 54 | 106 | 4464 | 92.4% | 23.2% | 96.4% | 5 |
| sugarRush | 1.75 | 32.5 | 54 | 106 | 4961 | 92.4% | 23.2% | 96.4% | 5 |
| sugarRush | 2 | 32.5 | 54 | 106 | 5435 | 92.4% | 23.2% | 96.4% | 5 |
| frenzyMoves | 3 | 33 | 54 | 83 | 4444 | 92.4% | 23.2% | 96.4% | 5 |
| frenzyMoves | 5 **(shipped)** | 32.5 | 54 | 106 | 4464 | 92.4% | 23.2% | 96.4% | 5 |
| frenzyMoves | 7 | 32 | 54 | 107 | 4464 | 92.6% | 23.2% | 96.4% | 5 |
| frenzyLand | 55 | 32.5 | 52 | 82 | 4464 | 92.6% | 23.2% | 96.4% | 5 |
| frenzyLand | 70 **(shipped)** | 32.5 | 54 | 106 | 4464 | 92.4% | 23.2% | 96.4% | 5 |
| frenzyLand | 80 | 33 | 58 | 140 | 4464 | 92.0% | 23.2% | 96.4% | 5 |
| carbLoss | 2 | 85 | 188 | 425 | 23495 | 83.2% | 82.2% | 99.0% | 6 |
| carbLoss | 3 **(shipped)** | 32.5 | 54 | 106 | 4464 | 92.4% | 23.2% | 96.4% | 5 |
| carbLoss | 4 | 27 | 37 | 58 | 3157.5 | 94.6% | 10.2% | 98.6% | 5 |
| proteinGain | 3 | 25 | 33 | 48 | 2867.5 | 95.4% | 1.2% | 93.2% | 5 |
| proteinGain | 4 **(shipped)** | 32.5 | 54 | 106 | 4464 | 92.4% | 23.2% | 96.4% | 5 |
| proteinGain | 5 | 66 | 144 | 599 | 16235 | 84.6% | 78.6% | 99.4% | 6 |

#### lookahead

| knob | value | median moves | p90 moves | max moves | median score | % budget end | % runs w/ frenzy | % runs w/ tier-up | median dry gap |
|---|---|---|---|---|---|---|---|---|---|
| refund.deep | 1 | 31 | 56 | 115 | 6016 | 97.0% | 24.8% | 94.6% | 5 |
| refund.deep | 2 **(shipped)** | 31 | 64 | 148 | 6027.5 | 96.0% | 25.2% | 94.6% | 5 |
| refund.deep | 3 | 31 | 72 | 200 | 6060.5 | 95.8% | 25.4% | 94.6% | 5 |
| refund.keto | 1 | 28 | 53 | 106 | 5710 | 96.8% | 23.8% | 94.6% | 5 |
| refund.keto | 2 **(shipped)** | 31 | 64 | 148 | 6027.5 | 96.0% | 25.2% | 94.6% | 5 |
| refund.keto | 3 | 34 | 78 | 205 | 6492.5 | 95.4% | 26.2% | 94.6% | 5 |
| refund.frenzy | 3 | 31 | 61 | 123 | 6027.5 | 96.0% | 25.2% | 94.6% | 5 |
| refund.frenzy | 5 **(shipped)** | 31 | 64 | 148 | 6027.5 | 96.0% | 25.2% | 94.6% | 5 |
| refund.frenzy | 7 | 31 | 68 | 163 | 6027.5 | 96.0% | 25.2% | 94.6% | 5 |
| moveBudget | 20 | 24 | 56 | 126 | 4884 | 97.0% | 23.0% | 89.4% | 5 |
| moveBudget | 25 **(shipped)** | 31 | 64 | 148 | 6027.5 | 96.0% | 25.2% | 94.6% | 5 |
| moveBudget | 30 | 38 | 71 | 153 | 7170 | 95.0% | 26.8% | 97.6% | 5 |
| moveBudget | 35 | 43 | 79 | 161 | 8434.5 | 94.2% | 28.8% | 98.2% | 5 |
| drain | 2/3 | 33 | 74 | 217 | 6291 | 96.0% | 34.2% | 94.8% | 5 |
| drain | 3/5 **(shipped)** | 31 | 64 | 148 | 6027.5 | 96.0% | 25.2% | 94.6% | 5 |
| drain | 4/6 | 31 | 58 | 141 | 5721.5 | 95.2% | 21.0% | 94.2% | 5 |
| drain | 3/7 | 31 | 62 | 142 | 5917.5 | 96.0% | 23.6% | 94.6% | 5 |
| sugarRush | 1.25 | 31.5 | 64 | 154 | 5378 | 94.2% | 23.8% | 94.8% | 5 |
| sugarRush | 1.5 **(shipped)** | 31 | 64 | 148 | 6027.5 | 96.0% | 25.2% | 94.6% | 5 |
| sugarRush | 1.75 | 31 | 62 | 199 | 6725 | 94.8% | 25.6% | 96.0% | 5 |
| sugarRush | 2 | 32 | 66 | 128 | 7157.5 | 95.8% | 26.0% | 95.8% | 5 |
| frenzyMoves | 3 | 31 | 65 | 170 | 6016 | 95.4% | 25.2% | 94.6% | 5 |
| frenzyMoves | 5 **(shipped)** | 31 | 64 | 148 | 6027.5 | 96.0% | 25.2% | 94.6% | 5 |
| frenzyMoves | 7 | 31 | 62 | 132 | 6052.5 | 95.2% | 25.2% | 94.6% | 5 |
| frenzyLand | 55 | 31 | 58 | 117 | 6022.5 | 95.8% | 25.2% | 94.6% | 5 |
| frenzyLand | 70 **(shipped)** | 31 | 64 | 148 | 6027.5 | 96.0% | 25.2% | 94.6% | 5 |
| frenzyLand | 80 | 31 | 71 | 322 | 6032.5 | 95.2% | 25.2% | 94.6% | 5 |
| carbLoss | 2 | 166.5 | 539 | 1668 | 74980 | 61.6% | 89.0% | 98.6% | 6 |
| carbLoss | 3 **(shipped)** | 31 | 64 | 148 | 6027.5 | 96.0% | 25.2% | 94.6% | 5 |
| carbLoss | 4 | 27 | 39 | 72 | 4340 | 97.0% | 9.8% | 97.0% | 4 |
| proteinGain | 3 | 25 | 31 | 59 | 4016.5 | 95.8% | 1.0% | 91.2% | 4 |
| proteinGain | 4 **(shipped)** | 31 | 64 | 148 | 6027.5 | 96.0% | 25.2% | 94.6% | 5 |
| proteinGain | 5 | 125 | 502 | 2328 | 52852.5 | 69.6% | 83.6% | 98.6% | 6 |

#### Knob direction / magnitude (ketoBig, relative to shipped)

| knob | range tested | median moves | median score | % frenzy runs | % tier-up runs | shape |
|---|---|---|---|---|---|---|
| refund.deep | 1, 2, 3 | 31 -> 32.5 -> 33 | 4367.5 -> 4464 -> 4516 | 23% -> 23% -> 23% | 96% -> 96% -> 96% | gentle |
| refund.keto | 1, 2, 3 | 29 -> 32.5 -> 35 | 4167.5 -> 4464 -> 4999 | 22% -> 23% -> 24% | 96% -> 96% -> 96% | gentle |
| refund.frenzy | 3, 5, 7 | 31.5 -> 32.5 -> 33 | 4464 -> 4464 -> 4464 | 23% -> 23% -> 23% | 96% -> 96% -> 96% | gentle |
| moveBudget | 20, 25, 30, 35 | 26 -> 32.5 -> 38 -> 43 | 3640 -> 4464 -> 5317 -> 5985 | 22% -> 23% -> 25% -> 25% | 94% -> 96% -> 98% -> 99% | steep |
| drain | 2/3, 3/5, 4/6, 3/7 | 33 -> 32.5 -> 31 -> 31 | 4780.5 -> 4464 -> 4255.5 -> 4324 | 35% -> 23% -> 17% -> 18% | 96% -> 96% -> 96% -> 96% | gentle |
| sugarRush | 1.25, 1.5, 1.75, 2 | 32.5 -> 32.5 -> 32.5 -> 32.5 | 4014 -> 4464 -> 4961 -> 5435 | 23% -> 23% -> 23% -> 23% | 96% -> 96% -> 96% -> 96% | gentle |
| frenzyMoves | 3, 5, 7 | 33 -> 32.5 -> 32 | 4444 -> 4464 -> 4464 | 23% -> 23% -> 23% | 96% -> 96% -> 96% | gentle |
| frenzyLand | 55, 70, 80 | 32.5 -> 32.5 -> 33 | 4464 -> 4464 -> 4464 | 23% -> 23% -> 23% | 96% -> 96% -> 96% | gentle |
| carbLoss | 2, 3, 4 | 85 -> 32.5 -> 27 | 23495 -> 4464 -> 3157.5 | 82% -> 23% -> 10% | 99% -> 96% -> 99% | CLIFF |
| proteinGain | 3, 4, 5 | 25 -> 32.5 -> 66 | 2867.5 -> 4464 -> 16235 | 1% -> 23% -> 79% | 93% -> 96% -> 99% | CLIFF |


### Reading of the sweep

- **The only cliffs are `carbLoss` and `proteinGain`** — the two knobs that set
  the per-tile meter arithmetic. `carbLoss` 3 -> 2 takes ketoBig from 32.5 to
  85 median moves and 4,464 to 23,495 median score; `proteinGain` 4 -> 5 takes
  it to 66 moves and 16,235. Both flip the average refill tile from meter-
  negative to meter-positive, which is the same lever the removed `meterFrozen`
  waiver pulled. `carbLoss` 4 and `proteinGain` 3 are the mirror image
  (frenzy rate collapses to 10.2% and 1.2%).
- **`moveBudget` is the only steep-but-linear knob**: 20/25/30/35 gives
  26/32.5/38/43 median moves and 3,640/4,464/5,317/5,985 median score. It moves
  run length and score without touching frenzy rate much (21.6% -> 25.0%).
- **`refund.keto` is mildly stronger than `refund.deep`** (29/32.5/35 vs
  31/32.5/33 median moves at 1/2/3), because the keto arm is reached far more
  often than the deep arm; both are gentle.
- **`sugarRush` moves score only** — 4,014/4,464/4,961/5,435 at 1.25/1.5/1.75/2
  with median moves pinned at 32.5 and frenzy rate pinned at 23.2%. It is a
  pure score knob under bots that never choose carbs; its behavioural effect
  shows up only in the `tempted` family.
- **`drain` moves frenzy rate more than anything else**: 2/3 vs 3/5 vs 4/6
  gives 35.0% / 23.2% / 17.0% of runs with a frenzy, at nearly constant median
  moves (33 / 32.5 / 31).
- **`frenzyMoves`, `frenzyLand` and `refund.frenzy` barely register** on the
  median run, because only ~23% of ketoBig runs ever frenzy. They move p90/max
  moves (e.g. `frenzyLand` 55/70/80 gives max 82/106/140) and nothing else.
- Tier-up rate is nearly saturated (93-99%) for every knob and value; it is not
  a useful discriminator at the shipped budget.

---

## 5. Dopamine metrics

All tables: 2,000 runs per bot, seeds 1-2000, shipped config.


### Headline (2,000 runs/bot, seeds 1-2000, shipped config)

| bot | median score | p10-p90 score | vs random | median moves | p90 moves | max moves | % budget end | avg frenzies | % runs w/ frenzy | % runs w/ tier-up | median dry gap |
|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 2824 | 1680-6890 | 1.00x | 25 | 42 | 97 | 94.1% | 0.130 | 10.0% | 93.0% | 6 |
| greedy | 3422.5 | 1975-9195 | 1.21x | 27 | 45 | 113 | 93.3% | 0.176 | 13.4% | 95.8% | 5 |
| keto | 4123 | 2116-10775 | 1.46x | 33 | 53 | 113 | 94.3% | 0.283 | 23.3% | 94.8% | 6 |
| ketoBig | 4533 | 2362-12300 | 1.61x | 31 | 54 | 139 | 93.3% | 0.340 | 24.6% | 96.3% | 5 |
| tempted_1_0 | 3144 | 1923-7880 | 1.11x | 25 | 41 | 87 | 96.0% | 0.144 | 10.6% | 97.3% | 5 |
| tempted_1_25 | 3336.5 | 1993-9196 | 1.18x | 25 | 45 | 121 | 94.6% | 0.176 | 12.8% | 96.4% | 5 |
| tempted_1_5 | 3352.5 | 1993-9295 | 1.19x | 27 | 45 | 121 | 94.5% | 0.181 | 13.3% | 96.3% | 5 |
| tempted_2_0 | 4083 | 2278-10615 | 1.45x | 29 | 50 | 102 | 95.0% | 0.240 | 17.8% | 97.0% | 5 |
| lookahead | 6238 | 3190-22491 | 2.21x | 31 | 66 | 200 | 94.2% | 0.510 | 27.5% | 95.0% | 5 |
| casual | 3245 | 1911-8520 | 1.15x | 27 | 46 | 121 | 94.3% | 0.167 | 12.8% | 94.2% | 5 |

### Tier occupancy (mean share of a run's moves, state at end of move)

| bot | crash | normal | keto | deep | frenzy |
|---|---|---|---|---|---|
| random | 17.9% | 75.6% | 4.4% | 0.7% | 1.3% |
| greedy | 19.1% | 73.2% | 5.0% | 0.8% | 1.9% |
| keto | 11.4% | 74.5% | 9.4% | 1.7% | 3.0% |
| ketoBig | 13.3% | 72.8% | 8.6% | 1.8% | 3.5% |
| tempted_1_0 | 25.7% | 68.9% | 3.4% | 0.5% | 1.6% |
| tempted_1_25 | 22.6% | 70.8% | 4.2% | 0.6% | 1.8% |
| tempted_1_5 | 22.6% | 70.8% | 4.2% | 0.6% | 1.8% |
| tempted_2_0 | 16.4% | 73.2% | 6.9% | 1.2% | 2.4% |
| lookahead | 10.5% | 75.3% | 8.7% | 1.5% | 4.0% |
| casual | 15.8% | 75.7% | 5.9% | 0.9% | 1.7% |

### Dopamine: dry gaps, reward density, first good thing

| bot | median longest dry gap | p90 longest dry gap | reward events /10 moves | % runs never tier-up | median move of 1st tier-up | p90 move of 1st tier-up |
|---|---|---|---|---|---|---|
| random | 6 | 9 | 3.75 | 7.0% | 8 | 19 |
| greedy | 5 | 8 | 4.12 | 4.3% | 7 | 16 |
| keto | 6 | 10 | 4.21 | 5.2% | 2 | 14 |
| ketoBig | 5 | 8 | 4.51 | 3.7% | 3 | 14 |
| tempted_1_0 | 5 | 8 | 3.95 | 2.8% | 7 | 16 |
| tempted_1_25 | 5 | 8 | 4.11 | 3.6% | 7 | 16 |
| tempted_1_5 | 5 | 8 | 4.10 | 3.7% | 7 | 16 |
| tempted_2_0 | 5 | 8 | 4.52 | 3.0% | 5 | 16 |
| lookahead | 5 | 8 | 4.83 | 5.0% | 4 | 17 |
| casual | 5 | 9 | 3.98 | 5.9% | 6 | 17 |

### Dopamine: near misses, endings, crash rate

| bot | peak 90-99 & 0 frenzies | ended within 5 of frenzy | ever sat 95-99 then fell back | final move was a reward | % runs that ever crash | % end on lock |
|---|---|---|---|---|---|---|
| random | 10.6% | 0.1% | 9.6% | 34.3% | 84.8% | 5.9% |
| greedy | 12.2% | 0.2% | 12.3% | 39.0% | 88.8% | 6.7% |
| keto | 20.4% | 0.1% | 23.8% | 36.5% | 75.6% | 5.7% |
| ketoBig | 19.1% | 0.1% | 26.0% | 36.6% | 82.5% | 6.7% |
| tempted_1_0 | 9.2% | 0.1% | 8.6% | 40.6% | 95.0% | 4.0% |
| tempted_1_25 | 11.3% | 0.1% | 11.6% | 38.8% | 93.3% | 5.4% |
| tempted_1_5 | 10.8% | 0.1% | 11.9% | 39.1% | 93.5% | 5.5% |
| tempted_2_0 | 16.1% | 0.1% | 18.1% | 40.6% | 87.6% | 5.0% |
| lookahead | 14.9% | 0.1% | 24.3% | 43.3% | 88.3% | 5.8% |
| casual | 14.4% | 0.1% | 12.3% | 37.0% | 82.8% | 5.7% |

### End state distribution (state at the final move)

| bot | crash | normal | keto | deep | frenzy |
|---|---|---|---|---|---|
| random | 30.8% | 68.7% | 0.4% | 0.0% | 0.1% |
| greedy | 30.0% | 69.2% | 0.4% | 0.1% | 0.3% |
| keto | 23.7% | 75.8% | 0.3% | 0.1% | 0.2% |
| ketoBig | 24.9% | 74.4% | 0.4% | 0.0% | 0.4% |
| tempted_1_0 | 31.9% | 67.5% | 0.5% | 0.1% | 0.1% |
| tempted_1_25 | 30.9% | 68.5% | 0.5% | 0.0% | 0.1% |
| tempted_1_5 | 31.4% | 68.0% | 0.5% | 0.0% | 0.1% |
| tempted_2_0 | 27.7% | 71.9% | 0.4% | 0.1% | 0.1% |
| lookahead | 27.0% | 72.3% | 0.5% | 0.1% | 0.1% |
| casual | 26.8% | 72.5% | 0.6% | 0.1% | 0.1% |

### Climb variability (moves from entering keto >=70 to hitting 100) and frenzy value

| bot | climbs recorded | median | p10 | p90 | max | pts/move in frenzy | pts/move outside | frenzy share of total score |
|---|---|---|---|---|---|---|---|---|
| random | 216 | 3 | 2 | 6 | 9 | 555 | 116 | 9.5% |
| greedy | 263 | 3 | 2 | 5 | 11 | 614 | 137 | 11.5% |
| keto | 525 | 4 | 2 | 6 | 18 | 503 | 138 | 13.0% |
| ketoBig | 641 | 3 | 2 | 6 | 12 | 563 | 153 | 15.6% |
| tempted_1_0 | 194 | 3 | 2 | 4 | 8 | 676 | 129 | 11.6% |
| tempted_1_25 | 255 | 3 | 2 | 5 | 10 | 681 | 137 | 12.9% |
| tempted_1_5 | 277 | 3 | 2 | 5 | 10 | 678 | 137 | 13.1% |
| tempted_2_0 | 429 | 3 | 2 | 6 | 11 | 573 | 148 | 12.6% |
| lookahead | 877 | 3 | 2 | 6 | 13 | 844 | 215 | 21.3% |
| casual | 275 | 3 | 2 | 6 | 9 | 608 | 126 | 11.5% |

### Luck overlap (paired by seed)

- random beats ketoBig on **20.3%** of seeds
- casual beats lookahead on **13.8%** of seeds
- movesEarned (refunded moves) median: random=2, greedy=2, keto=8, ketoBig=8, tempted_1_0=0, tempted_1_25=2, tempted_1_5=2, tempted_2_0=4, lookahead=8, casual=2

### Choice reality (all decision points in the moves CSVs, by tier held)


### Choice reality (pooled over all 10 bots)

| tier held | n | carb pays more | protein pays more | equal | no protein move available |
|---|---|---|---|---|---|
| crash | 9200 | 59.7% | 25.8% | 1.6% | 12.9% |
| normal | 48170 | 57.8% | 19.5% | 2.0% | 20.7% |
| keto | 5526 | 51.4% | 15.7% | 2.3% | 30.6% |
| deep | 949 | 45.8% | 13.8% | 2.2% | 38.1% |
| frenzy | 2349 | 52.7% | 18.5% | 2.4% | 26.4% |


Notes on the tables:

- Choice reality is pooled over all ten bots' moves CSVs (60 runs per bot).
  "no protein move available" rises monotonically with tier held (12.9% in
  crash, 20.7% normal, 30.6% keto, 38.1% deep) — the higher you climb, the more
  often the board forces a carb clear.
- `endedWithin5OfFrenzy` is ~0.1% for every bot: runs essentially never end
  while the meter is parked at 95-99. The near-miss that actually happens is
  the mid-run one (`ever sat 95-99 then fell back`: 26.0% for ketoBig).
- Crash rate is 76-95% for every bot including `keto` — crashing is not a
  random-play failure mode, it is the normal consequence of any large
  carb-heavy cascade, since the drain floor of 40 protects only against
  attrition.

---

## 6. What I still do not trust

1. **`peakThisMove` as a proxy for "the meter the player saw."** It is
   initialised to `meterBefore` and only updated inside the non-frenzy branch,
   so a move that starts at 96 and immediately drops still registers a peak of
   96. Everything built on it (`peakMeter`, `nearMissNoFrenzy`,
   `endedWithin5OfFrenzy`, and my `peakTierUp` fix) inherits that. It is the
   right call for tier-up detection but slightly inflates near-miss rates.
2. **`pctMovesByState` uses the state *after* `endOfMove`.** The fifth and last
   move of a frenzy therefore records as `keto`, because the landing sets the
   meter to 70 before the state is read. This matches what the game itself
   pushes into its end-card arc (`run.history`), so I left it, but it
   systematically under-reports frenzy occupancy by roughly one move in six.
   The GDD's historical "29% frenzy occupancy" is not comparable to the 3.5%
   here for that reason *and* because it was measured under the waiver.
3. **`tempted(k)` decisions do not always agree with the recorded
   `altProteinPts`/`altCarbPts`.** Cross-checking the moves CSVs, ~10% of
   `tempted_1_5` decisions disagree with the recorded alt values. Two causes,
   both benign but worth knowing: (a) ~420/4,650 cases where a move classified
   "carb" by `m.protein` (which, like the game's own `scanMoves`, ignores
   special-tile chaining) resolves into a step-1 clear that *does* contain
   protein because a special detonated; (b) ~54 cases where the bot's
   random tie-break among equal-size moves previews a different resolved clear
   than `sim.js`'s deterministic first-max pick. The recorded alt values are
   the canonical ones the spec asks for; the bot's own comparison is internally
   consistent. Neither is a scoring bug, but "carb move" is a fuzzier category
   than it looks.
4. **`greedy` and `random` differ by less than I would like** (3,422 vs 2,824
   median, 1.21x). Combined with `random` beating `ketoBig` on 20.3% of seeds
   and `casual` beating `lookahead` on 13.8%, board luck is a large share of
   the variance. This is a measurement I trust; whether it is acceptable is a
   design question.
5. **The `lookahead` value function is a guess.** The spec describes it loosely
   ("expected step-1 points of the best move on the resulting board plus a
   bonus for meter gained ... weight ~5 pts per meter point"); I fixed the sign
   and made frenzy score as a full meter, but the 5-per-point weight is
   arbitrary and now dominates the `pts` term. `lookahead` is a ceiling
   estimate, not a tight one.
6. **Moves CSVs cover the first 60 runs, not the spec's 200.** At 200 the
   `results/` directory reaches 8.4 MB against the spec's 5 MB cap; at 60 it is
   4.9 MB. All move-level statistics above (choice reality, the `tempted`
   cross-check) rest on 60 runs per bot.
7. **The parity harness stubs the DOM.** It proves `engine.js` matches the
   game's *logic* under a synchronous `setTimeout`/`rAF`. It does not and
   cannot prove anything about behaviour that depends on real timing, input
   handling, or a swap being rejected mid-animation.

---

## 7. v33 shipped config (2026-09-04)

Config change: `tiers` keto drain 3->2, deep drain 5->3 (crash/normal drain
stay 1); `moveBudget` 25->30; `specialFloorStep1` false->true (now always on).
`detonationCarbsFree` remains false. Old baseline moved to `results-v32/`.
All tables below: 2,000 runs/bot, seeds 1-2000, new shipped config (sweep:
500 runs/bot/value, seeds 1-500).

### Headline (2,000 runs/bot, seeds 1-2000, shipped config)

| bot | median score | p10-p90 score | vs random | median moves | p90 moves | max moves | % budget end | avg frenzies | % runs w/ frenzy | % runs w/ tier-up | median dry gap |
|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 3485.5 | 2070-9336 | 1.00x | 32 | 52 | 118 | 93.0% | 0.229 | 16.0% | 94.5% | 6 |
| greedy | 4272.5 | 2490-12710 | 1.23x | 32 | 58 | 166 | 91.5% | 0.337 | 22.4% | 97.0% | 5 |
| keto | 5390 | 2640-14642 | 1.55x | 39 | 67 | 146 | 93.0% | 0.576 | 37.7% | 96.5% | 6 |
| ketoBig | 6135.5 | 2966-18198 | 1.76x | 40 | 70 | 176 | 92.0% | 0.716 | 40.3% | 97.2% | 6 |
| tempted_1_0 | 3914.5 | 2459-10681 | 1.12x | 32 | 50 | 116 | 94.5% | 0.254 | 16.8% | 98.2% | 5 |
| tempted_1_25 | 4219.5 | 2494-12064 | 1.21x | 32 | 54 | 160 | 93.0% | 0.329 | 20.0% | 97.9% | 5 |
| tempted_1_5 | 4227.5 | 2488-12335 | 1.21x | 32 | 54 | 162 | 93.2% | 0.326 | 20.3% | 98.0% | 5 |
| tempted_2_0 | 5285 | 2911-15088 | 1.52x | 36 | 63 | 140 | 93.8% | 0.483 | 29.9% | 96.9% | 5 |
| lookahead | 8805 | 4098-40855 | 2.53x | 42 | 100 | 251 | 92.5% | 1.250 | 43.1% | 96.1% | 5 |
| casual | 4062 | 2370-11625 | 1.17x | 34 | 58 | 141 | 92.8% | 0.331 | 21.5% | 95.4% | 6 |

### Tier occupancy (mean share of a run's moves, state at end of move)

| bot | crash | normal | keto | deep | frenzy |
|---|---|---|---|---|---|
| random | 17.7% | 73.9% | 5.3% | 1.1% | 2.1% |
| greedy | 17.2% | 72.1% | 6.3% | 1.3% | 3.1% |
| keto | 10.5% | 71.6% | 10.6% | 2.4% | 5.0% |
| ketoBig | 10.8% | 70.7% | 9.9% | 2.6% | 6.0% |
| tempted_1_0 | 23.7% | 68.8% | 4.4% | 0.8% | 2.3% |
| tempted_1_25 | 20.8% | 70.0% | 5.4% | 1.1% | 2.8% |
| tempted_1_5 | 20.8% | 69.9% | 5.4% | 1.1% | 2.8% |
| tempted_2_0 | 13.3% | 72.7% | 8.1% | 1.9% | 4.1% |
| lookahead | 8.0% | 71.4% | 10.9% | 2.5% | 7.2% |
| casual | 15.0% | 73.7% | 7.0% | 1.4% | 2.8% |

### Dopamine: dry gaps, reward density, first good thing

| bot | median longest dry gap | p90 longest dry gap | reward events /10 moves | % runs never tier-up | median move of 1st tier-up | p90 move of 1st tier-up |
|---|---|---|---|---|---|---|
| random | 6 | 10 | 3.81 | 5.5% | 8 | 20 |
| greedy | 5 | 9 | 4.17 | 3.0% | 7 | 18 |
| keto | 6 | 10 | 4.23 | 3.5% | 3 | 16 |
| ketoBig | 6 | 9 | 4.50 | 2.9% | 3 | 16 |
| tempted_1_0 | 5 | 9 | 4.01 | 1.8% | 8 | 17 |
| tempted_1_25 | 5 | 9 | 4.16 | 2.1% | 7 | 18 |
| tempted_1_5 | 5 | 8 | 4.16 | 2.1% | 7 | 18 |
| tempted_2_0 | 5 | 9 | 4.53 | 3.1% | 5 | 18 |
| lookahead | 5 | 8 | 4.94 | 3.9% | 4 | 18 |
| casual | 6 | 10 | 4.05 | 4.6% | 6 | 18 |

### Dopamine: near misses, endings, crash rate

| bot | peak 90-99 & 0 frenzies | ended within 5 of frenzy | ever sat 95-99 then fell back | final move was a reward | % runs that ever crash | % end on lock |
|---|---|---|---|---|---|---|
| random | 10.3% | 0.1% | 10.8% | 35.8% | 87.2% | 7.0% |
| greedy | 10.7% | 0.1% | 17.6% | 36.7% | 89.6% | 8.5% |
| keto | 15.4% | 0.1% | 23.8% | 36.4% | 76.8% | 7.0% |
| ketoBig | 14.0% | 0.1% | 26.5% | 34.4% | 80.6% | 8.0% |
| tempted_1_0 | 8.8% | 0.1% | 12.1% | 38.1% | 95.8% | 5.5% |
| tempted_1_25 | 10.8% | 0.3% | 14.6% | 37.7% | 93.8% | 7.0% |
| tempted_1_5 | 10.9% | 0.3% | 14.5% | 39.1% | 93.6% | 6.9% |
| tempted_2_0 | 13.8% | 0.2% | 21.6% | 39.9% | 86.3% | 6.2% |
| lookahead | 11.0% | 0.3% | 32.3% | 41.0% | 87.5% | 7.5% |
| casual | 13.2% | 0.1% | 15.3% | 38.7% | 84.9% | 7.1% |

### Climb variability (moves from entering keto >=70 to hitting 100) and frenzy value

| bot | climbs recorded | median | p10 | p90 | max | pts/move in frenzy | pts/move outside | frenzy share of total score |
|---|---|---|---|---|---|---|---|---|
| random | 411 | 3 | 2 | 7 | 15 | 533 | 119 | 12.7% |
| greedy | 567 | 3 | 2 | 6 | 15 | 610 | 144 | 16.3% |
| keto | 1102 | 4 | 2 | 7 | 19 | 504 | 144 | 19.7% |
| ketoBig | 1367 | 4 | 2 | 6 | 15 | 563 | 162 | 23.2% |
| tempted_1_0 | 392 | 3 | 2 | 6 | 13 | 649 | 134 | 15.1% |
| tempted_1_25 | 532 | 3 | 2 | 6 | 20 | 645 | 142 | 17.3% |
| tempted_1_5 | 536 | 3 | 2 | 6 | 20 | 649 | 142 | 17.2% |
| tempted_2_0 | 891 | 3 | 2 | 6 | 15 | 602 | 156 | 19.3% |
| lookahead | 2278 | 3 | 2 | 7 | 18 | 816 | 239 | 30.6% |
| casual | 600 | 3 | 2 | 7 | 19 | 555 | 131 | 15.9% |

### Luck overlap (paired by seed)

- random beats ketoBig on **19.1%** of seeds
- casual beats lookahead on **12.8%** of seeds
- movesEarned (refunded moves) median: random=2, greedy=4, keto=10, ketoBig=10, tempted_1_0=2, tempted_1_25=2, tempted_1_5=2, tempted_2_0=6, lookahead=12, casual=4

### Sensitivity sweep: ketoBig knob direction / magnitude (relative to new shipped config)

500 runs/bot/value, seeds 1-500. Shape classed **CLIFF** when best/worst
ratio across the tested range exceeds 2x on median moves or median score,
**steep** above 1.25x moves / 1.4x score, else **gentle**.

| knob | range tested | median moves | median score | % frenzy runs | % tier-up runs | shape |
|---|---|---|---|---|---|---|
| refund.deep | 1, 2, 3 | 38 -> 40 -> 41 | 6160.5 -> 6232 -> 6329.5 | 39% -> 40% -> 40% | 97% -> 97% -> 97% | gentle |
| refund.keto | 1, 2, 3 | 36 -> 40 -> 43 | 5789 -> 6232 -> 6738.5 | 39% -> 40% -> 40% | 97% -> 97% -> 97% | gentle |
| refund.frenzy | 3, 5, 7 | 39 -> 40 -> 40 | 6152.5 -> 6232 -> 6249.5 | 40% -> 40% -> 40% | 97% -> 97% -> 97% | gentle |
| moveBudget | 20, 25, 30, 35 | 28 -> 34 -> 40 -> 45 | 4170 -> 5350.5 -> 6232 -> 7071.5 | 35% -> 38% -> 40% -> 41% | 93% -> 96% -> 97% -> 98% | steep |
| drain | 2/3, 3/5, 4/6, 3/7 | 40 -> 38 -> 38 -> 38 | 6232 -> 5661.5 -> 5200.5 -> 5569 | 40% -> 28% -> 21% -> 23% | 97% -> 97% -> 97% -> 97% | gentle |
| sugarRush | 1.25, 1.5, 1.75, 2 | 40 -> 40 -> 40 -> 40 | 5579.5 -> 6232 -> 6889.5 -> 7525 | 40% -> 40% -> 40% -> 40% | 97% -> 97% -> 97% -> 97% | gentle |
| frenzyMoves | 3, 5, 7 | 39.5 -> 40 -> 40 | 6139 -> 6232 -> 6269.5 | 40% -> 40% -> 40% | 97% -> 97% -> 97% | gentle |
| frenzyLand | 55, 70, 80 | 39 -> 40 -> 40 | 6107.5 -> 6232 -> 6380.5 | 40% -> 40% -> 40% | 97% -> 97% -> 97% | gentle |
| carbLoss | 2, 3, 4 | 110 -> 40 -> 32 | 36587.5 -> 6232 -> 3795 | 92% -> 40% -> 16% | 99% -> 97% -> 98% | CLIFF |
| proteinGain | 3, 4, 5 | 30 -> 40 -> 96.5 | 3454 -> 6232 -> 27520 | 3% -> 40% -> 88% | 94% -> 97% -> 100% | CLIFF |

### Cross-check vs CANDIDATES.md

`CANDIDATES.md`'s `ABC1` config (AB + `specialFloorStep1`, same seeds) used
the same rules now shipped as the new default. New default-config run matches
it exactly on the headline numbers checked: ketoBig median score 6135.5
(ABC1: 6135.5), casual median score 4062.0 (ABC1: 4062.0), luck overlap
19.1%/12.8% (ABC1: 19.1%/12.8%). No discrepancy.
