# Totodile's Pond

- **Slug:** `games/totodiles-pond/` (no apostrophe — it's a live URL segment)
- **Tile:** not an emoji — `"icon": "totodile-2.png"` in `games.json`
- **Status:** **shipped** — v2 built against `Arcade.VERSION = 9`
- **Mascot:** Totodile, named by the player at first boot. Evolves twice.

## One-line pitch
A pond that keeps living while your phone is in your pocket — you open it to
find out what Totodile did without you.

---

## The thesis: *what did I miss?*

> **The pond runs on the real clock. Every time you close it, the world keeps
> going. Every time you open it, something has happened.**

The product is not the feeding and not the pet. The product is **the question
you carry around between sessions** — *what did I miss?* Every close plants
that question. Every open answers it and plants the next one.

Three consequences that drive everything below:

1. **Time away must produce content, not damage.** Every hour you're gone is
   an hour the pond had to do something worth showing you.
2. **The clock must be *read*, not just counted.** 7am and 11pm are visibly
   different ponds, or the real clock is wasted and you've built a stat
   tracker with a gator on it.
3. **There must always be exactly one thing ticking.** A cast line, a dive in
   progress. The player should close the app knowing something is cooking.

---

## Why this beats Tamagotchi

The v1 doc argued this and the v1 build did not earn it. Stated as three
claims that must be **true in the code**, each with the system that pays it:

| Claim | Tamagotchi | Here | Paid by |
| --- | --- | --- | --- |
| **Absence is content, not damage.** | Away 3 days = the worst outcome available (sickness, death). | Away 3 days = the **best card in the game**, plus a keepsake. | Drift buckets, System 2 |
| **The world moves on its own.** | The world is a fixed 3-icon backdrop. It never changes shape. | Drift leaves **permanent physical traces** in the pond you can point at a week later. | Traces, System 2 |
| **He remembers you specifically.** | No memory of any kind. Any Tamagotchi is any other Tamagotchi. | A dated journal, keepsakes with the day he gave them, and drift lines that **quote your own history back at you**. | Memory layer, System 8 |

Tamagotchi's emotional currency is **guilt**, and its only long-term stake is
**loss**. That produces a spike of compliance and then a cliff, because the
only way to stop feeling bad is to quit. Ours is **curiosity** and
**reciprocity**, and the long-term stake is a **shared history you'd hate to
lose**. Same open frequency, opposite feeling, and it doesn't make a
nine-year-old cry.

## What actually creates attachment

Attachment is not a stat. In descending order of power, and all four are now
built:

1. **Memory.** He references your specific shared past. A pet that remembers
   is not fungible with any other copy of the pet. This is the cheapest
   enormous win in the document.
2. **Reciprocity with no mechanical value.** He gives you **keepsakes** — half
   a shell, and he kept the other half. You cannot spend them. That is exactly
   why they work; a gift that's also currency is a wage.
3. **Legible preference.** He wants specific things and says so, and a rolled
   **trait** colours everything he does. Hiding a preference behind an
   invisible counter (v1) is the same as not having one.
4. **Traces.** He rearranges his own pond while you're gone, permanently.

---

## Iteration log

**Pass 1 — full Tamagotchi restoration.** Real hunger decay, sickness, death.
Killed it: the fail state is a deleted save, and a deleted save ends the loop
permanently. Retained one piece: *appetite on a real schedule*.

**Pass 2 — heavy appointment economy.** Crops-style timers everywhere, things
that spoil if you're late. Killed most of it: a spoil timer is decay wearing a
hat. Retained: *timers that ripen and then wait forever*, which give nearly
all the pull with none of the dread.

**Pass 3 — the drift engine as the spine.** Everything reorganised around
generating "what did I miss." Shipped as v1.

**Pass 4 — v1 post-mortem, and the fix.** v1 shipped and immediately failed a
real playtest: the tester spammed DIVE and cleared the entire 20-item
collection and funded the whole shop in **under five minutes**. The diagnosis
was worse than a tuning miss:

- *Every button was the same button.* FEED / PLAY / DIVE / CAST all resolved
  instantly into a card reading `+N 💧`. No decision existed anywhere. The
  food wheel looked like a choice but `favourite > other` always, so once you
  knew the favourite the wheel was a two-tap tax on a known answer.
- *DIVE had no gate whatsoever* — FEED was paced by appetite and CAST by a
  timer, but DIVE cost nothing and could be tapped forever.
- *Tier selection was uniform across unlocked tiers*, so The Dark was exactly
  as likely as the Shallows. Rarity did not exist. The code comment claimed it
  favoured depth "only slightly"; it did not weight at all.
- *Drift left no trace*, in direct violation of this document, so the pond you
  returned to was pixel-identical to the pond you left. "What did I miss?"
  answered "a sentence," and the engine of the game was a fortune cookie.
- *He had no perceivable inner state.* A still PNG that bobs, and a status word.
- *`markCareDay()` fired on any tap*, so evolution was an attendance sheet.
- *Night was a lockout* — three disabled buttons — rather than the prettiest
  screen in the game as promised.

Pass 4 is the version below. The through-line of every change: **turn taps
into appointments, and turn text into objects.**

---

## What got cut, and why

| Cut | Reason |
| --- | --- |
| Death, running away, permanent loss | Ends the loop. Non-negotiable. |
| Sickness, mess, cleaning | Chores as filler. Nobody's fond memory is the poop button. |
| Spoiling / expiring catches | Decay in disguise. Catches wait forever. |
| Energy bar gating actions | An artificial stop that makes the good session feel rationed. **See System 4** — depth is gated by appetite and by real time instead, which paces identically without inventing a resource. |
| Stat-driven branching evolution | Player can't perceive the inputs, so the outcome feels arbitrary. |
| Push notifications | Impossible — no service worker (`CLAUDE.md`). "One thing is ticking" does that job. |
| A hard daily action cap | Amputates good sessions. Expedition durations pace the game instead. |
| Currency you can run out of | No fail state anywhere. Dew Drops buy cosmetics only. |

---

## System 1 — The living clock

| Hours | Pond | Totodile |
| --- | --- | --- |
| 05–08 | pale gold, mist on the water | just waking, yawns, tells you his dream |
| 08–12 | bright, high sun | most active |
| 12–17 | warm, long light | lazy |
| 17–20 | orange, the good hour | second wind, most affectionate |
| 20–01 | deep blue, lanterns lit | winding down, yawning |
| 01–05 | near-black, stars, moonlit water | **asleep** |

The sleep window is `SLEEP_FROM`/`SLEEP_TO` at the top of `phase()`. Move those
two numbers and nothing else — `inWindow()` handles a window that wraps past
midnight and one that doesn't, and the dream gate reads `SLEEP_TO`.

**Night is content, not a lockout** (v2 fix). At night you can:
- watch him sleep — deliberately one of the prettiest screens in the game;
- **tuck him in**, once per night, which counts as care and writes a journal
  line;
- **cast the overnight line** — casting at 11pm is the single most correct
  action in the game and must never be disabled.

Feeding and diving are off, and that restraint is the point.

The palette ramp alone was never enough to make the clock *readable*, so v2
adds two pieces of free scenery: a **sun/moon disc that actually tracks the
day** — climbing through the morning, setting behind the bank at dusk, a moon
at night — and a **silhouetted far bank** at the waterline, which gives the sky
something to end against. Both are CSS, both cost nothing, and between them you
can tell roughly what time it is from across the room.

Critically, **a night visit no longer consumes your drift** (v1 bug: `lastSeen`
was written even though the drift was skipped, so a 1am peek after three days
destroyed the 3-day card permanently). Drift now always runs; at night it draws
from a quiet night-specific pool.

## System 2 — Drift (the engine)

While the app is closed, Totodile *does things*. On open — and on **return to
the tab**, which v1 never handled and which is the most common re-entry path on
the target device — you get a **drift card**: one line of text, sometimes a
permanent change to the pond, sometimes an item.

Buckets by time away: `<1h` / `1–6h` / `6–24h` / `1–3d` / `3d+`, seeded off
`lastSeen` so they aren't save-scummable.

Three things every drift pool must do, only the first of which v1 did:

1. **Be neutral or positive.** Never a request, never a guilt trip. The 3d+
   line is the emotional keystone of the game.
2. **Sometimes leave a trace.** A physical, permanent object in the pond: the
   pile of shiny things, the snail that lives here now, muddy tracks that go
   out and come back. Up to five traces are kept, FIFO. This is what makes
   absence *visible* rather than narrated.
3. **Sometimes reference your own history.** A second, dynamic pool is built
   at open time from live state and mixed into the draw — the line you left
   out, the dive he's still on, a keepsake he owns, a decor item you bought,
   the food he knows you know he likes. This is the memory layer showing up in
   the place the player already looks.

## System 3 — Appetite (hunger, defanged)

Rises in real time: ~2h to *peckish*, ~5h to *properly hungry*, then **stops**.
Never starving, never damaging.

Feeding a hungry Totodile is dramatically better than feeding a full one, so
you're rewarded for good timing rather than punished for bad. **New in v2:**
appetite also gates dive depth (System 4), which turns it from a reward
multiplier into a genuine input to a decision.

## System 4 — Expeditions and the Depths

**The headline v2 change.** DIVE stops being a button that dispenses loot and
becomes the second ticking thing.

You **choose a depth**. He goes down. He is **visibly gone from the pond** —
just a ring of bubbles where he went under — for a real duration, and he
surfaces with a find that **waits forever**.

| Tier | Unlock | Down for | Needs |
| --- | --- | --- | --- |
| Shallows | start | 90 s | anything |
| Reeds | 8 dives | 6 min | anything |
| Drop-off | Croconaw | 25 min | not hungry |
| Cold Deep | 25 dives + Croconaw | 90 min | not hungry |
| The Dark | Feraligatr | 5 h | fed |

This does five jobs at once:

- **Kills the spam exploit at the root.** The deep tables are behind real
  hours; no amount of tapping reaches them.
- **Creates a real decision.** A quick shallow dip now, or commit him to the
  Dark for five hours?
- **Makes appetite matter.** FEED → DIVE is a chain. Feeding a *full* gator to
  unlock the Dark is deliberately slightly wasteful — that's the tension.
- **Doubles the absence hook.** He's underwater while you're at school. That
  is the strongest "close the app knowing something is cooking" this design
  has ever had.
- **Shows the locked depths.** Visible gaps in the depth list do the same work
  as visible gaps in the collection grid.

**The line (CAST)** stays, and is now clearly differentiated rather than being
a slower dive: **the line pays dew drops, the dive pays the collection.**

| Line | Ripens | Drops | Find chance |
| --- | --- | --- | --- |
| Short | 20 min | 8 | 15% |
| Mid | 2 h | 25 | 30% |
| Overnight | 8 h | 45 | 60% |

A line and a dive run **independently** — two things ticking, and they ripen on
different clocks. Line finds use a depth-weighted draw favouring the shallows,
which is the rarity curve v1 claimed in a comment and never implemented.

**The collection grid** shows empty slots for things you haven't found. Rare
finds are variable-ratio within a tier, tuned so a dedicated week produces
roughly one genuine "oh!". Duplicates still pay, at a third rate, so a tier
never becomes worthless.

## System 5 — Evolution

| Stage | Gate | Change |
| --- | --- | --- |
| **Totodile** | start | small, all base actions |
| **Croconaw** | 14 care-days | bigger, unlocks the Drop-off + Cold Deep |
| **Feraligatr** | 40 care-days | full size, unlocks The Dark |

**A care-day now requires two different care actions in one day** (v2 fix — v1
banked one for any single tap, which made evolution an attendance sheet). Feed
+ play, feed + dive, tuck + reel; any two. This gives the daily open a shape
without becoming a chore, and it is stated in words in the Pond sheet so it's
never a guessing game.

Evolution fires at a moment on the real clock, full-screen, with the only
melody in the game, and **hands you a keepsake**. Missing it costs the moment,
never the progress.

## System 6 — Dreams

Once per day, on the first open after 05:00. One line, thirty in the pool.

Some are pure charm. Others **hint at something findable that day**: a dream of
something silver sets a boost on that day's Cold Deep table, which re-rolls the
draw and keeps the rarer result. That converts a flavour beat into a reason to
send him down.

## System 7 — The family layer (no backend)

Static site, so no server. **Shared daily seed** — everyone in the family gets
the same weather and the same rare-of-the-day. Dinner-table content.

Deferred: **pond codes**, a ~14-char base36 string encoding stage, decor,
collection count and name, texted between family members and pasted in to view
a read-only pond.

## System 8 — Memory (new in v2)

The attachment layer. Three pieces, none of which need a backend.

**The journal.** A dated log of notable events, capped at 40, newest first, in
the Pond sheet: evolutions, first finds, keepsakes, favourites discovered,
tuck-ins, the big drift cards. Dates render relative inside a week ("yesterday")
and absolute after. Reading back a month of a pond you've kept is the single
strongest reason not to delete the save.

**Keepsakes.** Eight of them, each a physical object with a note and the real
date he gave it to you. Granted by long-absence drift, by each evolution, and
by your first find in each new depth. **They are not currency and can never be
spent.** They sit on a shelf in the Pond sheet.

> 🐚 half a shell — *He kept the other half.* — given the 3rd of September

**Callbacks.** The drift pool reads the journal and the keepsake shelf and
quotes them back. This is what turns "a sentence" into "he remembers."

## System 9 — Trait and mood (new in v2)

**Trait** is rolled once from `born` and never re-rolled: Bold, Shy, Greedy,
Dreamy, Silly, or Gentle. Each carries a description, a set of reaction-line
overrides, and exactly one small mechanical tilt (Bold dives ~15% faster;
Greedy finds pay +1; Silly play pays +2; Dreamy dreams richer; Shy drift pays
+1; Gentle tuck-ins pay double). Tilts stay small on purpose — the trait is
characterisation first. It is **not** announced at birth; it's named in the
Pond sheet once you've had him three care-days, which reframes the first week
as *finding out who he is*.

**Mood** is derived, never stored, and shown as one word in the top bar:
asleep / down there / delighted / hungry / waiting / sleepy / lazy / lively /
content. It costs eight lines of code and it is the difference between a sprite
and an animal.

**Favourites are now discoverable** (v1 hid them behind five successful hits
with zero signal): the ♥ appears after **two**, the reaction on the first
correct guess is unmistakable, and the Pond sheet has a "What he likes" panel
that fills in as you learn.

---

## The daily cadence

| When | ~Time | What it's for |
| --- | --- | --- |
| **Morning** | 40s | Dream, breakfast at peak appetite, send him down, cast the day's line |
| **Midday** | 20s | Reel the short line, surface him, one play, re-send |
| **Evening** | 90s | The big one — feed, the deep expedition, decorate, journal |
| **Night** | 15s | He's asleep. Tuck him in. Cast the overnight line. |

Nothing is missable. Skipping any of them costs nothing but the content of that
particular open.

---

## Screen

```
   🌧 08:14  ·  day 23  ·  content                <- clock, age, mood

              ·   ·   ·   ·   ·
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~
            🪷        🐊        🪨              <- ~140px, live idle anim
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~
            ✨   🐌    〰️      🏮
             ^ traces        ^ line cast

   ┌─────────────────────────────────────┐
   │ He's still got the green glass. He  │      <- drift card, on open only
   │ keeps it where he can see it.       │
   └─────────────────────────────────────┘

   🍖 hungry  ·  🎣 1h 12m  ·  🫧 4h 02m  ·  💧 34

   ┌──────┬──────┬──────┬──────┬──────┐
   │ FEED │ PLAY │ DIVE │ CAST │ POND │
   └──────┴──────┴──────┴──────┴──────┘
```

- The pond **is** the screen. Overlays (cards, pickers, the Pond sheet) are
  **fixed and full-screen** — in v1 they only covered the scene, leaving the
  thumb row live underneath, so a tap could stack a second sheet on the first.
- Four readouts, each a live countdown or a live state — never a score.
- At night, PLAY becomes **TUCK**.

## Controls

- Five tap targets, ≥64px, bottom thumb row. Portrait, one thumb, no hover, no
  dragging, no precision, no speed.
- FEED / PLAY / DIVE / CAST open a picker sheet: tap to open, tap to pick.

## Audio

Blips for actions, a four-note theme that only plays on evolution. Ambience
(water, crickets, rain) still deferred — ~30 lines of WebAudio noise whenever
we want it.

## Persistence

`Arcade.save` / `Arcade.load`, one `state` key, under ~2KB:

- `v` — save version, drives migration.
- `born`, `name` — creation timestamp (doubles as trait/favourite seed), name.
- `careDays`, `lastCareDay`, `actDay`, `actKinds` — growth and the two-action
  care-day rule.
- `lastSeen` — **the most important key in the game.** Written on hide as well
  as on open, so away-time measures from when you actually left.
- `fedAt` — appetite clock.
- `line` — `{ castAt, ms, kind }` or null.
- `dive` — `{ startAt, ms, tier }` or null.
- `drops`, `decor[]`, `found[]`, `dives`, `traces[]`, `keepsakes[]`,
  `journal[]` — economy, pond, collection, memory.
- `dreamDay`, `boostDay`, `boostTier`, `tuckNight`, `stageSeen` — daily gates.
- `favHits`, `favSeen` — favourite discovery.

Clock-tamper tolerant: negative deltas clamp to zero, drift caps at the 3d+
tier, and timers that read as complete under a rewound clock resolve normally
rather than locking.

**v1 → v2 migration.** The dive exploit made v1 collections and drop balances
meaningless, so the migration **re-digs the pond**: `found`, `dives` and the
depth unlocks reset, `drops` clamps to 30. Name, birthday, care-days,
evolution stage and everything already bought are kept, and the player is told
in a card on first open rather than silently robbed.

## Accessibility

- Every state stated in words as well as colour/animation; drift card and
  reaction line are `aria-live="polite"`.
- Night palette keeps ≥4.5:1 text contrast.
- Nothing requires precision, speed, or a gesture.
- `prefers-reduced-motion` drops idle animation to a slow bob.

## Assets

`totodile.png`, `croconaw.png`, `feraligatr.png` (sprites) + `totodile-2.png`
(tile icon). Idle/hop/wiggle via CSS transforms on the still; sleep is a tilt
plus a dim, which is as far as one still pose stretches. Pond, sun, bank,
weather, decor and traces are inline CSS and emoji. No image requests, no
fonts, no CDN. Whole game ~87KB, comfortably inside the 500KB budget.

Decor and traces are laid out **by depth** — floating things at the surface,
fish mid-water, rock and log on the bottom — and kept clear of the centre
column where he stands. In v1 every y-coordinate was measured against the whole
scene rather than the water, so the shrine floated in the sky.

## Build checklist

- [x] `games/totodiles-pond/index.html` + 4 PNGs. Single self-contained file.
- [x] Imports only `shared/arcade.css` and `shared/arcade.js`.
- [x] `Arcade.boot()` before audio; `Arcade.backButton()`.
- [x] `games.json` entry (uses the optional `icon` field — see below).
- [x] Bumped `Arcade.VERSION` to 9.
- [x] **v2 bug fixes:** dive spam closed; tier draw actually weighted; night
      visits no longer burn drift; `visibilitychange` re-runs the open
      sequence; reaction animations no longer truncated by the 1s tick; decor
      no longer floats in the sky; reaction line clears; care-day requires two
      actions; duplicate finds pay a reduced rate; overlays no longer leave the
      action row live beneath them; a brand-new Totodile no longer reports a
      dream on the day he arrives; a history callback can no longer substitute
      for the 1-day and 3-day cards.
- [x] Test matrix (147 automated checks against the real file — a stub-DOM
      scenario suite plus a headless-Chrome pass): revisit at +30m/+3h/+10h/
      +2d/+6d/+1yr; across midnight; a 5-day absence landing at 2am; clock set
      backwards; a corrupt save, a half-written save and a malformed dive; a v1
      save migrating to v2 exactly once; `localStorage` unavailable; and a full
      click-through in a real browser with no console errors or exceptions.

### The one house-rule amendment

`index.html` previously hardcoded `emoji.textContent = game.emoji`, so an image
tile was impossible without editing the arcade index — which `CLAUDE.md`
forbids. Rather than special-case this game, `games.json` takes an optional
`icon` (a filename inside the game's own folder) and the index prefers it over
`emoji`, with `emoji` still the fallback. One generic change; the rule holds.

## Tuning knobs

1. **Expedition durations (90s / 6m / 25m / 90m / 5h).** The new spine. The
   Dark at 5h is the number that decides whether the deep collection feels
   earned or feels like homework.
2. **Drift tier boundaries (1h / 6h / 24h / 3d).** The whole feel of coming back.
3. **Appetite curve (2h / 5h).** Now double duty: meal windows *and* the depth
   gate.
4. **Line yields (8 / 25 / 45 drops).** The entire drop economy is here now
   that diving doesn't print money. Shop totals 645; ~80/day is ~8 days to own
   the pond.
5. **Evolution gates (14 / 40 care-days), at two actions per day.**
6. **Keepsake grant rate.** Eight exist. Too fast and they're loot; too slow
   and the memory layer never starts. Currently: 30% of long-absence drifts,
   every evolution, every first-find in a new depth.

## Open questions

- **Live weather API?** Rain outside = rain in the pond is still the best idea
  in this document and the only one needing a network call.
- **Tricks** — a Croconaw-stage verb. Evolution currently unlocks depths only.
- **Pond codes** and the daily visitor.
- **Seasons** — the palette shifts by hour but not yet by date.
- **"Wild Mode"** — opt-in real decay for whoever wants the authentic 1997
  experience. Would never be the default.
- One pond per device, or a family of ponds picked at boot?
