# Unkle Lijah's Jetpack — sim plan

The full build → test plan is in `gdd/unkle-lijahs-jetpack.md`. This folder
holds the headless side of it. Plain Node, zero dependencies.

## sim.js — the schedule
Lifts `makeSchedule()` out of `games/unkle-lijahs-jetpack/index.html`
between the `@schedule-begin` / `@schedule-end` markers and runs it 1,000
times. Exit code 1 if any band is missed. Bands (M0 acceptance):

| Statistic | Band |
| --- | --- |
| Items per run, Act I / II / III | 16–30 / 38–70 / 24–48 |
| Condiment share, Act I / II / III | 6–18% / 28–44% / 32–48% |
| Density ratio Act III : Act II (per second) | 1.6–2.6 ("roughly doubles") |
| Runs with a clean column | 5–15% |
| Act I same-lane spawns within 120ms | ≤ 0.5 per run |
| First run: condiments in Act I | 0 |
| First run: clean column before 15s | exactly 4 items |

## bot.js — later (M1)
Drives the game in Playwright with `?turbo` (8× speed, autopilot) across
seeded runs per part, and reads `window.__lijah.run.score` and `.spills`
at the end card. Bands in the GDD's M1 section. Not written yet: the
autopilot needs the pendulum tuned first or it measures the bot, not the
game.
