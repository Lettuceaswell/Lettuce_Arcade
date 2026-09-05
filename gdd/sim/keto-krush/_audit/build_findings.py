# -*- coding: utf-8 -*-
import io, os
d = os.path.dirname(os.path.abspath(__file__))
os.chdir(os.path.join(d, ".."))
tables = io.open("_audit/tables.md", encoding="utf-8").read()
sweep = io.open("_audit/sweep.md", encoding="utf-8").read()

head = u"""# Keto Krush sim — audit findings

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

"""

tail = u"""
---

## 4. Sensitivity sweep

500 runs per bot per value (seeds 1-500), bots `casual`, `ketoBig`,
`lookahead`. Direction summary is for `ketoBig`; shape is classed **CLIFF**
when the best/worst ratio across the tested range exceeds 2x on median moves or
median score, **steep** above 1.25x moves / 1.4x score, else **gentle**.

""" + sweep + u"""

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

""" + tables + u"""

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
"""

io.open("FINDINGS.md", "w", encoding="utf-8", newline="\n").write(head + tables.split("### Tier occupancy")[0].strip() + u"\n" + tail)
print("wrote FINDINGS.md")
