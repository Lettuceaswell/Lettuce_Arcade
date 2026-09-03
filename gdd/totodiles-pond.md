# Totodile's Pond

- **Slug:** `games/totodiles-pond/` (no apostrophe — it's a live URL segment)
- **Tile:** not an emoji — `"icon": "totodile-2.png"` in `games.json`
- **Status:** **shipped** — v1 built against `Arcade.VERSION = 7`
- **Mascot:** Totodile, named by the player at first boot. Evolves twice.

## Shipped in v1

Living clock (6 phases + sleep), the drift engine, appetite, lines, dives and
all five Depths tiers, the 20-item collection, evolution at 14/40 care-days,
dreams, hidden favourites with the ♥ receipt, the decor shop (10 items),
daily weather, and naming.

## Deferred, in rough priority order

- **Ambience loop** — only action blips and the evolution melody shipped.
  Running water and night crickets were cut to keep the first build honest;
  they're ~30 lines of WebAudio noise whenever we want them.
- **Tricks** — the stage-2 verb described below. Evolution currently unlocks
  depth tiers only, so Croconaw is slightly thinner than written.
- **Pond codes** (the family share layer) and the **daily visitor**.
- **Seasons** — the palette shifts by hour but not yet by date.
- **Live weather API** — still the best idea in this doc. See Open Questions.

## One-line pitch
A pond that keeps living while your phone is in your pocket — you open it to
find out what Totodile did without you.

---

## The thesis: *what did I miss?*

The old draft was built around the greeting, because the house rules forbade
anything that moved while you weren't looking. That rule is gone, so the
design gets its real engine back:

> **The pond runs on the real clock. Every time you close it, the world keeps
> going. Every time you open it, something has happened.**

The product is not the feeding and not the pet. The product is **the question
you carry around between sessions** — *what did I miss?* Every close plants
that question. Every open answers it and plants the next one.

This is the strongest known retention loop that doesn't run on anxiety. It is
the Animal Crossing engine, and it beats Tamagotchi's decay engine on every
axis that matters: decay makes you open the app to **prevent a loss**, drift
makes you open it to **collect a surprise**. Same frequency, opposite feeling,
and the second one doesn't burn out in a fortnight or make a nine-year-old cry.

Three consequences that drive everything below:

1. **Time away must produce content, not damage.** Every hour you're gone is
   an hour the pond had to do something worth showing you. Absence is the
   game's raw material.
2. **The clock must be *read*, not just counted.** 7am and 11pm are visibly,
   audibly different ponds. If the game looks identical at every hour, the
   real clock is wasted and you've built a stat tracker with a gator on it.
3. **There must always be exactly one thing ticking.** A cast line, an
   incubating egg, a dive in progress. The player should close the app knowing
   something is cooking. That's the hook — not a notification we can't send.

---

## Iteration log

**Pass 1 — full Tamagotchi restoration.** Real hunger decay, sickness, death.
Killed it: the fail state is a deleted save, and a deleted save ends the loop
permanently. Also every playtest of every pet game ever says the same thing —
loss-aversion loops produce a spike of compliance and then a cliff, because
the only way to stop feeling bad is to quit. Retained one piece: *appetite on
a real schedule*, reframed below.

**Pass 2 — heavy appointment economy.** Crops-style timers everywhere, things
that spoil if you're late, energy bar gating actions. Killed most of it: a
spoil timer is decay wearing a hat, and it converts "I want to open this" into
"I have to open this before 6." Retained: *timers that ripen and then wait
forever*, which turn out to give nearly all the pull with none of the dread.

**Pass 3 — the drift engine as the spine.** Everything reorganised around
generating "what did I miss." This is the version below. The systems that
survived all three passes are the ones that answer that question in different
timescales: minutes (appetite), hours (drift, lines), days (dreams, weather),
weeks (evolution, the Depths).

---

## What got cut, and why

| Cut | Reason |
| --- | --- |
| Death, running away, permanent loss | Ends the loop. Non-negotiable, same as no coin balance in Lettuce Slots. |
| Sickness, mess, cleaning | Chores as filler. Nobody's fond memory is the poop button. |
| Spoiling / expiring catches | Decay in disguise. Converts anticipation into obligation. Catches wait forever. |
| Energy bar gating actions | An artificial stop that makes the good session feel rationed. The clock already paces the game. |
| Stat-driven branching evolution | Player can't perceive the inputs, so the outcome feels arbitrary. Evolution is time + care only. |
| Push notifications | Impossible — no service worker (`CLAUDE.md`). The game must be *remembered*. Fortunately "one thing is ticking" does that job. |
| A hard 3-action daily cap | Was load-bearing in the old draft to protect the greeting. With a live world there's always something new, so the cap now just amputates good sessions. Replaced by natural pacing (appetite windows, line timers). |
| Currency you can run out of | No fail state anywhere. Dew Drops buy cosmetics only. |

---

## System 1 — The living clock

The pond reads the device clock. This is the cheapest system in the doc and
the highest-impact one.

| Hours | Pond | Totodile |
| --- | --- | --- |
| 05–08 | pale gold, mist on the water | just waking, yawns, tells you his dream |
| 08–12 | bright, high sun | most active, best play reactions |
| 12–17 | warm, long light | lazy; naps on the rock if unattended |
| 17–20 | orange, the good hour | second wind, most affectionate |
| 20–23 | deep blue, lanterns lit | winding down, yawning |
| 23–05 | near-black, stars, moonlit water | **asleep** — curled up, visibly breathing |

Night is not a lockout. You can visit at 1am and watch him sleep, and that
peek is deliberately one of the prettiest screens in the game. You can tuck a
blanket on him. Nothing else is available, and that restraint is the point.

Seasons shift the palette four times a year off the real date. Free.

**Stretch:** hit a public weather API for the family's town so it rains in the
pond when it rains outside. This is the single most magical thing on this list
and the only one that needs a network request — flagged in Open Questions.

## System 2 — Drift (the engine)

While the app is closed, Totodile *does things*. On open, before anything
else, you get a **drift card**: one line of text, one visual change to the
pond, sometimes an item.

Events are drawn from a pool (~30 at launch, trivially expandable) gated by
how long you were away and seeded off `Arcade.dailySeed()` + timestamp so
they're not repeatable by save-scumming:

- **< 1h:** nothing, or a tiny one — *"He hasn't moved."*
- **1–6h:** *"He dragged a smooth stone in from somewhere."* *"He's got weed
  on his head and seems proud of it."* *"He fell asleep in the reeds."*
- **6–24h:** *"He's rearranged your lily pads. They're worse now."* *"There's
  a frog. They appear to have an understanding."* *"He caught something by
  himself and left half of it for you."*
- **1–3d:** *"He's built a little pile of everything shiny he could find."*
  *"He's been sleeping on your side of the pond."*
- **3d+:** *"He waited by the edge a lot. He's fine. He's just glad you're
  back."* — plus the biggest greeting animation in the game.

**Rules for the pool:** every event is neutral or positive; several leave a
permanent trace in the pond; none of them are a request. The 3d+ tier is
written warm, never guilt-tripping — that line is the emotional keystone of
the whole game and worth getting right.

## System 3 — Appetite (hunger, defanged)

Appetite rises in real time, ~5h to *peckish*, ~8h to *properly hungry*, and
then **stops**. It never becomes starving, never damages anything.

The trick: **feeding a hungry Totodile is dramatically better than feeding a
full one.** Full = a polite nibble. Hungry = the whole animation, the happy
noise, 3× Dew Drops. You're rewarded for good timing rather than punished for
bad timing, and the retention pull is nearly identical.

Result: two or three natural meal windows a day that you *want* to hit,
mapping neatly onto breakfast / after school / evening.

## System 4 — Lines and the Depths

The "something is always ticking" system, and the long-tail progression.

**Casting.** Set a line before you close the app: **20 min**, **2 hours**, or
**8 hours** (the overnight). Longer line, better table. The catch **waits
forever** — no spoiling, no reset. Nothing is ever lost by being late; you
just weren't there for it yet.

**The Depths.** Five tiers, unlocked by evolution stage and total dives:

| Tier | Unlock | Yields |
| --- | --- | --- |
| Shallows | start | pebbles, weed, common fish |
| Reeds | 10 dives | frogs, shells, pond decor |
| Drop-off | Croconaw | bigger fish, old coins |
| Cold Deep | 40 dives | rare fish, the good decor |
| The Dark | Feraligatr | one-off treasures, the collection's rarest slots |

**The collection grid** shows empty slots for things you haven't found — gaps
you can see are the single most reliable driver of "one more open" in any
collection game. Rare finds are variable-ratio, tuned so a dedicated week
produces roughly one genuine "oh!"

## System 5 — Evolution

Real, staged, and the loudest moments in the game.

| Stage | Gate | Change |
| --- | --- | --- |
| **Totodile** | start | small, all base actions |
| **Croconaw** | 14 care-days | bigger, deeper voice, unlocks Drop-off + tricks |
| **Feraligatr** | 40 care-days | full size, unlocks The Dark, can carry you across the pond |

Evolution happens **at a moment**, on a real clock. If you're there to see it,
you get the full-screen sequence and a keepsake photo for the pond wall. If
you're not, you come back to a drift card — *"Something happened while you
were out."* — and a replay you can watch. Missing it costs the moment, never
the progress.

Announce it a session ahead: *"He feels different today."* An appointment you
genuinely want to make.

## System 6 — Dreams

Once per day, on the first open after 05:00, Totodile tells you what he
dreamed. One line, one small piece of art, thirty of them in the pool.

Some dreams are pure charm — *"He dreamed he was very large."* Others **hint
at something findable that day**: dream of something silver, and today's Cold
Deep table has an extra rare in it. That converts a flavour beat into a reason
to cast a line, and gives the morning open a job.

## System 7 — The family layer (no backend)

Static site, so no server. Two things get 90% of social for free:

1. **Shared daily seed** — everyone in the family gets the same weather, the
   same visiting creature, the same rare-of-the-day. Dinner-table content.
2. **Pond codes** — a ~14-character base36 string encoding stage, decor,
   collection count and Totodile's name. Text it to family, paste theirs in,
   see their pond as a read-only visitor. Zero infrastructure, real showing-off.

---

## The daily cadence

Designed so four opens a day each feel like a *different game*, and any one of
them alone is still a complete session.

| When | ~Time | What it's for |
| --- | --- | --- |
| **Morning** | 40s | Dream, breakfast (peak appetite), cast the day's line |
| **Midday** | 15s | Reel in the 20-minute line, one play, re-cast |
| **Evening** | 90s | The big one — the 8h line, a dive, decorate, tricks |
| **Night peek** | 10s | He's asleep. No mechanics. Pure charm. |

Nothing is missable. Skipping any of them costs nothing but the content of
that particular open.

---

## Screen

Portrait, single view, nothing scrolls.

```
   ☀️ 08:14   ·   day 23   ·   🐊 Totodile         <- live clock, real time

              ·   ·   ·   ·   ·
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~
            🪷        🐊        🪨              <- ~140px, live idle anim
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~
            🐟   🌿    〰️      🏮
                      ^ line cast, bobbing

   ┌─────────────────────────────────────┐
   │ He dragged a smooth stone in from   │      <- drift card, on open only
   │ somewhere. He won't say where.      │
   └─────────────────────────────────────┘

   🍖 hungry   ·   🎣 1h 12m   ·   💧 34         <- the three live readouts

   ┌──────┬──────┬──────┬──────┬──────┐
   │ FEED │ PLAY │ DIVE │ CAST │ POND │
   └──────┴──────┴──────┴──────┴──────┘
```

- The pond **is** the screen. One overlay layer for shop / collection / codes.
- The three readouts are the only numbers, and each is a live countdown or a
  live state — never a score.
- Drift card appears on open, dismisses on tap, never returns.

## Controls

- Five tap targets, ≥64px, bottom thumb row.
- Feed and Play open a 4–6 icon wheel: tap to open, tap to pick.
- **Now permitted and used:** dragging a fish onto Totodile, a swipe-down to
  dive, a pull-back-and-release cast. All optional gestures with a tap
  fallback, because portrait one-thumb is still a house rule.

## Audio

Real ambience now that nothing forbids a running loop: water, birds by day,
crickets at night, rain when it rains. Generated with WebAudio noise + filters,
zero KB. Blips for actions. A four-note theme that only plays on evolution.

## Persistence

`Arcade.save` / `Arcade.load`:

- `born`, `name` — creation timestamp (doubles as preference seed), chosen name.
- `stage`, `careDays`, `lastCareDay` — growth.
- `lastSeen` — **the most important key in the game.** Everything drifts off it.
- `fedAt` — appetite clock.
- `line` — `{ castAt, duration, caught }` or null.
- `drops`, `decor[]`, `found[]`, `dives` — economy, pond, collection.
- `dreamDay`, `driftSeen` — once-a-day gates.

Under 600 bytes. Clock-tamper tolerant: clamp negative deltas to zero and cap
drift at the 3d+ tier, so setting the phone forward gains nothing much.

## Accessibility

- Every state stated in words as well as colour/animation; drift card and
  reaction line are `aria-live="polite"`.
- Night palette keeps ≥4.5:1 text contrast — the pretty screen is still legible.
- All gestures have a tap equivalent. Nothing requires precision or speed.
- Motion-reduce media query drops idle animation to a slow bob.

## Assets

- `totodile.png` (supplied), plus Croconaw and Feraligatr for the two
  evolutions. Idle/hop/wiggle via CSS transforms on the still — no sprite
  sheet needed for v1.
- Pond, weather, decor: inline SVG/CSS. No image requests.
- Comfortably inside the 500KB budget even with three sprites.

## Build checklist

- [x] `games/totodiles-pond/index.html` + 4 PNGs (3 sprites, 1 tile icon).
      Single self-contained file, matching `tap-race` and `lettuce-slots`.
- [x] Imports only `shared/arcade.css` and `shared/arcade.js`.
- [x] `Arcade.boot()` before audio; `Arcade.backButton()`.
- [x] Appended to `games.json`:
      `{ "slug": "totodiles-pond", "title": "Totodile's Pond", "blurb": "A pond that keeps going while you're away.", "emoji": "🐊", "icon": "totodile-2.png" }`
- [x] Bumped `Arcade.VERSION` to 7.
- [x] Test matrix: revisit at +5min, +6h, +2d, +10d; across midnight; with the
      clock set backwards; with `localStorage` unavailable. All pass under a
      headless DOM stub — the drift buckets resolve to t0/t6/t24/t72 correctly
      and a backwards clock awards nothing.

### The one house-rule amendment

`index.html` previously hardcoded `emoji.textContent = game.emoji`, so an image
tile was impossible without editing the arcade index — which `CLAUDE.md:16-18`
forbids. Rather than special-case this game, `games.json` now takes an optional
`icon` (a filename inside the game's own folder) and the index prefers it over
`emoji`, with `emoji` still the fallback. One generic change; the rule holds
again for every future game.

## Tuning knobs

1. **Drift tier boundaries (1h / 6h / 24h / 3d).** The whole feel of coming
   back. Most important numbers in the doc.
2. **Appetite curve (5h / 8h).** Governs how many meal windows a day exist.
3. **Line durations (20m / 2h / 8h).** The 8h overnight is the retention
   anchor — it should be the obvious last thing you do before bed.
4. **Evolution gates (14 / 40 care-days).** Long enough to be earned, short
   enough that a kid gets to Croconaw before losing interest. 14 is probably
   right; 40 may want to be 35.
5. **Rare-find rate in the Depths.** Target one genuine surprise per week.

## Open questions

- **Live weather API?** Rain outside = rain in the pond is the best idea in
  this document and the only one needing a network call. Breaks no rule that
  still exists, but it's an external dependency on a static site. Worth it.
- **"Wild Mode" toggle** — an opt-in harder ruleset with real hunger decay and
  consequences, for whoever in the family wants the authentic 1997 experience.
  Cheap to add on top; would not be the default.
- Name Totodile yourself, or pick from a list of eight? Leaning free text now
  that the game is this personal.
- One pond per device, or a family of ponds picked at boot?
