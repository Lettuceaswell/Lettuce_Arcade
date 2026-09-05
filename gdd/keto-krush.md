# Keto Krush

- **Slug:** `games/keto-krush/`
- **Emoji:** 🍖
- **Status:** shipped (v33) — ketosis economy, the move budget, and the end
  card are built; retuned from a simulation audit (drain 2/3, budget 30,
  special-detonation floor) with tier-up ceremony and special-tile marks

## One-line pitch
A match-3 where the board is a plate: fat and protein compound into a
runaway multiplier, carbs pay you cash today and cost you the run's peak.

---

## Design principle: the meter has to be a decision, not an instruction

The shipped ketosis meter (v13) doesn't incentivize anything. Three reasons,
all measurable in the current code:

1. **Overflow is discarded.** `multiplier = ketosis >= 70 ? 2 : ...` — play at
   71 and play at 100 are identical. From the 50 start, two protein 3-matches
   (+12 each) clear the line, and everything above it is dead meter. The
   moment you enter ketosis, the meter stops being a reason to do anything.
   This is the literal answer to "there is no incentive to chain keto": the
   chain has nowhere to go.
2. **Building it is free.** `score += round(gained * comboStep * multiplier)`
   treats a 🍖 run and a 🍕 run identically. Protein is strictly better than
   carbs — same points, plus meter. A choice where one option dominates isn't
   a choice, and `findHint()` even prefers protein swaps, so the game hands
   you the answer.
3. **The only escalating multiplier is the one you don't control.**
   `comboStep` comes from cascade luck. The stat the player fully controls
   (ketosis) is flat; the stat they can't steer (cascades) is the one that
   compounds. Backwards.

Everything below follows from one rule: **carbs must be genuinely tempting.**
Until the thing you're giving up has real value, "chain keto" is a chore
with a checkmark, not a decision with a cost.

### Drafts rejected on the way here

- **v1 — "Keto Streak" counter** (consecutive protein matches, `1 + 0.5×n`,
  breaks on any carb). Bolts a second meter next to the first, both saying
  "match protein" — redundant. Worse: it breaks when the *board* offers no
  protein match, so the punishment lands on luck rather than choice.
- **v2 — meter as draining fuel, continuous multiplier.** Right instinct
  (pressure, no cliff) but it makes carbs pure poison, so 3 of 5 icons become
  inert obstruction and the icon set collapses to "protein / not protein." A
  continuous decimal multiplier is also unreadable at a glance on a phone.
- **v3 — carbs pay flat, protein pays at multiplier.** Fixes the temptation
  but inverts into a trap: at 1× carbs always win, so nobody ever starts the
  climb. The temptation has to be a *percentage*, so it stays real at the
  bottom and gets visibly outclassed at the top.

---

## The incentive: climb, frenzy, land

The meter becomes a **tiered, self-draining multiplier with a payoff state at
the top.** Four moving parts, each doing one job.

### 1. Tiers — the chain has somewhere to go

Overflow above 70 stops being wasted. The meter reads as named bands, not a
decimal, so it's legible in a glance:

| Meter | State | Multiplier |
|---|---|---|
| 0–15 | 🍩 Carb crash | 0.5× |
| 16–69 | Normal | 1× |
| 70–84 | 🥑 Ketosis | 2× |
| 85–99 | 🔥 Deep ketosis | 3× |
| 100 | ⚡ Fat-adapted | 4× (see 4) |

Meter gain is unchanged: **+4 per protein tile, −3 per carb tile.**

### 2. Sugar rush — the temptation

**A clear step that is all carbs scores ×1.5.** Carbs are fast energy; that's
the whole point of carbs. This is what makes every move a question instead of
a habit.

It self-balances against the tier, which is why it works:

- At **1×**, a carb 3-match pays 4.5 against protein's 3. Carbs are ~50%
  better *right now* — so starting a climb is a deliberate act of restraint,
  not the default.
- At **3×**, that same carb 3-match pays 135 against protein's 90 — but costs
  −9 meter plus drain, wiping out more than a full protein match and pushing
  the 4× frenzy further away. +45 now against roughly 1.5 moves of climbing.
- Near a tier boundary it's genuinely agonizing, which is the entire goal.

**The multiplier is read before the meter reacts to the clear.** This looked
like an implementation detail and is actually load-bearing: with the meter
updated first, a carb run taken from deep ketosis loses the tier *and* scores
at the lower tier — a double penalty that makes carbs strictly worse and
deletes the temptation entirely. Measured at deep ketosis, the wrong order
gave carbs 90 against protein's 120; the right order gives carbs 135 against
90. Within a cascade the multiplier is re-read each step, so a chain that
climbs into a new tier pays off on its later steps.

### 3. Metabolic drain — why you have to *chain*, not just arrive

**Every resolved move costs meter, and higher tiers cost more to hold:**

| State | Drain / move |
|---|---|
| Normal | −1 |
| 🥑 Ketosis | −3 |
| 🔥 Deep ketosis | −5 |

Deep ketosis burns faster — true metabolically and exactly right
mechanically. A protein 3-match nets +12−5 = +7 at deep ketosis, so a single
protein match barely buys back its own upkeep up there. **Holding a tier
requires a sustained chain; one protein match is a payment against a running
clock, not a checkbox.** That is the chain incentive.

The steep top end is deliberate and was raised from 2/3 during tuning (see
Tuning knobs): deep ketosis should be a state you *pass through* on the way
to the frenzy, not one you park in.

Two guards keep this from feeling like attrition:

- **Drain applies once per resolved move, never per cascade step.** Cascades
  are a reward; taxing them punishes the best outcome in the game.
- **Drain floors at 40.** You cannot fast your way into a carb crash — only
  carbs crash you. The 0.5× state stays a consequence of choices.

### 4. Fat-adapted — the payoff the chain is climbing toward

Hitting 100 doesn't just set a 4× flag. It fires a **5-move Fat-Adapted
frenzy**:

- Multiplier **4×**.
- **Carbs stop crashing you.** You're metabolically flexible — you burn them.
  Carb matches still take the sugar rush ×1.5, so a carb run during a frenzy
  pays an effective **6×**.
- The meter is frozen for the duration; the banner counts down moves.
- On expiry the meter **lands at 70**, not zero. You earned base ketosis; you
  didn't earn keeping the peak.

This is what makes the chain compelling rather than merely correct. The
restraint you've been holding for six-plus moves releases into a short window
where you eat everything on the board at 6×. Then you're back at the foot of
the climb with a rhythm to repeat: **climb → release → land → climb.** A run
becomes a series of arcs instead of a flat grind toward "no moves left."

Rough climb cost, from base ketosis at 70: +12 per protein 3-match against
−3/−5 drain nets +9 through the keto band and +7 through deep, so **~5 clean
protein matches to reach 100**, realistically 7–9 with carb interference.
Demanding, not grindy.

### Measured

> **Superseded (2026-09-04).** These numbers were taken under the carb waiver
> retired in v20 and before the v28 cascade floor. Under the shipped rules the
> frenzy share for skilled play is ~4%, not 29%, and the crash tier is reached
> in most runs by every strategy. See [Simulation audit](#simulation-audit-2026-09-04).

Simulated 600 moves per strategy against the shipped build, plus 12 full runs
to board-lock each:

| Strategy | Crash | Normal | Keto | Deep | Frenzy | Avg run score |
|---|---|---|---|---|---|---|
| Always protein (perfect bot) | 0% | 13% | 46% | 12% | 29% | 99,043 |
| Mixed 50/50 (realistic) | 0% | 38% | 43% | 6% | 13% | — |
| Always carbs | 30% | 59% | 8% | 2% | 1% | 46,203 |

**Chaining keto out-scores always-carbs by 2.6×**, which is the number that
matters: the incentive is real, not decorative. Ignoring the meter entirely
puts you in carb crash 30% of the time. Deep ketosis sitting at 6–12% across
strategies confirms it reads as a transition rather than a parking spot.

### Fairness valve: retired

The first two economies waived the carb loss whenever the board offered no
protein-producing swap — "you can't be punished for eating what the board
forced on you." Playtest verdict after the move budget landed: runs were
still too long, because there was almost always a keto option to stay
afloat, and when there wasn't, carbs were free. The waiver was covering
for exactly the situation the player creates by spending their protein.

So it's gone: **carbs always cost the meter.** A protein-starved board is
the consequence of the protein you already took, and paying for it is the
point. The drain was never waived and still isn't. If runs now end too
*fast* instead, the next lever is `MOVE_BUDGET` / `REFUND`, not the waiver.

### The rule

**A run is 25 moves. Reaching a new metabolic tier buys more.**

| Reached | Refund |
|---|---|
| 🥑 Ketosis (70) | +2 moves |
| 🔥 Deep ketosis (85) | +2 moves |
| ⚡ Fat-adapted (100) | +5 moves |

A refund is armed while you're *below* a threshold and spent when you cross it,
so one climb pays once — the frenzy landing at exactly 70 doesn't re-pay the
ketosis refund on the way down, and sliding back down from deep into ketosis
doesn't pay at all. The run ends at zero moves, or on board lock if that
somehow comes first.

This is deliberately the only source of moves. Cascades don't grant any — the
GDD's whole complaint about `comboStep` is that it's the multiplier you *don't*
control, and run length shouldn't hang on it either. The meter is the stat the
player fully controls, so the meter is what decides how long they play.

### Why it fixes the climb

The 15-move climb to the first frenzy used to be free. Against a 25-move budget
it's most of the run — which turns the sugar rush from a mild curiosity into
the decision it was designed to be. Carbs now cost you *time*, not just
multiplier.

### Measured

> **Superseded (2026-09-04).** The 134 / 170 medians and the refund.deep
> cliff were measured with the v20 carb waiver still on (confirmed by
> reproducing them with the waiver re-enabled: 155 / 171). Under the shipped
> rules skilled play lasts a median of 31–33 moves and refund.deep is one of
> the flattest knobs in the game. The same stale figures live in a comment
> above `MOVE_BUDGET` in the game source. See
> [Simulation audit](#simulation-audit-2026-09-04).

250 runs per strategy against the shipped rules:

| Strategy | Median | p90 | Max | Avg score | Frenzies | Ended on budget |
|---|---|---|---|---|---|---|
| Perfect protein | 134 | 220 | 368 | 37,255 | 7.3 | 90% |
| Biggest protein match | 170 | 276 | 527 | 58,340 | 10.8 | 74% |
| Casual | 31 | 62 | 121 | 5,685 | 0.4 | 94% |
| Random | 29 | 61 | 115 | 5,398 | 0.3 | 93%|

A casual round is ~31 moves, about two minutes — quick and instantly
replayable. Skilled play stretches that 4–5×, and the budget is what ends the
run for ~90% of everyone. Note that "biggest protein match" beats "always
protein": taking the *largest* protein match outperforms merely taking a
protein one, so the skill ceiling rewards reading the board rather than
pattern-matching on 🍖.

**The refund margin is thin and the cliff is real.** At +3 for deep ketosis
instead of +2, a climb more than pays for itself and skilled play runs away
again — median 676 moves, max 5,001, and only 14% of runs ending on the budget.
This is the first knob to distrust; move it by 1 and re-measure.

---

## The end card (v23)

Playtest note: the run ended on two lines of text under the board. No
ceremony, nothing to screenshot, and a player who never understood the meter
learned nothing from losing.

**Principle: the card teaches with pictures and numbers, never sentences.**
Nothing on it says "carbs crash you". A player who ignored the meter can see
it happen.

### What it shows

- **The run arc.** One bar per resolved move, height = meter, colour = tier.
  The whole run in one glance: the green climb, the purple frenzy plateau, the
  red cliff where a carb run landed. A 🍩 marks the single worst carb move
  (only if it cost at least a full carb 3-match, so a stray carb swept up in a
  cascade doesn't get blamed). A five-dot legend under it uses only the tier
  names the meter already shows.
- **Score, then where it came from.** Big score that counts up, then a slim
  stacked bar of points-per-tier in the tier colours. A casual run's bar is
  all yellow; a good run's is mostly purple and blue.
- **Moves** as "48 moves · 25 + 23 earned". The earned number is the brag.
- **The plate.** Protein against carb tiles cleared, as a two-tone bar with
  the percentages at each end.
- **Highlights**: biggest single move, longest cascade, frenzies this run.
  Each that beats a stored record gets a 🏆, so a low-scoring run can still
  set one. That is the "feel better" mechanic, and it's the reason there are
  three of them.
- **A run title**, always affectionate: Butter Machine (4+ frenzies),
  Metabolically Flexible (2+), Fat-Adapted (1), Cheat Day (crashed), So Close
  (peaked at 95+), Slow Burner (reached deep), Keto Curious (reached keto),
  Carb Loader (under 40% protein), Warming Up (everything else). A frenzy
  outranks a crash: if you got there, that's the story of the run.
- Branding and date in the header, personal best and lifetime totals in the
  footer, so a screenshot identifies itself.

### Ceremony

The board dims behind a fixed overlay and the card rises. The arc draws left
to right over about a second while the score counts up with a rising tick.
The stat rows fade in with a short stagger, the title stamps in with a chord
(the frenzy arpeggio on a new best), and the buttons arrive last. A tap
anywhere skips to the end. Reduced motion goes straight there.

**Look at the board** dismisses the overlay so you can inspect the lock or
the last move; two buttons under the board bring the card back or restart.

### Share

Web Share API with clipboard as the fallback, matching Daily Letters. The
text compresses the arc into a Wordle-style strip of at most 16 emoji, each
the tier held for most of its slice of the run:

```
🍖 Keto Krush · 12,340
⬜⬜🥑🥑🔥⚡⚡⚡🥑🍩⬜🥑🔥⚡⚡
48 moves · ⚡×2 · Fat-Adapted
```

No image rendering: the card is designed to be screenshotted instead, which
is what the family will do anyway.

### Persistence

Three new records via `Arcade.save`: `bestMove` (points, resets with `econ`
like the high score), `bestCombo` and `bestFrenzies` (events, carry over).

### Decisions

- No generated sentence ("a pizza run knocked you out on move 14"). It's the
  most direct explanation and it reads as a tutorial, which the playtest note
  said to avoid.
- No player name on the card. Daily Letters has one, but its profile is
  namespaced per game and a shared arcade-wide name is a separate decision.

---

## Rules

Standard match-3 on a 6×6 grid, 5 icons (🍖 🧀 protein / 🍕 🥐 🍪 carb).
Swap adjacent tiles to line up 3+; 4+ in a run leaves a special tile (row /
column / cross) that detonates when swept into a later clear. A run is a
budget of 25 moves, extended only by climbing the meter (above); it ends at
zero moves, or on board lock. No timer.

The metabolic layer above is the scoring economy sitting on top of that loop.

## Controls / interaction
- Tap-tap or swipe to swap adjacent tiles. Both are already implemented and
  both stay.
- Board sizing floors cells at 44px (`computeLayout()`), so the 6×6 stays
  inside the tap-target rule on the smallest supported phone.
- No hover, no drag, no multi-touch. One thumb.

## Session shape
- Turn-based and fully pausable — the board never acts on its own. Drain and
  the move budget are both charged per *move*, never per second, so putting
  the phone down mid-climb costs nothing.
- A casual run is ~31 moves, about two minutes. A strong run stretches to
  ~170, and the measured worst case is ~530 — long, but bounded.

## Scoring / persistence

`score += round(gained × comboStep × tierMultiplier × (allCarbs ? 1.5 : 1))`

Saved via `Arcade.save`/`Arcade.load` (namespaced automatically):

- `highScore` — best run (already shipped).
- `cleared` — lifetime tiles cleared (already shipped).
- `frenzies` — lifetime Fat-Adapted triggers. Cheap to add and it's the right
  brag: it counts completed chains, not luck.
- `econ` — economy marker, now 3. Scores from the unbounded-run economy aren't
  comparable to scores from a 25-move budget, so the personal best resets once.
  Lifetime `cleared` and `frenzies` carry over — they count events, not points.

The run-over card reports moves taken and how many of them were earned
("48 moves — you earned 23 of them"), because the stretch is the real brag.

No daily seed — this is a score-attack game, not a daily.

## Accessibility notes
- Every tier is named in text in `#ketosis-label` and announced through the
  existing `aria-live="polite"` `#status`, never signalled by bar color
  alone.
- The frenzy countdown is text ("⚡ Fat-adapted — 3 moves"), not a bare
  animation.
- Tap targets unchanged at ≥44px.

## Build checklist

- [x] Replace the binary `multiplier` with the five-tier table; keep
      `ketosisState` as the tier name so the existing transition/sound hook
      still works.
- [x] Sugar rush: track per-clear-step whether `proteinCount === 0` — the
      counts are already computed in `resolveCascade`'s `step()`.
- [x] Per-move drain, charged once when a swap resolves (not inside `step()`),
      floored at 40.
- [x] Fat-Adapted: 5-move counter, 4×, carb-loss suppressed, meter frozen,
      lands at 70 on expiry.
- [x] ~~Frozen-board valve~~ — retired; carbs always cost the meter.
- [x] Two new sounds — frenzy start (rising arpeggio) and frenzy end (soft
      fall). Reuse the existing `tone()` helper; no assets.
- [x] Reset the stored personal best once, via an `econ` marker — scores from
      the old economy aren't comparable. Lifetime `cleared` carries over.
- [x] Bump `Arcade.VERSION` to 14.
- [x] No new files, no new deps, no `games.json` change.

### Move budget (v17)

- [x] `MOVE_BUDGET` of 25, decremented once per resolved move in `endOfMove()`
      alongside the drain — never per cascade step, for the same reason.
- [x] `REFUND` table; `payRefunds()` arms below a threshold and pays on the way
      up, so one climb pays once.
- [x] Frenzy pays `REFUND.frenzy` and clears both arms; they re-arm on the way
      back down.
- [x] `#movebar` counter above the meter, red at ≤5 left, green scale-flash on
      a refund (suppressed under `prefers-reduced-motion`).
- [x] Refund announced in the existing tier banner, driven by `pendingRefund`
      so a *downward* crossing never claims a refund it didn't get.
- [x] Run ends on `movesLeft <= 0` or board lock; the card distinguishes them.
- [x] Bump `ECON` to 3 and `Arcade.VERSION` to 17.
- [x] No new files, no new deps, no `games.json` change.

## Tuning knobs

0. **Refund table (+2 / +2 / +5) and starting budget (25).** *Corrected
   2026-09-04:* the refund cliff described here earlier was an artefact of the
   retired carb waiver. Under shipped rules refund.deep 1→5 moves the skilled
   median from 31 to 34 moves; refund.keto is slightly stronger (29/33/35 at
   1/2/3) because the keto arm is reached far more often. Both are safe.
   Starting budget is the steep-but-linear knob: 20/25/30/35 gives 26/33/38/43
   median moves for skilled play and 22/27/33/39 for casual.
1. **Drain rates (1/3/5).** The dial that decides how much of a chain is
   upkeep versus progress. Raised from 1/2/3 to 1/3/5 to fix a 33% frenzy
   share that, in hindsight, came from the waiver rather than the drain.
   *Under shipped rules this is the frenzy-rate knob:* 2/3 vs 3/5 vs 4/6 on
   the top two bands gives 35% / 23% / 17% of skilled runs a frenzy, at a
   flat 31–33 median moves. It moves the payoff rate without moving run length.
1b. **Meter per tile (+4 protein / −3 carb).** *The real cliffs.* With 2 of 5
   icons protein, a random refill tile is worth −0.2 meter on average, and
   cascades are long, so the meter leaks on every chain. carbLoss 3→2 takes
   skilled play from 33 to 85 median moves and quintuples score; proteinGain
   4→5 does the same (66 moves). carbLoss 4 or proteinGain 3 collapses the
   frenzy rate to 1–10%. Change either by one and re-measure; these are the
   knobs the old refund warning was really about.
2. **Sugar rush multiplier (1.5×).** How hard the temptation bites. Below
   ~1.3 carbs are never worth taking and the decision evaporates; above ~1.8
   the climb stops being worth starting.
3. **Frenzy length (5 moves).** Too short and the payoff doesn't justify the
   climb; too long and the game is mostly frenzy.
4. **Frenzy landing (70).** Lands you at the bottom of the keto band, so the
   re-climb is 30 points. Drop it toward 55 if frenzies still chain too
   readily; that's the lever to reach for before touching drain again.
5. **Base points per tile (10, was 1).** Cosmetic to the math, decisive to
   the experience — at a base of 1 a 3-match read as "3" and the tiers were
   arithmetically real but invisible. Shipped at 10 alongside the tiers.
6. **Protein share of the icon set (2 of 5).** The hard constraint on how
   often a climb is even available. Changing this changes everything above.

## Simulation audit (2026-09-04)

A headless port of the shipped rules (`gdd/sim/keto-krush/`, plain Node, no
deps) verified move-for-move against the game's own script running in a
stubbed DOM: ~5,000 moves across five choosers, zero divergences. Ten bots,
2,000 runs each on identical seeds, plus a 10-knob sensitivity sweep. Raw
numbers in `FINDINGS.md`; charts in `report.html`. This section is the
interpretation.

### Balance

Pre-retune (v32) on the left of each cell, shipped v33 on the right.

| Bot | Median score | vs random | Median moves | Runs with a frenzy |
|---|---|---|---|---|
| Random | 2,824 → 3,486 | 1.0× | 25 → 32 | 10% → 16% |
| Casual (70% random / 30% best protein) | 3,245 → 4,062 | 1.15× → 1.17× | 27 → 34 | 13% → 22% |
| Greedy (biggest match, ignores meter) | 3,423 → 4,273 | 1.2× → 1.2× | 27 → 32 | 13% → 22% |
| Any protein | 4,123 → 5,390 | 1.5× → 1.55× | 33 → 39 | 23% → 38% |
| Biggest protein (the hint) | 4,533 → 6,136 | 1.6× → 1.76× | 31 → 40 | 25% → 40% |
| One-move lookahead (ceiling) | 6,238 → 8,805 | 2.2× → 2.5× | 31 → 42 | 28% → 43% |

v33 luck share is unchanged: random beats the hint-follower on 19% of boards
(was 20%), casual beats the ceiling on 13% (was 14%). Every bot still ends on
the budget 91–93% of the time and no bot's p90 exceeds 100 moves. Full v33
tables are in `FINDINGS.md` §7; the v32 raw results are kept in
`results-v32/`. The v32 analysis below is left as written, since it is what
motivated the retune.

- **Skill matters, modestly.** Reading the meter is worth about 1.6× over
  random, and perfect board-reading about 2.2×. Healthy for a family arcade,
  but the old "2.6× over always-carbs" claim was waiver-era.
- **Luck is a big share of the variance.** On the same board, random beats
  the hint-follower 20% of the time, and casual beats the ceiling bot 14% of
  the time. Greedy is only 1.2× random. Cascade luck sets most of the score.
- **Run length is set by the budget, not by skill.** Every bot ends on the
  budget 93–96% of the time and lasts 25–33 moves. Skilled play earns a
  median of 8 refunded moves; casual earns 2. The "climb → release → land →
  climb" loop practically never repeats: the best bot averages 0.5 frenzies
  per run.
- **The carb choice is a trap, not a dilemma.** At every tier, the best carb
  move out-pays the best protein move *right now* 46–60% of the time (the
  sugar rush and the 3-of-5 carb share both push this). But every "tempted"
  bot that takes carbs when they pay more scores worse than the one that never
  does, at every threshold up to 2×. The correct answer is always protein; the
  temptation is numerically real and strategically always wrong. That's a fine
  skill test, but it isn't the "agonizing near a tier boundary" the design
  called for.
- **The board forces carbs more the higher you climb.** Share of decision
  points with no protein move at all: 21% in normal, 31% in keto, 38% in deep.
  This, plus meter-negative cascades, is why holding a tier is hard.

### Dopamine

- **Reward rhythm is fine.** Median longest dry stretch is 5 moves for every
  bot, p90 is 8–10, and there are about 4 reward events per 10 moves. Nothing
  here needs fixing.
- **Casual players do reach ketosis.** 94% of casual runs see a tier-up, at a
  median of move 6. The old worry is answered.
- **The frenzy is the problem.** It is the game's designed payoff, and 87% of
  casual runs and 75% of skilled runs never see it. Inside a frenzy a move is
  worth 3.7× a normal one (563 vs 153 pts), so the payoff is real when it
  lands; it just rarely lands.
- **Successful climbs are cascade lotteries.** Measured only over climbs that
  reached 100, the trip from 70 to 100 takes a median of 3 moves, p90 6. The
  design's "~5 clean protein matches, 7–9 realistic" is not what happens:
  deliberate climbs mostly stall out, and the ones that succeed are rockets.
  Good for surprise (a variable-ratio reward), bad for "the stat you
  control decides your run."
- **Near misses are common and invisible.** 19–26% of skilled runs peak at
  90–99 and never frenzy, and 26% sit at 95–99 then fall back mid-run. Runs
  essentially never *end* at 95–99 (0.1%), so there is no "one more move"
  hook at the end; the near miss happens in the middle and nothing marks it.
- **A quarter to a third of runs end in carb crash.** Final-move state is
  crash for 24–31% of runs across *all* bots, including the protein ones, and
  76–95% of runs crash at some point. The crash tier is not a carb-only-player
  consequence; it is where a big carb cascade on the last few moves dumps
  anyone. Ending at 0.5× is the weakest possible last impression.

### Recommendations, and what shipped (v33)

Developer guidance for the retune: a little more teeth, so learners feel
their improvement, inside the measured skill/luck window; and keto often
enough that the game earns its name.

1. **Fix the stale numbers.** Shipped: this doc and the `MOVE_BUDGET` comment.
2. **Lower the top-two drain to 2/3.** Shipped. The one knob that raises the
   frenzy rate without touching run length; 1/3/5 was tuned against a
   waiver-era problem.
3. **Surface the near miss on the end card.** Shipped: the Fat-adapted
   highlight reads "N short" when the peak was 90–99 and no frenzy fired.
4. **Soften the crash ending.** Shipped as option (b): the v28 cascade floor
   now also covers a special detonating on the player's own match. Two
   candidates were simmed (`CANDIDATES.md`). The floor version lifted the
   skill spread from 1.40× to 1.51× with luck unchanged. The stronger version
   (detonated carbs cost nothing) hit 56% frenzy and a 569-move runaway for
   the ceiling bot, and was rejected.
5. **Move budget 25 → 30.** Shipped, on the developer's call for more room to
   build a climb. Casual rounds go from 27 to 34 moves.
6. **Ceremony.** Shipped: a tier-up label stamps over the board (big one with a
   screen flash for fat-adapted), the board wears a halo in the tier colour
   that pulses during a frenzy, and special tiles carry a breathing line
   showing which way they fire. Playtest note that drove it: "I hit
   fat-adapted and didn't even realise it, I was looking at the board."
7. **Not done: decide what the sugar rush is for.** It's a pure score knob for
   anyone who never takes carbs. Carbs are the only option 30–38% of the time
   in keto/deep already. Needs a `tempted` sweep across sugarRush values,
   which the sim supports but no pass has run.
8. **Leave the refund table alone.** Gentle now.

### Not yet trusted

- Frenzy occupancy is under-counted by about one move in six because the last
  frenzy move records as keto after the landing, same as the game's own arc.
- The lookahead bot's value function is a guess; it's a ceiling estimate, not
  a tight one.
- Move-level stats (choice reality, tempted cross-check) rest on 60 runs per
  bot, not the spec's 200, to keep results under 5 MB.

## Open questions

- **Should specials favor the chain?** A 4+ protein run makes the same
  special as a 4+ carb run. The sim shows specials are a main way carbs
  crash protein players, so protein-flavoured specials cut both ways.
- **Does a casual 27-move run feel complete, or abrupt?** About two minutes.
  The budget is the safe knob if it's a wall; refunds are gentle now too.
- **Should the budget be visible as a bar rather than a number?** Left as a
  number since the meter already owns the bar vocabulary.

### Resolved during build

- **Frenzy during a cascade** — the multiplier is re-read at each cascade
  step, so a frenzy triggered mid-cascade applies from the *next* step
  onward, and the triggering step pays at the tier that earned it. This falls
  out of the score-before-meter ordering rather than needing a special case.
