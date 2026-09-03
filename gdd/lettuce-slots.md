# Lettuce Slots

- **Slug:** `games/lettuce-slots/`
- **Emoji:** 🥬
- **Status:** **v2 shipped (v22)** — a 75-spin run with a bowl you can
  lose. v1 (the free-spin toy) is gone; its post-mortem is kept below.

## One-line pitch
Every spin adds to a salad bowl. Serve it and it's yours; spin again and it
grows faster — unless the snail on the third reel gets there first.

---

## v1 post-mortem: a toy, not a game

v1 shipped exactly what its document asked for, and its document asked for
the wrong thing. Four criticisms from real play, each of which is a direct
consequence of a v1 design decision rather than a tuning miss:

| Criticism | Cause in v1 |
| --- | --- |
| **"Not a complete game."** | No start, no end, no result. The button is live from boot, the counter is lifetime, and the session ends when you get bored. The template asks "what ends the game?"; v1 answered "nothing" and shipped. |
| **"Nothing is at stake."** | "Points only ever go up. There is no way to lose" was a *stated goal*. Betting was cut because "a balance introduces a fail state." A game where nothing can be lost has nothing at stake, by construction. |
| **"I'm not making a run at it, I'm opening to see what happens."** | There is no decision. SPIN is the only verb and the outcome is fully rolled before the animation starts. Every bit of engineered anticipation points at *the next tap*; none of it points at *this sitting*. |
| **"When am I done?"** | Never. "Expected session: 30–150 spins" was an observation about boredom, not a mechanism. |

v1 confused two different kinds of loss. **Save-scoped loss** (your
lifetime total goes down, your pet dies) ends the game's life; cutting it was
right. **Run-scoped loss** (the bowl you built in the last nine spins is
gone) ends nothing but this streak, and it is the entire source of stakes in a
press-your-luck game. v1 cut both. v2 keeps the first cut and reverses the
second: **nothing you keep can ever be lost; everything you're still holding
can.**

What survives from v1 unchanged: the third-reel thesis (below), the near-miss
presentation, the audio ramp, the emoji strip, and the rule that the outcome
is rolled before the animation and never adjusted mid-spin.

---

## The thesis, revised

**Anticipation, not reward — and anticipation is proportional to what you
stand to lose.** v1 got the first half right: dopamine spikes in the uncertain
interval before an outcome, so the third reel decelerating while two match is
the product. v1 missed the second half. Two 🍅 with a third reel crawling is
tense once. It is *exactly as tense* on spin 400 as on spin 4, because
whatever lands, you lose nothing. Tension that never varies is a screensaver.

v2 puts a number in the bowl before every spin. The same crawling third reel
now has three outcomes instead of two — **double the bowl, lose the bowl, or
nothing** — and the size of the bowl is something the player built by
choosing not to serve. The stake of the third-reel moment is authored by the
player, spin by spin. That is the difference between "watching a reel" and
"making a run."

Four consequences, and they drive everything below:

1. **The third reel is still the product.** It is now the *only* place a
   win or a bust can be decided. Reels 1 and 2 can build hope; only reel 3
   can pay or eat.
2. **The bowl is the stake.** It grows faster the longer you hold it, and it
   is worth nothing until you serve it.
3. **Serve is the decision.** One extra tap, available before every spin.
   Serving is the safe act and spinning is the default, so accidental play
   is *risky* play — the game never plays safe on your behalf.
4. **A run is 75 spins.** It has a start card, a visible countdown, and an
   end card. When the spins are gone, you are done, and you know how you did.

---

## Rules

### Reels

- Reels 1 and 2: five symbols, uniform: 🍅 🥕 🧀 🫒 🥬
- Reel 3: **six** slots, uniform: 🍅 🥕 🧀 🫒 🥬 **🐌**

The strips are deliberately asymmetric (real machines do this). The snail
lives only on reel 3, so a bust is always decided at the last reel-stop, at
the end of the deceleration, in the same moment a win is. Outcomes per spin:

| Outcome | Odds | Effect |
| --- | --- | --- |
| 🐌 on reel 3 | 1 in 6 (16.7%) | **Bust.** Bowl → 0, streak → 0. |
| 3 × 🥬 | 1 in 150 (0.67%) | **Jackpot.** Bowl ×3, then +50. |
| 3 of anything else | 1 in 37.5 (2.7%) | **Match.** Bowl ×2. |
| Reels 1 & 2 match | 1 in 5 (20%) | **Tension spin** — reel 3 crawls. |
| Anything else | the rest | Just the leaf (below). |

Given a tension spin, reel 3 lands: match 1/6, snail 1/6, miss 4/6. The
crawling reel can pay, eat, or fizzle, with equal odds on the two that matter.

### The bowl

- Every spin that isn't a bust is a **leaf**: streak goes up by one and the
  bowl gains **the streak number**. Spin 1 of a streak adds 1, spin 2 adds 2,
  spin 9 adds 9. After *k* spins the bowl holds *k(k+1)/2*: 15 at five, 36 at
  eight, 55 at ten, 78 at twelve.
- A match or jackpot multiplies the bowl **after** that spin's leaf is added.
- **SERVE** moves the bowl to your score and resets the streak to 0. It is
  free, always available when the bowl is above 0, and costs no spin. Its
  price is that the next spin adds 1 again instead of 10.
- A snail landing on an empty bowl takes nothing and resets nothing — "he
  found an empty bowl." No double punishment right after a serve.

The growth is triangular and the risk is flat, so there is a real point at
which serving becomes correct — but it depends on the bowl, not on a rule
the player can read off the screen. The player experiences it as "this is
getting big," which is the feeling the game is for. Survival odds for a
streak: five spins 40%, eight 23%, ten 16%, twelve 11%.

### The run

- **75 spins.** The counter is on screen the whole time.
- At spin 0 anything still in the bowl is served automatically ("last
  call"). The last few spins are therefore a free all-in, which is the right
  ending: a final push with nothing to protect but the run.
- Score is **total served**. The end card names where it lands on the
  ladder:

| Served | Name |
| --- | --- |
| under 100 | Side salad |
| 100 | Garden salad |
| 200 | Chef's salad |
| 300 | Feast |
| 450 | Legendary |

  The next rung is shown during the run ("Chef's at 200 · 62 to go") so
  the second half of every run has a concrete target. This is the line that
  turns "how did I do" into "I'm making a run at Chef's."

### Daily and free play

- **Daily run.** Reel outcomes are drawn from `Arcade.seededRandom` keyed
  on `"lettuce-slots:" + Arcade.dailySeed()`, three draws per spin and
  nothing else from the stream. **Everyone gets the same 75 reels.** Serving
  doesn't consume a draw, so the sequence is identical whatever anyone
  does — two players' scores differ *only* by when they served. One daily
  run per device per day; reopening lands on the end card.
- **Free play.** Same rules, unlimited, its own best. A free run draws a
  random seed string once at the start and stores it, then uses the same
  seeded stream as the daily — so a free run can be resumed exactly too,
  and nothing in the file ever calls `Math.random()` for an outcome. This
  is the retry loop. The daily is the one you can't take back.
- **Copy result** on the end card writes one line to the clipboard:
  `🥬 Lettuce Slots · Sep 3 · 214 served · Chef's salad · biggest bowl 88 · 🐌 11`
  Text only, no canvas — the score line is the whole story. Same
  `navigator.clipboard` call and `<textarea>` fallback as Daily Letters.

### Measured

10,000 simulated 75-spin runs per strategy against the rules above
(`match ×2`, `jackpot ×3 +50`, snail 1/6, triangular growth):

| Strategy | Mean | p10 | Median | p90 | p99 | Snails | Serves |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Serve after every spin (timid) | 91 | 61 | 68 | 123 | 219 | 12.5 | 62 |
| Serve at streak 5 | 157 | 101 | 146 | 227 | 333 | 12.5 | 9 |
| Serve at streak 6 or after any win (steady) | 174 | 106 | 167 | 251 | 340 | 12.5 | 8 |
| Serve at bowl ≥ 40 or after a win, all-in for the last 6 (sharp) | 186 | 90 | 178 | 300 | 430 | 12.5 | 5 |
| Serve only after a win (gambler) | 166 | 14 | 118 | 373 | 808 | 12.5 | 3 |
| Never serve (reckless) | 45 | 0 | 9 | 105 | 553 | 12.5 | 1 |

Three things this table has to say, and does:

- **Nerve beats luck 2×.** Sharp play doubles timid play at the mean and
  at the median. The reels are identical across strategies here; the whole
  gap is serve timing. Compare the additive economy v1 would have implied
  (`+50`/`+500` straight into the bowl, 60-spin sim): timid scored 326
  against sharp's 390, a 20% gap, because a jackpot was worth the same
  whether you'd risked nine spins or none. Luck swamped the decision. Wins
  have to *multiply* the bowl or the bowl is decoration.
- **The ceiling is chaseable.** Sharp play's p99 is 430, about 2.4× its
  median. Under a `×5` jackpot (60-spin sim) the same strategy maxed at
  1,900 against a 163 median — one freak run and "best" is dead forever.
  The `+50` on the
  jackpot exists so that a jackpot on a bowl of 1 still reads as a jackpot
  (53, not 3); the `×3` instead of `×5` exists to keep the tail on a leash.
- **Recklessness is punished and timidity is merely poor.** Never serving
  scores half of serving every spin. The bowl nearly always gets eaten;
  only the last-call auto-serve pays. The player who "just spins" — the v1
  player — now finishes with a Side salad and a number that explains why.

Personality spread is the bonus: the gambler line has the highest p90 in the
table and a p10 of 14. Everyone in the house will recognise who plays it.

---

## Drafts rejected on the way here

| Draft | Why not |
| --- | --- |
| **Chips and bet sizing.** Start with 100, bet 1/5/25, run ends at 0. | Picking a bet size in a fixed-odds game is picking a variance, not making a decision. To end a run the odds have to be negative, so the "game" is choosing how fast to lose. Also a real-money grammar on a page a nine-year-old opens. |
| **Hold reels.** Fruit-machine holds: lock 🥬🥬, respin the third. | Holding is never worse than a fresh spin and is up to 15× better (a held lettuce pair), so it's a rule to learn, not a choice to make. Rationing holds with tokens fixes that and turns the game into a bookkeeping puzzle at three taps a spin. |
| **The creeping snail.** A track under the reels; each spin the snail advances 0–2; bust when he reaches the bowl. | The most legible version — you can *see* the risk coming. But it moves the bust off the third reel onto a second system, and the third reel is the product. One reel-stop deciding pay-or-eat beats two things to watch. |
| **Additive wins.** Match +50, jackpot +500 into the bowl. | Measured above: luck swamps nerve. Also a jackpot at streak 1 and streak 12 pay the same, so the bowl stops mattering the moment the reels get interesting. |
| **Lives.** Three snails and the run is over. | A cautious player never busts and the run never ends — the v1 problem in a hat. Bounded means a fixed spin count. |
| **Rising snail odds** (bust chance grows with streak). | Wanted for the "getting scary" arc, but the triangular bowl already produces it with the risk left honest and flat. Nothing on reel 3 changes between spins, and the player can see that. |
| **Serve costs a spin.** | Makes the safe move expensive, so the timid player gets punished twice. Serve should be free and cheap-feeling; its real cost is the reset streak, and the sim shows that's plenty. |

What got cut from v1: lifetime points, lifetime jackpot count, the "since last
🥬" dry counter, and the instant re-arm as a throttle. The counters were stats
nobody was chasing; the throttle argument (every second between spins is a
dead second) was right for an unbounded toy and backwards for a bounded run,
where the seconds *are* the run and should be spent deciding.

---

## Reel 3 behaviour (still the important part)

The outcome is rolled before the animation starts — always from the run's
seeded stream, three draws per spin — and the game never decides mid-spin
what to show. Presentation is the only thing that reacts, and the one coin
flip presentation needs (below) comes from `Math.random()`, never from the
stream, so it can't shift anyone's reels:

- **Normal spin** (reels 1 and 2 differ): reel 3 stops at ~1.8s. That's up
  from v1's 1.4s: with a bowl on the line the last stop wants a beat.
- **Tension spin** (reels 1 and 2 match): reels 1 and 2 ring in gold, the
  status line reads `TWO 🍅 — bowl 45 on the line…`, and reel 3
  decelerates hard to land at ~3.0s with the last two symbol changes
  individually visible. The bowl is *in the sentence* — the stake is named
  before the reel stops.
- **Near-miss** (tension, and reel 3 rolled a plain miss): on half of these,
  reel 3 is made to stop one slot forward of the target so the winning
  symbol is the last thing replaced. Reel 3's ring is
  `🍅 🥕 🧀 🫒 🥬 🐌`, so one slot forward of 🥬 is the snail, which would
  turn a miss into a bust. **A lettuce near-miss lands two slots forward,
  on 🍅:** the reel crawls through the lettuce, then through the snail, then
  stops. Both the thing you wanted and the thing you feared go past. This
  rule only ever chooses which *losing* symbol shows. It can never turn a
  miss into a bust or a win, and the code should assert exactly that.
- **Tension snail.** Because 🐌 sits directly after 🥬 on the ring, every
  lettuce-pair bust shows the lettuce arrive and slide past before the snail
  settles. No special case; the strip order does it.

---

## Screen

Portrait, single view, nothing scrolls.

```
        🥬 LETTUCE SLOTS
     Daily · Sep 3            41 spins left

     ┌─────┬─────┬─────┐
     │ 🍅  │ 🍅  │ 🐌  │     <- ~72px emoji, reels 1&2 ringed
     └─────┴─────┴─────┘

        the snail ate 45

     🥗 0   ·   streak 0   ·   +1 next

          ┌───────────┐
          │  SERVE 0  │          <- dimmed at 0; the bowl is on the button
          └───────────┘
          ┌───────────┐
          │   SPIN    │          <- 72px tall, lowest, most-used
          └───────────┘

     served 138  ·  Chef's at 200 · 62 to go
```

- **Start card** (before spin 1): `Daily run · 75 spins · Your best 312 ·
  [START]`. It exists so the run has a moment it began. Free play shows
  `Free play · 75 spins · Best 288`.
- **Status line** is a fixed-height slot. States: `` / `TWO 🍅 — bowl 45 on
  the line…` / `MATCH — bowl doubled to 90` / `JACKPOT! 🥬🥬🥬 — bowl 185` /
  `the snail ate 45` / `he found an empty bowl` / `so close — one off` /
  `served 90` / `last call — served 31`.
- **Readout row** is three live numbers: the bowl, the streak, and what the
  next leaf is worth. The third one is what makes "one more" tempting in
  words rather than in theory.
- **SERVE** carries the bowl on its label, exactly as Daily Letters'
  `Commit · 2 left` does. Dimmed and inert at 0. Sits *above* SPIN: a
  mis-tap on SERVE costs a streak, a mis-tap on SPIN could cost the bowl,
  so the safe one is the one your thumb crosses first.
- **End card:**

```
         Run over — 214 served
             🥗 Chef's salad
     biggest bowl 88 · 🐌 11 · 🥬 jackpot ×1
     your daily best 312

      [ Copy result ]     [ Free play ]
```

  `Free play` opens a fresh random run; on a free run the button says
  `Play again`. The daily card is what you see for the rest of the day.
- Win, bust and serve are each signalled by **text and colour together**,
  never colour alone.

## Controls

- Two tap targets, both ≥64px tall, both at the bottom. SPIN ≥72px.
- SPIN is disabled and dimmed during a spin and re-armed the instant reel 3
  lands. SERVE is disabled during a spin as well — you can't serve a bowl
  while the reel that might eat it is still moving. That wait is the game.
- Tapping during a spin does nothing. No queueing, no skip.
- Keyboard: Space spins, S serves. Free, and it makes the sim runnable
  against the real page.

## Audio

Cheap WebAudio blips after `Arcade.boot()`; the v1 ramp plus three sounds.

- Reel stops at 440 / 554 / 659Hz, ascending. Tension tail ticks slow with
  the reel. Unchanged.
- **Match:** two rising notes. **Jackpot:** the four-note arpeggio. Unchanged.
- **Serve:** one soft note under 30, a rising triad at 30 and above. The
  bigger bowl gets the nicer sound; serving small should feel fine, not
  celebrated.
- **Snail:** two low descending notes, ~180ms — a munch, not a buzzer. The
  bust needs a sound because the bowl needs a funeral, but it's comic.
  A plain no-match stays silent, as in v1.
- Muteable via the existing 🔇 toggle.

## Session shape

- One spin = one self-contained action; serve or spin is decided between
  spins. Turn-based, pausable mid-run at no cost, no timers, no reflex.
  Fits the house default without an exception.
- **A run is 75 spins.** Estimated at 4.4–4.7 minutes in the simulation's
  timing model (1.8s normal spin, 3.0s tension spin, ~0.8s to read a result,
  ~0.8s of deliberation when the bowl is 30 or more, 1.5s for a serve or a
  snail, plus start and end cards). At 90 spins the same model gives 5.3
  minutes. Spin count is tuning knob 1 and should be set from a stopwatch on
  the real phone, not from this table.
- A run has roughly 12 snails, 5–9 serves, about two doublings and a
  jackpot on two days in five. A streak the player lets run survives to
  eight spins about one time in four, which is where the bowl (36) is big
  enough for a tension spin to be frightening — so a sharp run has three or
  four of those moments, and a timid run has none. That difference is the
  game.

## Persistence

Via `Arcade.save` / `Arcade.load`, namespaced per game already:

- `run` — the run in progress, or `null`:
  `{ mode, seed, date, spin, bowl, streak, served, biggest, snails, jackpots }`.
  Because reels are seeded (daily) or the free seed is stored, reopening
  mid-run resumes exactly: rebuild the stream, skip `spin × 3` draws, carry
  on. A phone call in the middle of a run costs nothing.
- `daily` — `{ date, served, tier, biggest, snails, jackpots }` for today.
  Stale dates are ignored, not migrated.
- **A daily `run` whose `date` isn't today is discarded on load** — not
  auto-served, not scored. Yesterday's half-run doesn't become yesterday's
  result, and it doesn't block today's. A free `run` never goes stale.
- `bestDaily`, `bestFree` — integers. Kept separate because the daily is
  comparable between people and free play isn't.
- `muted` — as before.

v1's `points`, `jackpots`, `matches`, `dry` keys are abandoned in place.
Nothing reads them; nothing needs to delete them.

## Accessibility

- Emoji at ~72px, no font requests.
- Every outcome — win, bust, serve, last call — stated in words in the
  `aria-live="polite"` status line, once.
- The bowl, streak, spins-left and next-leaf values are text, not gauges.
- Snail, match and serve are each colour *and* text *and* a distinct sound;
  no state depends on one channel.
- No hover, no drag, no precise targeting, no speed. `prefers-reduced-motion`
  shortens the reel walk to a fade and keeps the sounds and the words.

## Build checklist

- [x] Rules card on first boot (one screen: leaf, serve, snail, 75 spins)
      with a "How to play" link on the start card thereafter. Stored as
      `seenRules`.
- [x] Reel 3 strip is six slots; reels 1 and 2 stay five. Draws come from
      one `draw()` over the run's seeded stream (daily seed or a stored
      random seed) — nothing else in the file rolls an outcome.
- [x] Bowl, streak, spins-left, served, biggest, snails, jackpots in one
      `run` object; saved after every resolved spin and every serve.
- [x] Near-miss rule with the lettuce exception, and a guard that logs and
      falls back to the rolled symbol if the reindex ever changes the
      classification.
- [x] SERVE button with live label; disabled at 0 and during a spin.
- [x] Last-call auto-serve at spin 0; end card; ladder; copy-result line.
- [x] Start card for daily and free; daily reopen lands on the end card.
- [x] Serve and snail sounds; normal spin retimed to 1.8s, tension ~3.1s.
- [x] Keyboard: Space / S; Enter presses a card's primary button.
- [x] `?turbo` query flag skips all animation so the page can be driven by
      keyboard. **Measured against the shipped page, 400 free runs per
      strategy:** timid 91, streak-5 160, steady 172, sharp 190, gambler
      159, reckless 40 — every mean within 5% of the table above, snails
      12.2–13.0 per run.
- [x] `Arcade.VERSION` → 22. Blurb in `games.json` updated. No new files.
- [x] Page weight: ~25KB, no images. (The 20KB guess undercounted emoji
      and the three cards; the house budget is 500KB.)

## Tuning knobs (in the order to distrust them)

1. **Spin count (75).** The run-length dial, roughly 1:1 with minutes.
   Set it from a stopwatch on the target phone; the timing model above is
   an estimate. Move by 10, not by 1.
2. **Jackpot formula (×3 +50).** The flat part decides whether a jackpot on
   a small bowl feels like a jackpot; the multiplier decides the tail. At ×5
   the best-run ceiling goes to ~1,900 against a median under 200 and stops
   being chaseable. Leave the multiplier; move the flat part if needed.
3. **Snail odds (1 in 6).** If runs feel choppy — about 12 snails per run —
   add **one blank slot** to reel 3's strip (`·`, does nothing) for 1 in 7:
   measured, that lifts steady play from 174 to 189 and sharp from 186 to
   215 without changing the shape of the table. Don't add a second lettuce;
   that changes the jackpot odds, which are fine.
4. **Ladder rungs (100 / 200 / 300 / 450).** Set so steady play lands
   Garden most days, Chef's on a good one, Feast at p90, Legendary at p99.
   Re-derive from the table if anything above moves.
5. **Match multiplier (×2).** Below ×2 the tension spin stops being worth
   the bowl it risks; above it the doublings dominate the growth and the
   serve decision gets easier. Probably never moves.
6. **Reel 3 timings (1.8s / 3.0s).** Longer reads as slow, shorter reads as
   cheap. The v1 numbers (1.4 / 2.8) are the floor.

## Open questions

- **Should the daily show yesterday's result on the start card?** Cheap
  (`daily` already holds it) and it gives the first open of the day a
  score to beat. Probably yes; deferred until the run itself is proven.
- **A "bowl at stake" line under the reels during the crawl,** in huge
  type, separate from the status text — the number itself as the drumroll.
  Try it after playtest; the status sentence may already carry it.
- **Does the last-call all-in read as a feature or a bug?** The last six
  spins have no reason to serve. If testers feel cheated by a snail on
  spin 74, the fix is copy ("last call" on the counter), not a rule.
