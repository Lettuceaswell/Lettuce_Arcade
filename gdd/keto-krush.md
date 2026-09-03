# Keto Krush

- **Slug:** `games/keto-krush/`
- **Emoji:** 🍖
- **Status:** shipped (v22) — ketosis economy, the move budget, and the end
  card are built and tuned

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

## The end card (v22)

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

0. **Refund table (+2 / +2 / +5) and starting budget (25).** The knob that
   decides whether the game is bounded at all, and the most fragile one here.
   +3 on deep instead of +2 takes skilled play from a 134-move median to 676
   with a 5,001 max. Change one value by one and re-measure before believing
   it. Starting budget is the safe half of this pair: it moves the casual round
   length roughly 1:1 and barely touches the ceiling.
1. **Drain rates (1/3/5).** The dial that decides how much of a chain is
   upkeep versus progress, and the one that actually moved during tuning.
   Shipped at 1/2/3, which left a perfect-play bot in frenzy 33% of the time
   — the payoff had become the resting state. Raising the top two bands to
   3/5 taxes the top of the climb specifically, where the problem was, and
   dropped realistic play to 13% frenzy without weakening the incentive
   (keto/carb ratio only moved 2.2× → 2.6×).
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

## Open questions

- **Does the crash tier still earn its place?** Measured at 30% occupancy for
  carb-only play but 0% for anything else — so it's live content, but only
  for players ignoring the meter entirely. Worth watching whether anyone in
  the family actually lands there in real play.
- **Should specials favor the chain?** A 4+ protein run currently makes the
  same special as a 4+ carb run. Making protein specials meter-positive on
  detonation would deepen the climb, but risks over-rewarding a state that's
  already the strongest in the game.
- **Is a 29% frenzy share still too high for perfect play?** Realistic mixed
  play sits at 13%, which reads right, but the ceiling is high. The frenzy
  landing (knob 4) is the lever if it grates in practice.
- **Does a casual 31-move run feel complete, or abrupt?** It's about two
  minutes, and a player who never reaches ketosis earns only a couple of extra
  moves — so the refund mechanic barely reaches them. Watch whether the
  youngest players read "moves left" as pressure or as a wall. If it's a wall,
  raise the starting budget rather than the refunds; the budget is the safe
  knob and the refunds are the cliff.
- **Should the budget be visible as a bar rather than a number?** A number is
  precise and legible, but it doesn't convey "running out" at a glance the way
  the meter does. Left as a number for now since the meter already owns the
  bar vocabulary and two bars would compete.

### Resolved during build

- **Frenzy during a cascade** — the multiplier is re-read at each cascade
  step, so a frenzy triggered mid-cascade applies from the *next* step
  onward, and the triggering step pays at the tier that earned it. This falls
  out of the score-before-meter ordering rather than needing a special case.
