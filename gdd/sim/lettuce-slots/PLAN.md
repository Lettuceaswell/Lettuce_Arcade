# Lettuce Slots — sim analysis plan

Purpose: find the engagement (dopamine) optimisation Run mode and Spin mode
leave on the table, by measuring the statistical mechanics the shipped code
actually implements. Source of truth: `games/lettuce-slots/index.html`.
Where the GDD and the code disagree, the code wins.

Everything lives in `gdd/sim/lettuce-slots/`. Nothing under `games/` changes
because of this folder. Plain Node, zero dependencies, seeded PRNG.

## 1. The mechanics, as shipped

| Thing | Value | Source |
| --- | --- | --- |
| Reels 1, 2 | uniform over 5 symbols | `SYMBOLS` |
| Reel 3 (Run) | uniform over 6: 5 symbols + 🐰 | `STRIP3_RUN` |
| Reel 3 (Spin) | uniform over 5 | `SYMBOLS` |
| Bust | r3 = 🐰, P = 1/6 | `classify` |
| Match | r1 = r2 = r3 ≠ 🥬, P = 4/150 | `classify` |
| Jackpot | 🥬🥬🥬, P = 1/150 | `classify` |
| Tension (r1 = r2) | P = 1/5; resolves match 1/6, bust 1/6, miss 4/6 | `spin()` |
| Leaf | streak += 1; bowl += streak (triangular: k(k+1)/2) | `resolve` |
| Match | leaf first, then bowl ×2 | `resolve` |
| Jackpot | leaf first, then bowl ×3 + 50 | `resolve` |
| Bust | bowl → 0, streak → 0 | `resolve` |
| SERVE | free, no spin cost, bowl → served, streak → 0 | `serve` |
| Run | 75 spins; last call auto-serves the bowl | `SPINS` |
| Ladder | 100 / 200 / 300 / 450 | `LADDER` |
| Reel 3 landing time | 1.8 s normal · ~3.1 s tension · ~3.9 s 🥬🥬 tension | tick schedules |
| Near-miss shown | half of tension misses land one slot past | `spin()` |
| Spin mode | +1 / +50 / +500 · match 1/25 · jackpot 1/125 | `resolveSpin` |
| "New run" begs | spin ≥ 15 and (nothing at all, or < 40% of best's pace) | `nudge` |

## 2. Hypotheses: where the dopamine levers are

Each is a claim about a statistic, so each is testable.

- **H1 — The serve decision is the game, and it is narrower than it looks.**
  Marginal EV of one more spin at streak k, bowl B is roughly
  (5/6)(k+1) + match/jackpot upside − B/6. On the pure triangular path that
  crosses zero near streak 10–11 (bowl ≈ 55–66). Prediction: an optimal
  policy is nearly a fixed streak threshold, the "right" moment sits
  *later* than most players will feel comfortable, and the EV curve is flat
  around the optimum (serving at 8 vs 11 costs little). Flatness is good for
  feel (no wrong answer) and bad for skill expression.
- **H2 — Loss pain is quadratic, loss frequency is flat.** A bust is 1/6
  every spin, but what it eats grows as k². The emotional arc of a streak is
  authored entirely by the triangular bowl. Prediction: the distribution of
  "bowl eaten" is heavy-tailed; a run's biggest loss is typically 30–60 and
  is the most memorable event in the run. The empty-bowl bunny ("found an
  empty bowl") is ~1 in 6 of spins right after a serve and is noise.
- **H3 — The ladder is mis-calibrated.** Garden (100) is nearly automatic
  for anyone who serves, Feast (300) is rare for anyone, Legendary (450) is
  a p99 event. Goal-gradient works when the next rung is reachable in *this*
  run; prediction: for a median player the second half of the run has no
  reachable rung, so "62 to go" goes dark exactly when it matters.
- **H4 — The record chase decays fast.** With a fixed policy, "new best" is
  a record-breaking process: P(new best on run n) ≈ 1/n. Predicted: ~3 new
  bests in the first 10 runs, then one every ~10–20 runs. The best line on
  the start card becomes discouraging, not motivating, by run ~15.
- **H5 — Tension spins are frequent but rarely staked.** 20% of spins are
  tension, but a tension spin only *matters* when the bowl is big. Predict
  most tension spins happen at bowl < 20 (just after a serve or a bust),
  where "bowl 6 on the line…" is not a sentence anyone sweats. The best
  moment in the game (big bowl + crawling reel) may happen ~1–2 times per run.
- **H6 — Matches are a bigger lever than jackpots.** Match is 4× as common
  and doubles the bowl; a match at streak 10 is +55, a jackpot at streak 1
  is +53. Prediction: matches drive most of the variance in served, and
  "serve after a win" is the single most valuable heuristic a player can
  learn. Whether the game *teaches* it is a separate question (it doesn't).
- **H7 — Last call is under-exploited.** With n spins left, the DP will
  hold longer than a streak rule would because the last spin auto-serves
  and a bowl eaten on spin 74 could have been served on 73. Prediction:
  optimal play serves *earlier* in the last ~5 spins than mid-run, not
  later; the GDD's "free all-in for the last 6" is probably backwards.
- **H8 — Spin mode's dry counter is a drought machine.** Jackpot 1/125:
  the median drought is 86 spins (~3 minutes), p90 ≈ 290 spins (~9 min).
  The counter mostly shows a large number that grows. The only reward
  cadence a toddler gets is the 1-in-25 match.
- **H9 — Time-on-decision is tiny.** A run is ~3.5 minutes and the serve
  decision is available in the ~0.5 s between reel 3 landing and the next
  tap. Nothing in the loop invites a pause when the pause is worth the most
  (big bowl, few spins left).

## 3. Sims

All in `sim.js` (engine + policies + experiments) and `dp.js` (exact
optimal stopping). Output to `results/*.json`, summarised in `FINDINGS.md`.

| # | Sim | Answers |
| --- | --- | --- |
| S1 | **Exact DP** over (spins used, streak, bowl ≤ 4000): value of the run under optimal serving, the optimal serve threshold by streak and by spins-left, and the EV cost of every simpler rule. | H1, H7, skill ceiling |
| S2 | **Policy Monte Carlo**, 20k runs × ~15 policies (timid, streak-N, bowl-X, win-serve, gambler, reckless, GDD sharp, DP-optimal, noisy-human variants): served distribution, tier hit rates, bowls eaten, biggest bowl, serves, tension-at-stake counts, run duration in seconds. | H1–H3, H5, H6 |
| S3 | **Record chase**: 2k simulated players × 40 runs each, per policy: P(new best on run n), expected bests per 10 runs, gap between typical run and best. | H4 |
| S4 | **Event cadence**: per-run counts and inter-arrival of staked tensions (bowl ≥ 20/40), matches, jackpots, big busts; seconds between "moments". | H5, H9 |
| S5 | **Parameter sweeps**, re-running S1+S2 under: bunny 1/6 vs 1/7 vs 1/8; 50/75/100 spins; match ×2/×2.5/×3; jackpot ×3+50 vs ×4+50; ladder rungs at data-driven percentiles; a "bunny can't eat under bowl 3" grace rule; a "bunny sleeps for 3 spins after a serve" rule. Metric: spread between policies (skill), tier reachability, tail control (p99/median), pain distribution. | which change buys what |
| S6 | **Spin mode droughts**: analytic + MC drought distribution for jackpot and match; points per minute. | H8 |

Verification: the DP policy is replayed through the Monte Carlo engine and
its mean must match the DP value to within MC error; the timid / streak-5 /
reckless rows must reproduce the GDD's 2024 table within noise.

## 4. Agents and models

The whole battery runs in seconds in one Node process, so nothing here
justifies fanning out to LLM agents to *run* sims. Where agent work earns
its keep is authoring, adversarial checking, and the write-up. Recommended
split, cheapest model that is trustworthy for each job:

| Job | Model | Why |
| --- | --- | --- |
| Port engine + policies, write sweep runners | Sonnet 5 | Mechanical, well-specified port of ~100 lines of game logic; Sonnet is reliable on this and a fraction of Opus cost. |
| Exact DP design and cap/edge-case reasoning | Opus 5 (or Fable 5.1) | Off-by-one in the horizon or the serve-before-spin ordering silently corrupts every conclusion; worth the stronger model once. |
| Adversarial verification (DP vs MC, GDD table reproduction, near-miss reindex can't change outcome) | Sonnet 5, fresh context | Independent re-derivation catches the author's blind spots; cheap. |
| Reading results and proposing changes | Opus 5 / Fable 5.1 | Judgement about feel and family play, not throughput. |
| Modelling human players | none (parametric policies) | An LLM playing 20k runs is slow, expensive, and no more human than a noisy threshold with a "one more spin" bias. Humans are modelled as: threshold + Gaussian noise + p(spin anyway). |
| Haiku 4.5 | not used | Nothing here is a bulk classification task. |

This pass was executed in-process (one author, one verifier check) because
the compute is trivial; the split above is for re-running the battery after
a rules change.

## 5. Deliverables

- `PLAN.md` (this), `sim.js`, `dp.js`, `results/`, `FINDINGS.md`.
- `FINDINGS.md` is the write-up: what the levers actually are, what's
  being left on the table, ranked suggested changes with the sim numbers
  that justify each.
