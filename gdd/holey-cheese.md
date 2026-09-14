# Holey Cheese

- **Slug:** `games/holey-cheese/`
- **Emoji:** 🧀
- **Status:** prototype, shipped to the beta list

## One-line pitch

Every wheel needs holes. Punch five. Keep the wheel whole.

## Rules

A 7×7 wheel of cheese, already dotted with holes. You punch five more. Each
punch can start a collapse, and the collapse can travel. When the fifth one
settles, your score is the number of cheese squares in the largest single
piece still joined together.

> **Any cheese cell orthogonally touching three or more holes becomes a hole.
> Apply repeatedly until nothing more changes.**

- Adjacency is orthogonal, for spreading and for connectivity alike. Edges are
  edges — a border cell is not touching anything outside the grid.
- Fully deterministic. Same board, same five taps, same result, for everyone.
- Nothing resists the rule. No cell types, no armour, no randomness.
- Taps are legal only on cheese, and all five are mandatory.
- Two-stage tap: first tap selects (and reveals nothing), second commits.
- No undo, no preview, no par, no timer, no second fail state.
- If a collapse leaves fewer cheese cells than taps remaining, the run ends
  and scores whatever survives.

## Controls / interaction

Single tap, twice, one thumb. Cells are 44.8px on a 375px phone and 40px on a
320px one — seven cells cannot be 44px wide at 320px, and the two-tap confirm
is what actually protects a mistap there. No hover, no drag, no swipe (so the
iOS back-swipe is left alone, per the house rule).

## Session shape

Turn-based, pausable, no timer. One daily wheel, one attempt, resumable
mid-run. Around 60–90 seconds. Practice wheels are unlimited and never scored.

## Scoring / persistence

`Arcade.save("save", …)` holds: today's result, best slab ever, a plain count
of days played, the in-progress daily and practice boards, and the sound
preference. Deliberately absent: streaks, history, replays, currency, unlocks.
A missed day costs nothing and is invisible.

The daily board comes from `Arcade.seededRandom("holey-cheese:" +
Arcade.dailySeed())`, so the whole family gets the same wheel.

## Accessibility notes

Cells carry `aria-label` row/column/state. The caption line is `aria-live`.
Under `prefers-reduced-motion` the collapse still resolves one generation at a
time — that stepping is information, not decoration — but at a flat, faster
beat with no transforms.

---

## What playtesting changed

The design document arrived locked at **two** or more holes, with 8–12
starting holes. Simulation before the first build said that does not work, and
the finding is strong enough to record.

**At threshold two, on a 7×7 board, the game is binary.** A front of holes is
self-sustaining: once a full row of holes exists, any single hole in the next
row drops that entire row, and it unzips to the edge of the board. Measured
over thousands of boards at 8–12 starting holes and five taps:

| | random play | novice play\* | one-ply greedy |
|---|---|---|---|
| median score | 0 | 0 | 36 |
| runs scoring zero | ~100% | ~99–100% | 2–5% (8 holes) → 88% (12 holes) |
| greedy's punches that triggered nothing | — | — | 4.8 of 5 |

\*novice = avoids squares visibly touching a hole, which is what a child does.

So: optimal play was "never trigger anything," the cascade — the centrepiece
of the feel spec — essentially never played for a good player, and anyone who
triggered once scored nothing at all. A six-year-old would have scored 0 every
day. Tuning could not fix it; the window between "every punch inert" and
"whole wheel gone" is empty at this board size. Hole geometry could not fix it
either: crack-shaped holes, one clean firebreak lane, and a 3×3 grid of lanes
were all measured, and all stayed binary.

**Changing one word fixes it.** At *three* or more, the collapse travels and
then stops. Same one sentence, same one verb, same one score, same
determinism, still no cell types. Stability at load is a looser constraint, so
the wheel can carry far more holes — which is also why it now looks like
swiss cheese. Settled at **20 starting holes (19–21), five taps**:

| | random | novice | one-ply greedy | beam search (width 12) |
|---|---|---|---|---|
| median score | 9 | 7 | 22 | 23 |
| p10–p90 | 5–15 | 3–13 | 16–24 | 16–24 |
| runs scoring zero | 0% | 0% | 0% | 0% |

- Skill is worth about **13 points** over careless play, and nobody ever
  scores nothing.
- **77% of runs contain a cascade 3+ generations deep**; 0% of runs are
  entirely inert. Generations per punch, under careless play: 34% inert, 32%
  one, 12% two, 8% three, and a tail out to twelve. The interval varies
  because the system varies, exactly as §8.1 asked — no tuning was applied to
  make it so.
- The engine was cross-checked against an independent reimplementation over
  20,000 taps: zero mismatches.

**The honest caveat:** one-ply greedy is within 0.2 points of a width-12 beam
search, so the ceiling is reachable without deep planning. Greedy simulates
every cascade on the board each turn, which no human does — the 13-point gap
over eyeball play is the one that matters — but this game will not reward
lookahead the way chess does. Worth watching over a week of real play.

## Open questions, answered

1. **Is five the right number of taps?** Yes, at the new threshold. Four
   narrows the skill gap to 9 points, six widens it to 12.6 but lengthens the
   run. Five is a good middle and keeps "punch five" in the title.
2. **Is 8–12 the right hole density?** No — that was right for threshold two.
   At three it is **19–21**. Below ~16 the board is too forgiving; above ~22
   scores compress toward the floor.
3. **Should an early-ended run read differently?** Moot. At these settings the
   board never runs out — measured 0 in 1,000 runs. The code handles it and
   labels it "The wheel ran out"; nobody will see it.
4. **Does wheel-intact % help or dilute?** It helps, and more than it would
   have. Starting hole count varies 19–21, so the raw slab count is not quite
   comparable across days; the percentage is. It stays small and secondary.
5. **Practice before or after the daily?** Both, weighted. A one-time link
   under the board offers a practice wheel to a player who has never played;
   it disappears afterwards. After the daily, practice is a quiet text link,
   not a button, so the run still ends on its peak.

## Deviations from the locked document, and why

- **The rule threshold is three, not two.** See above. It is a single named
  constant, `SPREAD`, at the top of `core.js`; set it to 2 to play the
  original.
- **20 starting holes, not 8–12.** Forced by the above.
- **No pinned restart for the daily.** The house rule wants a run that can go
  stale to have its own ↻ button, but §6 says the daily is one attempt and
  that is the point of the game. The pin offers a **practice** wheel instead
  and appears once a punch has been spent, lighting up when the current run is
  a lost cause. Today's wheel is preserved exactly where it was left.

## Still open

- Whether one-ply greedy being near-optimal flattens the game over a week.
- Whether the tier names ("Swiss enough", "Crumbly") are calibrated right —
  the thresholds were set from simulated distributions, not from watching
  anyone play.
- Whether 40px cells are genuinely fine on a 320px phone.
