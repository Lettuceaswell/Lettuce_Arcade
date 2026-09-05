# Unkle Lijah's Jetpack

- **Slug:** `games/unkle-lijahs-jetpack/`
- **Emoji:** 🍔
- **Status:** prototype — playable first cut, listed behind the index's
  "Betas" button (`"beta": true` in `games.json`). Flat vector art drawn in
  code; no image or audio assets yet.

## One-line pitch
Fly under the falling food, catch it in order, don't touch the sauce.

Unkle Lijah wears a jetpack. Burger parts fall from the sky. He catches them
on his head, in order, and banks completed plain cheeseburgers before the
lunch rush ends. He is a ragdoll. You do not control him. You control his
jetpack, and he hangs beneath it.

---

## Constraints applied (what changed from the original draft)

The original GDD is preserved in spirit below. These are the places the house
rules in `CLAUDE.md` bent it, so nobody re-litigates them by accident.

| Original | Shipped as | Why |
| --- | --- | --- |
| Loadout screen: two side-by-side panels | Two stacked panels: Lijah on top, the pack below | Portrait-first. Side by side on a 390px phone makes both halves unreadable. |
| Cosmetics "unlimited" | A short catalogue of pack paints, exhaust colours, and hats, all drawn in code | No assets, under 500KB per game. The catalogue can grow; each entry is a colour or a dozen lines of canvas. |
| "Burbers" | Burgers | Typo. |
| Thrust pad is the bottom third, edge to edge | Bottom third, inset 24px from both side edges, plus `Arcade.trapBack()` | A thumb dragging from the left edge is iOS's back gesture. Same rule as Keto Krush. |
| Physics engine implied | Two-node Verlet pendulum plus a chain for the stack, written in ~60 lines | No dependencies. A proper rigid-body engine is more than the design needs. |
| Open call A (catch at head or stack-top) | Stack-top, behind one constant (`CATCH_AT_STACK_TOP`) | Recommended in the draft. Flip the constant to feel the other. |
| Open call B (buzzer banks an incomplete stack) | Yes: a free top bun drops if the stack is legal | "End on a peak." The scramble variant is one constant away (`BUZZER_FREE_BUN`). |
| Open call C (re-catch spilled layers) | Off | Try late, cut fast. Not in the first cut. |
| Every game marks a stale run `pinned: true` | Not pinned | A run is 90 seconds and cannot go stale. The menu's "New run" stays in the menu. |
| Daily "once per day" | Once per day, enforced locally, result card replaces the START button until tomorrow | Same as Daily Letters. There is no server; the honour system is the platform. |
| Sound | None yet | Tones via `Arcade.audioCtx` come in M4 (see plan). Everything else must work silent first. |

---

## Rules

Four ingredients fall: **bottom bun, patty, cheese, top bun**. They must be
caught in that order onto the top of Lijah's stack. Anything out of turn
bounces off, no penalty. The top bun banks the stack: one **Burger** per
cheese layer. After a cheese, the player may skip the top bun and keep
catching **patty → cheese** pairs; a 3-layer stack banks 3 Burgers. The stack
is physical, wobbles, and gets harder to keep upright and harder to keep out
of the sauce the taller it is.

Four **condiments** spill the stack on contact. A spill scatters the layers,
Lijah flails for half a second, play continues. No lives, no game over.

| Condiment | Behaviour | What it taxes |
| --- | --- | --- |
| **Ketchup** | Fast, straight down | Camping under a spawn point |
| **Mustard** | Slow, drifting side to side | Lazy lateral movement |
| **Pickle** | Bounces off the side walls | Treating the walls as safe |
| **Onion ring** | Falls slowly, then homes gently for about a second | Tunnel vision on the ingredient |

Each has a distinct silhouette and motion signature, not just a colour.

### The run
**Ninety seconds. Three acts. Same shape every time.**

- **Act I — Open (0–30s):** sparse, mostly ingredients, few condiments.
- **Act II — Lunch (30–75s):** condiments enter properly, density climbs,
  spawn timing varies between lulls and clusters.
- **Act III — Dinner Rush (75–90s):** a bell; density roughly doubles.
- **The Buzzer:** at zero, time slows for two seconds. If Lijah holds a legal
  stack a free top bun drops and banks it. The last beat is a score going up.

Spawn timing is uneven on purpose. Rarely, the schedule produces a **clean
column**: bun, patty, cheese, top bun in a tight vertical line, catchable in
one hover. The first-ever run has no condiments in Act I and one clean column
in the first fifteen seconds. No tutorial.

### Modes
- **Daily:** same schedule for everyone (`Arcade.dailySeed()` seeds it),
  stock jetpack, once per day. Score is Burgers, a whole number.
- **Free Play:** your equipped loadout, a fresh random seed, unlimited.
- Burgers from both modes count toward unlocks.

### Upgrades
Three functional parts, one equipped at a time, each a trade. None removes
the pendulum.

| Part | Gives | Costs |
| --- | --- | --- |
| **Wide Brim** | Larger catch surface | Higher pivot, more wobble |
| **Stabilizer Fins** | Stack settles faster, swings less | Less thrust |
| **Afterburner** | Much stronger thrust | Much wilder swing |

Cosmetics: pack paint, exhaust colour, hats. No mechanical effect. Priced in
Burgers. This is where content goes.

### Loadout screen
Lijah at full size on top, idling, still a ragdoll (drag him and he flops).
The pack below as an object where parts and paint are chosen. The pile of
banked Burgers grows in the corner and should get faintly ridiculous over
weeks.

## Controls / interaction
One input. The bottom third of the screen is a thrust pad. Touch down
anywhere on it; your offset from the touchdown point is the thrust vector
(direction and strength, capped). Slide to steer, lift to fall. Dead zone at
the centre. A stick-and-ball drawn under the thumb is feedback, not a control.

Keyboard for desktop testing: arrows or WASD apply a fixed thrust vector.

One thumb, no precision required, no second button. Sloppiness is the
aesthetic: the ragdoll turns it into comedy.

## Session shape
Continuous, twitch, 90 seconds fixed. A deliberate exception to the
turn-based default alongside Tap Race and Zorro Runner. Every player finishes
on the rush and the buzzer bank; nobody's session tapers out.

## Scoring / persistence
All via `Arcade.save`/`Arcade.load`, namespaced to the game.

| Key | What |
| --- | --- |
| `burgers` | Lifetime Burgers banked, the only currency |
| `bestDaily`, `bestFree` | Best single-run scores per mode |
| `daily:<YYYY-MM-DD>` | Today's Daily result, blocks a replay |
| `equipped` | `"stock"`, `"brim"`, `"fins"`, or `"burner"` |
| `owned` | Array of purchased part and cosmetic ids |
| `paint`, `exhaust`, `hat` | Equipped cosmetic ids |
| `runs`, `spills` | Lifetime tallies for the stats sheet |
| `firstRun` | Cleared after the first run; gates the no-condiment Act I |

`Arcade.brag` carries "Best Daily N 🍔". `Arcade.stats` lists the table above.

## Accessibility notes
- The thrust pad is 30 percent of the screen; there is no tap target smaller
  than 44px anywhere.
- Condiments differ by shape and motion, not only colour.
- `prefers-reduced-motion`: no screen shake on spill, slow-mo at the buzzer
  becomes a plain pause.
- Nothing depends on hearing; sound is layered on later.

## What this game deliberately does not have
Guns. Lives or death by condiment. Direct positional control of Lijah. An
endless difficulty ramp. Ingredients beyond the four. A large upgrade tree.
Listed so they don't creep back in.

## Open questions
- **A.** Stack-top catch (shipped) vs head catch. Feel both in M2.
- **B.** Buzzer free bun (shipped) vs legal-top-only scramble. Decide after M3 playtests.
- **C.** Re-catching spilled layers. Try in M5, cut fast.
- Wobble tuning: how many layers before an unmodified stack is untenable? Target: a 3-layer stack is holdable by a careful player, 4 is heroic.
- Does the Onion Ring's homing read as "chasing" or as "unfair"? One second of gentle homing is the starting point.

---

## Build → test plan

Each milestone ships behind the Betas button and has acceptance tests that
run without a human, plus one feel check that needs a thumb. Headless tests
live in `gdd/sim/unkle-lijahs-jetpack/` and read the schedule generator
straight out of `index.html`, so the sim can never drift from the game.

Test hooks built into the game, all URL params, all no-ops in normal play:
- `?speed=N` runs the clock N× faster (physics substeps scale with it).
- `?bot` engages an autopilot that thrusts toward the next legal ingredient
  and away from the nearest condiment. Dumb on purpose. If the bot can't
  bank a burger, a human can't either.
- `?seed=xyz` forces the schedule seed in Free Play.
- `?turbo` = `?speed=8&bot`, for CI-style checks.

### M0 — Skeleton (this commit)
Folder, GDD, `games.json` entry, sim harness, and a playable first cut:
pendulum, thrust pad, four ingredients in order, four condiments, spills,
three acts, buzzer, Daily and Free Play, three trade parts, a few cosmetics,
stacked loadout screen, saves.

Accept:
- [x] Page weight under 100KB (no assets; leaves headroom).
- [x] `node gdd/sim/unkle-lijahs-jetpack/sim.js` runs the schedule generator
      1,000 times and reports: items per act within target bands, condiment
      share per act, clean-column frequency between 5 and 15 percent of runs,
      no two items spawning within 120ms at the same x in Act I.
- [x] Playwright at 390×844: boot, Free Play with `?turbo&seed=d4`, run
      completes, end card shows, `burgers` saved is ≥ 1. (The M0 bot banks
      on 3 of 5 seeds; the other two spill through Lunch. Tuning the bot and
      the pendulum together is M1, so M0 pins a banking seed.)
- [x] Daily played twice in one day: second attempt shows the result card,
      not a run.
- [ ] Feel check: with no input Lijah hangs still under the pack; a flick
      right makes his head trail left then overshoot right.

### M1 — Pendulum tuning
Tune rod length, damping, thrust, stack stiffness against the target "3
holdable, 4 heroic". Confirm each part changes the feel the way the table
says.

Accept:
- [ ] Bot with stock pack, 200 seeded runs: median score between 4 and 8
      Burgers, spill rate between 1 and 4 per run.
- [ ] Bot with Fins scores more than stock; bot with Afterburner spills more
      than stock; bot with Brim catches more but spills more. Each with 200
      runs, differences visible in the medians.
- [ ] A 3-layer stack survives a full-thrust left-right-left with stock pack.
      A 4-layer stack does not.

### M2 — Read and juice
Silhouettes and motion for the four condiments finalised. Spill scatter,
flail, catch pop, bank pop, bell at Act III, buzzer slow-mo. Open call A
decided.

Accept:
- [ ] A screenshot at any moment of Act II has no two condiments that share
      both a colour and a silhouette.
- [ ] Bank, catch, spill, and buzzer each trigger a distinct visible effect
      in a recorded run (Playwright video or frame diffs).

### M3 — Daily and stats
Daily lock, best per mode, `Arcade.brag`, `Arcade.stats`, share text, end card
with the day's date. Open call B decided from playtests.

Accept:
- [ ] Two devices (two browser contexts) with the same date produce the same
      spawn list to the millisecond.
- [ ] Share text is one line, whole numbers only.

### M4 — Sound
Tones through `Arcade.audioCtx`: thrust hum that follows thrust strength,
catch tick that rises with stack height, bank chord, spill splat, bell,
buzzer. Mute button at `right: 60px`.

Accept:
- [ ] Muted state persists; no audio before `Arcade.boot`.

### M5 — Loadout and cosmetics
Lijah idles and flops on the loadout screen. Burger pile grows. Cosmetics
catalogue reaches a dozen entries. Open call C tried.

Accept:
- [ ] Buying a part and equipping it changes the run's physics constants
      (assert via `window.__lijah.params` in a test hook).
- [ ] The pile draws N burgers for N up to 500 without dropping below 50fps
      on a throttled CPU (Playwright CPU throttle 4×).

### Graduation
Remove `"beta": true`. The tile ships wearing "New!".
