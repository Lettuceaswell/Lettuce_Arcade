# Lettuce Slots — what the sims say we're leaving on the table

Companion to `PLAN.md` (hypotheses and method). Rules simulated are the ones
in `games/lettuce-slots/index.html` as of v42. Numbers below are from
`results/*.json`; regenerate with `node sim.js && node extra.js` (~30 s).

Verification: the exact optimal-stopping DP values a run at **192.0**; the
DP policy replayed through the Monte Carlo engine scores 192.9 over 20k
runs (inside noise). Timid / streak-5 / never-serve reproduce the GDD's
table (91 / 158 / 44 vs 91 / 157 / 45).

## TL;DR

The core loop is sound and the GDD's big claims hold: the triangular bowl
is the whole game (flat growth collapses skill spread to 1.0×), nerve beats
timidity ~2×, and the tail is on a leash. What's being left on the table is
almost all **around** the loop, not in it:

1. **The "New run" button begs during ordinary runs.** Once a player has a
   best of ~290 (typical after 10 runs), the nudge fires in 66% of runs and
   in 47% of runs after spin 40, on runs that finish around 135 — a normal
   score. It's calibrated against a best that is by construction a p95+
   outlier. This is the single clearest bug-shaped finding.
2. **The ladder's top two rungs are dead and the bottom one is free.**
   Human-ish play: Garden 84%, Chef's 30%, Feast 6%, Legendary 0.6%. Even
   optimal play hits Legendary 1.1% of the time. Half of every run is spent
   with no reachable rung.
3. **The record chase goes cold by run 10.** ~2.9 new bests in the first 10
   runs, then ~1.3 across the next 30. By run 20 a run has a 5% chance of
   being a best, and the end card's typical message is "189 short of your
   best". There is no shorter-horizon goal to replace it.
4. **The designed peak (big bowl + crawling reel) is rare.** A tension spin
   with ≥40 in the bowl happens 0.35 times per run; 75% of runs never see
   one. With ≥20 in the bowl: 1.7 per run, 19% of runs see none.
5. **The serve decision is real but nearly invisible and nearly flat.**
   Serving anywhere from streak 6 to 11 lands within 5% of each other.
   Optimal play is a one-line rule — *serve when the bowl is about six
   times the streak* — worth 191 of the 192 ceiling, and the only thing
   that separates a 171 player from a 192 player is "serve after a match".
   Nothing in the game teaches either.
6. **Matches, not jackpots, are the engine.** Removing all multipliers
   drops optimal EV from 192 to 135 and halves the standard deviation.
   A match is 4× more common than a jackpot and, after streak 4, is a
   cash-out signal (the DP serves after any match at streak ≥ 4).

## The levers, measured

### H1 — the serve decision (confirmed, with a twist)

| Fixed rule | EV | | Rule | EV |
| --- | --- | --- | --- | --- |
| serve every spin | 90 | | bowl ≥ 40 or after win (GDD "sharp") | 186 |
| streak 3 | 133 | | bowl ≥ 66 | 189 |
| streak 5 | 158 | | **bowl ≥ 6 × streak** | **191** |
| streak 7 | 171 | | bowl ≥ 6×streak, or win at streak ≥ 4 | 192 |
| streak 9 (best fixed streak) | 173 | | **exact DP** | **192** |
| streak 11 | 168 | | human: streak 7 ± 2, 25% "one more" | 171 |

- The DP's threshold on the plain path is streak 11 (bowl 66), flat across
  the run; it rises to 12–13 only in the last three spins (with one spin
  left it's right to hold a bowl of 78 and let last call serve it).
- The DP's bowl threshold at streak k is ≈ 4 + 5.9k: **serve when the bowl
  is six times the streak**. That is a rule a nine-year-old could hold, and
  both numbers are already on the readout row.
- The plateau is wide: streak 7–10 rules are all 171–173. Good for feel (no
  wrong answer), bad for skill expression — most of the 21-point gap from
  "human 7" to optimal is *post-match* serving, not the base threshold.
- The GDD "sharp" strategy's "all-in for the last 6" clause is a no-op:
  187.6 with it, 187.6 without. You can't reach bowl 40 in six spins without
  a match, and after a match the same rule serves anyway.

### H2 — loss pain is quadratic, loss frequency flat (confirmed)

- 12.5 bunnies per run regardless of play. For a human-7 player 2.9 of
  those find an empty bowl and 9.6 eat something.
- Median eaten bowl is 6, but the run's biggest bite is median 22, p90 72.
  That single bite is the run's most memorable event, and the game gives it
  one status line and a `−45` pop; the end card doesn't mention it at all
  ("biggest bowl" is the *held* max, which may have been served or eaten).

### H3 — the ladder (confirmed)

Tier hit rates on the shipped rungs 100 / 200 / 300 / 450:

| Player | Garden | Chef's | Feast | Legendary |
| --- | --- | --- | --- | --- |
| streak 5 | 91% | 19% | 2% | 0.1% |
| human 7 | 84% | 30% | 6% | 0.6% |
| optimal | 83% | 44% | 14% | 1.1% |

Median served by spin 40 is ~74 for every player: at the halfway mark the
footer reads "Garden at 100 · 26 to go" and Chef's is 126 away. Once
Garden is stamped, the next rung is out of reach for 70% of players and
the goal-gradient line goes dark for the back half of the run.

Distribution of served (human 7): p10 87 · p25 120 · **median 160** ·
p75 211 · p90 268 · p95 310 · p99 413.

### H4 — the record chase (confirmed, worse than predicted)

2,000 simulated players × 40 runs, human-7 play:

| | runs 1–10 | runs 11–40 |
| --- | --- | --- |
| expected new bests | 2.9 | 1.3 |
| P(new best) on run 5 / 10 / 20 / 40 | 20% / 10% / 5% / 3% | |
| median best after 10 runs / 40 runs | 291 / 376 | |
| typical run (median) | 160 | |
| median "short of your best" on the end card | 189 | |

Every policy shows the same curve (it's the record-value process, ~1/n).
The best is an unrepeatable outlier by design (p99/median = 2.5), so
comparing every run against it is comparing every run against luck.

### H5 — staked tension is rare (confirmed)

Per run, human-7 play: 15 tension spins, 10 of them near-misses; **1.7
with ≥20 in the bowl, 0.35 with ≥40**. "Moments" (staked tensions +
matches + jackpots + busts eating ≥20) run ~5.7 per 3.5-minute run, one
every ~36 s — but 26% of them are the bunny.

### H6 — matches are the engine (confirmed)

| | optimal EV | human-7 EV | human-7 sd |
| --- | --- | --- | --- |
| shipped (match ×2, jackpot ×3+50) | 192 | 171 | 78 |
| no multipliers at all | 135 | 134 | 44 |

Matches happen 2.0× per run, jackpots 0.5×. Half of all runs have no
jackpot; the jackpot ceremony (breathing reels, longer crawl) fires on the
rarer, smaller lever.

### H7 — last call (refuted, GDD was right)

The DP holds *longer* at the end, not shorter: with ≤3 spins left the serve
threshold rises to streak 12–13. Serving late costs the compounding you
could have kept; last call serves it anyway. Nothing to fix here.

### H8 — Spin mode droughts (confirmed)

At ~2.8 s per spin: a jackpot every 87 spins at the median (**4 minutes**),
p90 287 spins (13 minutes); 45% chance of no jackpot in a 100-spin sitting.
Matches land every 22 spins at the median (~1 min). 143 points/minute. The
"since last 🥬" counter's steady state is a large number going up.

### H9 — time on decision

Not simulable, but the S1 result sharpens it: the decision that matters
most (serve or spin at bowl ≥ 60, or right after a match) occurs ~3–4
times a run and gets the same 0.7 s as every other spin.

### Sweeps (what each knob buys)

| Variant | optimal EV | human-7 | timid | skill spread (opt/timid) | tail (p99/median) |
| --- | --- | --- | --- | --- | --- |
| shipped | 192 | 171 | 91 | 2.1 | 2.5 |
| bunny 1/7 | 229 | 196 | 93 | 2.5 | 2.9 |
| bunny 1/8 | 269 | 219 | 95 | 2.9 | 3.2 |
| bunny 1/5 | 156 | 139 | 87 | 1.8 | 2.4 |
| 50 spins | 127 | 114 | 60 | 2.1 | 3.0 |
| 100 spins | 257 | 228 | 121 | 2.1 | 2.3 |
| match ×3 | 222 | 189 | 92 | 2.4 | 3.3 |
| match ×2.5 | 206 | 178 | 91 | 2.3 | 2.8 |
| jackpot ×4+50 | 199 | 177 | 91 | 2.2 | 3.0 |
| jackpot ×3+100 | 217 | 186 | 116 | 1.9 | 2.9 |
| bunny sleeps 2 spins after a serve | 211 | 178 | 108 | 1.8 | 2.5 |
| bowl ≤ 3 can't be eaten | 208 | 189 | 91 | 2.3 | 2.4 |
| growth +2k | 359 | 329 | 155 | 2.3 | 2.4 |
| growth flat +1 | 91 | 56 | 91 | **1.0** | 3.3 |

Reading: the bunny odds are the one economy knob that moves skill spread
without inflating the tail much; "bunny sleeps after serve" and a bigger
flat jackpot bonus both *reduce* spread by paying the timid player. Spin
count is a pure scale. Flat growth proves the triangular bowl is the game.

## Suggested changes, ranked by value per line of code

1. **Recalibrate the "New run" beg.** Compare against the *median* of the
   player's recent runs (or a fixed par ≈ 150 for the first runs), not
   40% of the best's pace, and require `served + bowl === 0` past spin 25
   as the other trigger. Target: fires in <10% of runs, never on a run that
   would finish ≥100. Today it fires in 66–79% of runs for anyone with a
   real best. *One function, `nudge`.*

2. **Replace "N short of your best" with a repeatable target.** Options,
   any of which the sim supports: (a) "beat your last run" (50% hit rate
   by definition), (b) "best today" / "best this week" (a fresh record
   process each day: ~2 new bests per 5-run session forever), (c) a par
   line — "par 160" — with the end card saying "+34 over par". Keep the
   all-time best on the start card; take it off the end card's headline.

3. **Move the ladder to the score distribution.** Rungs at roughly p25 /
   p60 / p90 / p99 of human-7 play: **60 · 120 · 200 · 300 · 420**
   (hit rates 96 / 75 / 30 / 6 / 0.9%). Or, if five is too many, 80 · 160 ·
   240 · 330 (92 / 50 / 16 / 3.5%). Either way Chef's-equivalent becomes
   the median run's live target for the whole back half, and the top rung
   stays a story. Ladder names are free to keep; only `LADDER[].at` changes.

4. **Teach "serve after a match".** It's worth ~10% of EV, it's the
   difference between a decent player and a sharp one, and the game already
   stops on a match with the bowl glowing. Cheapest form: after a match at
   streak ≥ 4 the SERVE button pulses once (same `beat` animation). Stronger
   form: the status line reads "MATCH — bowl doubled to 90 · serve?". This
   is presentation only; odds untouched.

5. **Put the six-times rule within reach, without stating it.** The readout
   already shows `🥗 66 · streak 11 · +12 next`. A subtle cue when
   `bowl ≥ 6 × streak` (the bowl glyph stops hopping and starts wobbling,
   say) lets attentive players *discover* the rule while leaving the choice
   theirs. Measured cost of ignoring it: 171 → 191. Decide first whether
   collapsing the decision is wanted; the plateau is wide enough that a hint
   won't make everyone play identically.

6. **Make the biggest bite part of the story.** Track `run.biggestEaten`
   and put "🐰 biggest bite 45" on the end card and in the share line next
   to "biggest bowl". It's the run's most-felt number (median 22, p90 72)
   and today it evaporates after one status line.

7. **Consider bunny 1/7 for Run only.** +20% EV across the board, skill
   spread 2.1 → 2.5, tail 2.5 → 2.9, one more empty slot on reel 3 (a blank
   🟩 leaf or a second lettuce). It makes streaks of 8–10 feel earned
   rather than lucky (survival to 10: 16% → 21%). Costs: ladder re-tune
   (item 3 already does this), existing bests inflate by ~20%. Not urgent;
   items 1–4 are worth more and touch no odds.

8. **Spin mode: shorten the jackpot's shadow.** With a 4-minute median
   drought the "since last 🥬" counter mostly reads 100+. Options: make the
   counter count *matches* ("12 since last match", median 22 spins, ~1 min),
   or show both. Purely a display change; the v1 economy stays verbatim.

## Leave alone

- **Triangular growth, flat bunny odds, free serve.** Every alternative
  measured is worse for the decision. Flat growth kills skill entirely.
- **The last-call rule.** Optimal play already exploits it correctly and
  players who "go all in at the end" are doing the right thing.
- **Jackpot ×3 +50.** ×4 barely moves EV and lengthens the tail; +100 pays
  timid play. The leash is doing its job.
- **"Bunny sleeps after a serve" / small-bowl grace.** Both reward the
  serve-every-spin player and narrow the skill spread. The empty-bowl bunny
  is ~3 per run and already costs nothing.

## Files

- `PLAN.md` — hypotheses, sim design, agent/model split for re-runs.
- `dp.js` — exact optimal-stopping solver, parameterised rules.
- `sim.js` — engine, policies, S1–S6; writes `results/`.
- `extra.js` — S7: nudge false positives, ladder candidates, last-6 test,
  multiplier share, one-line heuristics.
- `results/` — raw JSON, all regenerable.
