# FAT FINGER FIT
### Game Design Document — v2.1 · BUILD HANDOFF

Supersedes v1.0 and change-doc v1.1 entirely. This is the only document the builder needs.

**v2.1 (2026-09-04, first beta):** one slider on screen at a time; slider labels are emoji, not words; the LBS gauge is now **MASS**; a **New run** action lives in the shared menu behind a confirmation. Decisions 18–21 below.

**v2.2 (2026-09-04, polished beta):** a run in progress **is** saved and resumed (reversing the §15 deletion: a text arriving on day 6 shouldn't cost the run). Mute button per arcade convention. The MASS dial reads as a rim marker, not a centre needle, so the number stays clean. Decision 22.

**Title:** *Fat Finger Fit*. Lock it before the first family install — iOS snapshots the app name at Add-to-Home-Screen time and won't update it without a delete-and-re-add.
**Platform:** browser, phone-first, part of the family arcade. Plain HTML/CSS/vanilla JS. No build step, no framework, no server, no accounts.
**Run length:** 8 days, ~4 minutes.
**Audience:** family, mixed technical comfort, mixed devices.

---

## 1. One-line pitch

Eight days, four sliders a day, locked one at a time — and your thumb is never as accurate as you think it is.

---

## 2. The premise, stated once

Every other game in this genre lies to you about the world. This one lies to you about **your own hands.**

There is no hidden world noise, no random event, no dice. Every uncertain thing in this game comes from one source: the gap between where you meant to put the slider and what actually got delivered. You commit a value, the game delivers something near it, and it shows you the window it might land in. Four commitments a day, four windows, each one stacking onto the last.

That is the whole design. The title is the mechanic.

---

## 3. Locked decisions

Do not redesign these.

| # | Decision |
|---|---|
| 1 | The avatar is a **Blob**. Never a human body, never a silhouette. |
| 2 | Two **circular gauges**: **MASS** and **MUSCLE**. Both keep visible numbers and labels. |
| 3 | Starting weight is **50 lbs** — deliberately non-human, so the number can never be read as a body-shame reference. |
| 4 | MASS starts at **100%** and moves above and below. MUSCLE starts at **0%**. |
| 5 | **Win = both gauges at 100% at the end of day 8.** |
| 6 | The **Energy Bar** is always visible, does **not** move during a drag, has a **maintenance tick at dead centre**, is filled by eating and drained by training, and is the visual hero of the screen. |
| 7 | Four sliders, locked **one at a time, in fixed order**: Protein → Carbs → Fat → Training. |
| 8 | **Every lock has its own estimate window.** Uncertainty compounds across the four locks. |
| 9 | Bar segments are **colour-coded** per macro. |
| 10 | The gauges resolve **once per day**, after the fourth lock — not per lock. |
| 11 | **Every drag ends in a COMMIT button.** Nothing locks on release. There are no mis-drags and there is no undo. |
| 12 | Sliders stay **high-resolution and perfectly smooth**. No snapping, no detents, no haptics, no clicks. |
| 13 | **No daily mode.** Free play only. |
| 14 | **Score only. No failure state.** |
| 15 | Round starts at **0 pts**. A winning score is **1,000,000**. Format: `100`, `1.43K`, `956K`, `1M!` |
| 16 | The count-up is **rewarding and rapid-fire**. |
| 17 | A win is **possible but difficult**. Heavy balance of skill *and* variance. |
| 18 | **One slider on screen at a time.** Commit, and it's gone; the next one takes its place. A strip of the four emoji above it shows which lock you're on and which are done. |
| 19 | Sliders are labelled with **emoji only**: 🥩 protein, 🍞 carbs, 🧈 fat, 🏋️ training. The words appear once, in How to Play. |
| 20 | The weight gauge is called **MASS**, never LBS or weight. |
| 21 | **New run** is in the shared menu (☰), behind a confirmation. The End Card's RUN IT BACK stays instant. |
| 22 | **The run in progress is saved** after every lock and resumed on reopen. New run and the End Card clear it. Nothing else is persisted except the best score and the mute preference. |

---

## 4. The screen

One screen. No scrolling. No menus during a run.

```
┌──────────────────────────────┐
│   DAY 5 / 8         438.1K   │
├──────────────────────────────┤
│         ( B L O B )          │
│                              │
│    ╭────╮        ╭────╮      │
│    │ 97%│        │ 66%│      │
│    │MASS│        │MUSC│      │
│    ╰────╯        ╰────╯      │
├──────────────────────────────┤
│  ENERGY                      │
│  ▓▓▓▓▓▒▒▒▒▒▒▒│░░░▓▒▒▒        │   ← teal / amber / violet, then
│              ▲               │      the estimate window at the tip
├──────────────────────────────┤
│      🥩✓   🍞✓   🧈    🏋️      │   ← lock strip: done / LIVE / waiting
│                              │
│  🧈   ───────●──────────     │   ← the one live slider
│                              │
├──────────────────────────────┤
│        [  C O M M I T  ]     │
└──────────────────────────────┘
```

Vertical budget on 375×667: blob + gauges ~36%, energy bar ~16%, sliders ~36%, commit ~12%. The energy bar gets more contrast than anything except the blob. It is the thing being played.

**Slider states:** only the live slider is on screen. Locked sliders are gone — their position is retained for tomorrow but not shown. The lock strip above the slider carries the state instead: done (dim, ✓), live (bright, enlarged), waiting (dimmer). Exactly one slider is live at any moment. A locked slider shows no number; the player asked for a value and got another one, and printing either invites arithmetic.

---

## 5. Core loop

One run = **8 days**. One day = **four locks**.

Per lock:

1. The next slider becomes live and replaces the previous one on screen.
2. Player drags. **Nothing on the energy bar moves while the thumb is down.**
3. On thumb-release, the **estimate window** for that slider draws on the bar tip.
4. Player may re-drag and re-release as many times as they like. The window redraws each time.
5. Player hits **COMMIT**. The segment locks in, rendered as a colour band with its uncertainty still showing. Next slider goes live.

After the fourth commit, the **day resolves**: the bar snaps to its true position, the gauges tick, the blob updates, day points count up.

After day 8: the **End Card**.

**Sliders retain their positions across days.** The player is adjusting a standing plan, not re-entering one from zero.

---

## 6. The four sliders

All four are `0–100`, continuous float, no numeric readout, no snapping. Smooth as the platform allows.

| Order | Slider | Does |
|---|---|---|
| 1 | **PROTEIN** | Adds a little energy. Gates muscle gain. Protects muscle during a deficit. |
| 2 | **CARBS** | Adds a lot of energy, cheaply. |
| 3 | **FAT** | Adds a lot of energy, cheaply. |
| 4 | **TRAINING** | Spends energy. Is the entire muscle stimulus. Is the entire base of the score. |

Carbs and Fat are deliberately near-identical here. That's headroom, not laziness — if the game needs more depth later, splitting them is the cheapest place to find it and it changes no UI.

**A note on the fixed order, since it was a live question.** With a deterministic model, a fixed order would make locks 3 and 4 fake — fat becomes "whatever's left" and training becomes `(intake − 1500 − target) / 10`. Per-lock uncertainty is what closes that hole. By the fourth lock the player knows what they *asked for* but not what was *delivered*, so the arithmetic doesn't exist. **The fixed order is only safe because §7 exists. Do not remove one without revisiting the other.**

---

## 7. The estimate windows — the core mechanic

Each slider delivers a value near, but not equal to, what the player set.

```js
delivered = nominal * (1 + gaussian(0, 0.10))
```

Applied **independently to all four locks**, every day. This is the only stochastic element in the entire game.

**The displayed window is ±2σ of that lock's contribution** — roughly a 95% range, honestly drawn:

| Lock | Contribution | Window half-width | At slider = 100 |
|---|---|---|---|
| Protein | `6 × P` | `1.2 × P` | ±120 |
| Carbs | `12 × C` | `2.4 × C` | ±240 |
| Fat | `12 × F` | `2.4 × F` | ±240 |
| Training | `10 × T` | `2.0 × T` | ±200 |

Two consequences worth building around:

**Windows scale with the commitment.** A slider at 20 has a window one-fifth as wide as the same slider at 100. **Playing small is playing precise.** That is a real strategic lever the player will find on their own, it is emergent rather than designed, and it happens to be true of eating and training as well. Do not explain it.

**Uncertainty compounds.** The bar's cumulative window after `k` locks is the quadrature sum of the locks so far:

```js
cumulative = Math.sqrt( w1**2 + w2**2 + ... + wk**2 )
```

At full sliders that's ±412 by the fourth lock — about 14% of the bar. It is visibly wider at lock four than at lock one, which is exactly the tension curve: you commit, and knowing *less* is the cost of having decided *more*.

Use quadrature, not a plain sum. A plain sum would overstate the range and make the final resolution feel arbitrary rather than tense.

**Display rule:** the window renders as a soft translucent zone at the **tip** of the bar only — the moving frontier. Locked segments behind it render solid. There is never more than one window on screen.

---

## 8. The energy bar

**Range 0 → 3000. Maintenance tick at 1500, the exact geometric centre.** The tick sits in the middle because it *is* the midpoint of the scale, not as decoration.

```
bar = deliveredProtein + deliveredCarbs + deliveredFat − deliveredTraining
net = bar − 1500
```

- Bar **right of tick** → surplus → MASS rises.
- Bar **left of tick** → deficit → MASS falls.
- Bar **on the tick** → MASS holds, and muscle gain is nearly zero.

Read that last line carefully, because it is the whole game: **you cannot grow at maintenance.** Growth requires surplus, surplus costs MASS, and MASS has to come home to 100% by day 8. Every interesting decision falls out of that one constraint.

**Colour segments**, stacking left to right, then carved back:

| Segment | Colour | Renders as |
|---|---|---|
| PROTEIN | deep teal `#2E8B7A` | solid fill from 0 |
| CARBS | amber `#E0A030` | solid fill, stacked |
| FAT | violet `#8A6BC1` | solid fill, stacked |
| TRAINING | charcoal `#3A3F4B` | **carved back** from the right tip of the accumulated fill, hatched |

So the finished bar shows what you ate *and* what you burned as separate readable facts, and the right edge of what's left is your net. Nothing is colour-coded good or bad — three hues, no green, no red, no traffic light.

**Resolution animation:** on the fourth commit the window collapses and the bar snaps to truth with an overshoot-and-settle, ~350ms, ending in a physical thunk.

---

## 9. The gauges and the blob

Both circular. Number inside, label beneath. **They move once per day, after the fourth lock.** Four locks build the bar; one resolution moves the body. Locks are tension, resolution is release — never mix them.

**MASS** — starts at 100%. 100% = 50 lbs. Displayed as a percentage; the 50 lb figure appears exactly once, in How to Play, as a joke. Sweep 60%–140% with 100% at 12 o'clock, so deviation reads instantly as which side of vertical the needle is on. **Colour-neutral in both directions** — over is not bad, under is not good. Both are just not 100.

**MUSCLE** — 0–100%, sweeps clockwise from 6 o'clock. Fills, never inverts.

**There is no third gauge and no third number.** MASS minus MUSCLE is a residual the player can compute if they want to. The game never names it, never displays it, never draws it. This is a hard rule. The moment that quantity gets a label, this becomes a different and much worse game.

**The Blob** reads both gauges — scales with MASS, gains definition and posture with MUSCLE. Five drawn states, cross-faded. Not a rig. A blob at 130% MASS is *bigger*, and the game never comments on it.

---

## 10. The model

Sliders `P, C, F, T` ∈ [0,100]. State: `lbs` starts 100.0, `muscle` starts 0.0.

```js
// per-lock delivery — the only randomness in the game
cP = 6  * P * (1 + gaussian(0, 0.10));
cC = 12 * C * (1 + gaussian(0, 0.10));
cF = 12 * F * (1 + gaussian(0, 0.10));
cT = 10 * T * (1 + gaussian(0, 0.10));

net    = cP + cC + cF - cT - 1500;

p      = min(1, (cP / 6) / 55);          // protein adequacy, on DELIVERED protein
stim   = (cT / 10 / 100) ** 0.85;        // stimulus, on DELIVERED training
e      = clamp(0.10 + net / 750, 0, 1.7);
room   = max(0, 1 - muscle / 100);

gain   = 88.2 * stim * p * e * room**0.6;
loss   = 5.0 * max(0, -(net + 500) / 1500)
             * (1 - 0.5 * stim)
             * (1 - 0.6 * p);

muscle = clamp(muscle + gain - loss, 0, 100);
lbs    = lbs + net / 320;
```

Note that `p` and `stim` read **delivered** values, not nominal. A fat finger on protein can drop you under the threshold on a day you thought you'd cleared it. That is correct and intended.

Why each term is there, and why none of it is arbitrary:

- **`e` at net = 0 is 0.10.** Maintenance builds almost nothing. This is the engine of the game and it is also true.
- **`p` gates multiplicatively.** No protein means no gain regardless of training. Protein also costs energy, so loading it while cutting eats your deficit. Real tension, real mechanism.
- **`loss` only fires below net = −500,** is halved by training hard, and is 60% blunted by protein. That's exactly the real advice — in a deficit keep protein high and keep lifting — arrived at as a consequence of play rather than delivered as a lecture.
- **`room**0.6`** makes the last 15% of the muscle gauge brutal. Deliberate. That's where runs are won and lost.

---

## 11. Run length: 8 days

Simulated. Three-phase slider policies optimised by random restart plus hill climbing, evaluated across four tiers of player imprecision. Win = MASS within ±1.0 of 100 **and** MUSCLE ≥ 99.5. 3,000 runs per cell.

Finger-noise calibration at 8 days, with the gain rate re-solved at each σ so 100% muscle stays just barely reachable:

| σ | GAIN | MASS swing | Perfect | Good | Okay | Casual |
|---:|---:|---:|---:|---:|---:|---:|
| 0.04 | 85.2 | 5.1 | 78.5 | 41.1 | 19.5 | 7.5 |
| 0.06 | 71.3 | 8.8 | 79.0 | 46.1 | 22.0 | 10.6 |
| 0.08 | 72.4 | 7.1 | 66.3 | 52.7 | 30.8 | 13.7 |
| **0.10** | **88.2** | **9.8** | **51.3** | **39.9** | **23.8** | **11.4** |
| 0.13 | 71.8 | 6.6 | 24.0 | 18.9 | 12.2 | 4.5 |

**σ = 0.10, GAIN = 88.2.** Below 0.08 the game is too easy for anyone who understands it; at 0.13 perfect play wins a quarter of the time, which crosses from difficult into unfair. 0.10 gives perfect play a coin flip and casual play about one run in nine, with a 10-point MASS excursion so the gauge is genuinely used.

The optimal 8-day line, for the tuning harness — **do not surface this in-game**:

```
Days 1–2   cut hard        net ≈ −930    MASS 100 → 94
Days 3–4   surplus, build  net ≈ +430    MUSCLE 0 → 44
Days 5–8   surplus, train  net ≈ +250    MASS 94 → 100, MUSCLE 44 → 100
```

Cut first, then build into the room you made. Not the line most players will guess, findable in 10–15 runs, and not the only line that wins.

Do not ship day count as a setting. One length, one game.

---

## 12. Scoring

**Running total, visible during the run, starts at 0 on day 1.**

```js
dayPoints = 11.52 * cT * (1 + muscle/25) * (0.5 + 0.5*p);
```

Training is the base. Muscle is the multiplier, 1× → 5× across a run. Protein is a penalty band rather than a bonus — you're always leaking points until protein clears. Both `cT` and `p` are **delivered** values, so the fat finger costs you score as well as progress. A perfect run's running total lands near **200,000** by day 8.

**End Card cascade — multipliers reveal only here.**

```js
accuracy  = max(0, 1 - Math.abs(lbs - 100) / 12);

BUILD     = 1 + 1.5 * (muscle / 100);     // ×1.0 → ×2.5
PRECISION = 1 + 1.0 * accuracy**2;        // ×1.0 → ×2.0

FINAL     = running * BUILD * PRECISION;  // perfect run = 1,000,000
```

Verified: a perfect run lands on 1,000,000. Median near-perfect play lands ~900K. Runs **can** exceed 1M — a training-heavy line that nails both gauges pushes past — so **1M is the win line, not the ceiling.** Cross it and the number gets the `!`.

**Number formatting** — one shared function, used everywhere:

| Value | Renders |
|---|---|
| < 1,000 | `100` — integer, no separator |
| 1,000 – 999,999 | `1.43K`, `12.4K`, `956K` — 3 significant figures |
| ≥ 1,000,000 | `1.43M` |
| ≥ 1,000,000 on the End Card | `1M!` — `!` on any winning score |

**Count-up feel.** This is where the polish budget goes.

- Day points count up in **~400ms**, ease-out, ~28 discrete steps.
- One short tick per step, pitch rising across the count. Never more than 30 ticks or it turns to mush.
- Score element scales to 1.15× at the start of the count and settles back.
- End Card multipliers reveal **one at a time**, each with its own count-up and rising pitch: `running` → `× BUILD` → `× PRECISION` → `FINAL`. ~2.5 seconds total.
- If the score crosses 1,000,000 mid-cascade the count-up **does not stop or slow.** It blows through. Screen-wide flash on crossing.

---

## 13. What the game says, shows, and hides

The principle behind all of it:

> **Name the symptom. Never name the remedy.**

The player must be able to *see* something is wrong and have to work out *what*. State the goal plainly; withhold the coefficients. Rules leak — someone will have the formulas worked out by the third family group chat. State doesn't leak, because state is a function of what that player did on days 1 through 5 of this run.

**Shown, always, no text:**

| Condition | Display |
|---|---|
| Delivered protein under threshold | MUSCLE gauge **desaturates to grey** while it fills |
| Deep deficit (net < −500) | MUSCLE ring **flickers** on the day it ticks down |
| Surplus | Bar's overshoot past the tick renders in a **warmer fill**. Not red. Not a warning. |
| MASS ≠ 100 | Nothing. The gauge already says it. |

**Never shown, never said:**

- Any word for the MASS-minus-MUSCLE residual.
- Any number in real calories, grams, or pounds.
- Any coefficient — the 55 threshold, the 1500 maintenance, the gain rate, σ.
- The delivered-vs-nominal gap as a number. The player sees the window and the outcome, never the error.
- Any evaluative language about any slider position. No "too much," no "not enough," no "good job." **The score is the only judge, and the score never explains itself.**

**How to Play** — one screen, reachable from the title and pausable mid-run:

> Eight days. Four sliders a day: 🥩 protein, 🍞 carbs, 🧈 fat, 🏋️ training. You lock them one at a time, in that order, and you can't go back.
> Eating fills the bar. Training empties it.
> The tick in the middle is maintenance. Land right of it and you gain weight, left of it and you lose it.
> Muscle needs training, protein, and a surplus. All three.
> **Win:** end day 8 with both dials at 100%.
> Your blob starts at 50 lbs, which is not a realistic weight for anything, and that's fine.
> **Your thumb is not precise.** Every lock lands somewhere inside the window it shows you, not on the line. The more you've locked, the wider the window gets.

The last two lines are the ones that matter. They pre-authorise the imprecision so the first bad landing reads as the game rather than as a bug — and they say the windows *widen*, which is the single least-guessable thing about the design and the thing a 4-minute run will not teach on its own.

Everything else is discovered.

---

## 14. End Card

Free play. No daily seed, no streak, no calendar, no come-back-tomorrow.

One card at day 8, screenshot-shaped, portrait ~4:5:

```
┌────────────────────┐
│      ( BLOB )      │
│                    │
│  ╭────╮    ╭────╮  │
│  │100%│    │100%│  │
│  ╰────╯    ╰────╯  │
│                    │
│       1M!          │
│                    │
│   ▇▅▃▄▅▆▇█         │   8-day MASS sparkline
│                    │
│   [ RUN IT BACK ]  │
└────────────────────┘
```

- **The sparkline is the artifact.** Every run draws a different shape and the shape *is* the strategy — the deep-cut-then-build line looks nothing like a hover line. That's what gets screenshotted into the family thread.
- One button: **RUN IT BACK**. Instant restart, no confirm, no menu.
- Best score in `localStorage`, one small line under the score. That's the entire meta-game.
- No leaderboard in v1. Don't build one before you know anyone plays twice.

---

## 15. Deletion pass

| Deleted | Because |
|---|---|
| The four-at-once COMMIT | Replaced by four sequential locks |
| Randomised lock order | Rejected. Per-lock uncertainty solves the problem it was solving |
| Slider snapping / detents / haptics | Rejected. Fat Finger is in the name — the input stays smooth and the imprecision stays in the model |
| Undo | Deleted outright. Every drag ends in an explicit COMMIT, so a mis-drag can't happen |
| World noise on `net` | Deleted. Replaced by per-lock finger noise |
| Muscle resolution noise | Deleted. One noise source in the whole game |
| Third gauge / residual number | Naming that quantity is the one thing that turns this into a bad game |
| Daily mode / seeds | Free play. Removes a date library and a class of timezone bugs |
| Failure state | Every run finishes. Removes all run-ended UI |
| ~~Save / resume~~ | Restored in v2.2. A phone lock or a text mid-run was costing the run |
| Numeric slider readouts | Position only |
| Settings of any kind | One length, one game. Every setting is a design decision someone failed to make |
| Tutorial sequence | Replaced by one screen and one run |
| Leaderboard, accounts, analytics | You have their phone numbers |

**Add-backs (~10%):**

1. **The per-lock COMMIT button.** Levi's, and correct. Locking on thumb-release would make every slider a reflex test, which is a different and worse game — and it's the thing that let undo be deleted entirely. Cheapest add-back in the document.
2. **The cumulative window at the bar tip.** Four independent per-lock windows tell the player about four locks and nothing about the day. Without a running total window, the compounding in §7 is real in the model and invisible on screen.

Three noise sources became one. That's the deepest cut here and it's worth naming: every uncertain thing in this game now traces to the player's own hands, which makes it explicable in one sentence and tunable with one number.

---

## 16. Build order

Each step is playable. Don't proceed until the last one is fun or clearly diagnosable.

| Step | Build | Done when |
|---|---|---|
| 1 | Model + headless harness in Node, no UI | The optimal line in §11 reproduces the numbers in this doc |
| 2 | Four sliders, sequential lock, COMMIT button, console output | The lock rhythm has a shape with no feedback at all |
| 3 | Energy bar: colour segments, maintenance tick, resolution animation | The bar alone is satisfying to fill |
| 4 | **Estimate windows — per-lock and cumulative** | The widening from lock 1 to lock 4 is legible in a single run |
| 5 | Two circular gauges + numbers + labels, once-per-day tick | 8 days is readable at a glance |
| 6 | Score, count-up, number formatting | The count-up makes you want another day |
| 7 | Blob states | — |
| 8 | End Card, sparkline, localStorage best | Someone screenshots it unprompted |
| 9 | Balance pass against the harness | Casual win rate lands 8–14% |

**Step 4 is the highest-iteration step in the project and step 1 is what makes it survivable.** Build the harness first, keep it, and re-run every balance change through it before it ships. It's about 60 lines and it will save you ten playtests.

The knob at step 4 is σ, and σ alone. Window widths are derived from it (`±2σ × contribution`), so there is exactly one number to tune and the display stays honest automatically. Do not hand-tune window widths independently of σ — that's how the windows start lying, and the windows lying is the one thing this design can't survive.

---

## 17. Tuning constants

One object, top of file.

```js
const TUNE = {
  DAYS: 8,
  MAINT: 1500,       BAR_MAX: 3000,
  KCAL_P: 6,         KCAL_C: 12,      KCAL_F: 12,
  BURN: 10,          MASS_K: 320,
  PROT_THRESHOLD: 55,
  GAIN: 88.2,        LOSS: 5.0,
  E_BASE: 0.10,      E_SLOPE: 750,    E_CAP: 1.7,
  STIM_EXP: 0.85,    ROOM_EXP: 0.6,
  SIGMA: 0.10,       WINDOW_SIGMAS: 2,
  WIN_MASS_TOL: 1.0,  WIN_MUSCLE: 99.5,
  SCORE_K: 11.52,    BUILD_MAX: 1.5,  PRECISION_MAX: 1.0,
  COLORS: { P: '#2E8B7A', C: '#E0A030', F: '#8A6BC1', T: '#3A3F4B' },
};
```

---

## 18. Open

1. **Does the compounding read, in four minutes?** The windows widen from ±120 to ±412 across a day. That's obvious in a spreadsheet and may be invisible on a phone. If it doesn't land, the fix is presentation — a faint tick showing the previous lock's window width for comparison — not a bigger σ.
2. **Does "play small to play precise" get found, or does it get exploited?** It's the best emergent property in the design and it's also a potential degenerate strategy: tiny sliders every day, tiny windows, tiny variance. The sim says it loses because you can't reach 100% muscle that way. Verify against a real player before trusting that.
3. **Five blob states across a 60–140% MASS range.** May be too few to read. Check at step 7.
4. ~~Locked-slider display.~~ Resolved in v2.1: locked sliders leave the screen; the lock strip shows a checkmark and no number.
