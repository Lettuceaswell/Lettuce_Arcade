# Lettuce Slots

- **Slug:** `games/lettuce-slots/`
- **Emoji:** 🥬
- **Status:** **v4 shipped (v26)** — two modes on one page. **Spin** is v1
  restored verbatim: lifetime points, jackpots, matches, the dry counter, no
  bunny. **Run** is the 75-spin bowl game, now with no daily: play as many as
  you like, one best. The rules live behind the shared ☰ menu at all times
  and the three-line short version stays on the start card. The v1
  post-mortem is kept below; read it now as a division of labour rather than
  an indictment. Spin is allowed to have no stakes because Run has all of
  them.

## One-line pitch
Spin for the points, or make a run. In a run every spin adds to a salad
bowl. Serve it and it's yours; spin again and it grows faster — unless the
bunny on the third reel gets there first.

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

## Modes

A pill under the title, `Spin | Run`, at the top of the page and far from
the thumb. Each half is a 44px target. First boot opens on Spin; after that
the page opens wherever it was left (`uiMode`). The pill is inert while a
reel is moving.

### Spin

v1, verbatim. Reels, the SPIN button, and two lines of lifetime stats:
`3 jackpots · 41 matches` and `2,614 pts · 87 since last 🥬`. One point a
spin, fifty for a match, five hundred for 🥬🥬🥬. Points only ever go up.

- Reel 3 is the **five-symbol** strip here — no bunny. Match odds 1 in 25,
  jackpot 1 in 125, exactly v1. Reels are rolled from `Math.random`; there
  is no run and nothing at stake, so the seeded stream is never touched.
- The same crawl, the same near-miss rule (without the lettuce exception,
  which only exists because of the bunny), the same tones.
- **The stats are v1's keys**, `points` / `jackpots` / `matches` / `dry`,
  which v2 abandoned in place and never deleted. Every phone that played v1
  gets its lifetime totals back the moment v4 loads. Nothing to migrate.
- v3 shipped Spin as a numberless toy with a happy bunny for a week. The
  household verdict was "'twas good how it was," and it was: the counter
  that only goes up is the dopamine, not the crawl alone. Cut without
  regret; the numbers-free variant is in the drafts table.
- A tap during a spin does nothing, exactly as in Run. Slam-to-stop was
  considered and cut (drafts table below): the crawl is the product, and a
  mashing kid would skip every crawl.

### Run

The v2 game, its rules unchanged, **its daily gone** (v4). A run is a run:
start one whenever you like, as many as you like, one best. Switching to
Run picks up wherever the run was: a run in progress shows its resume card,
otherwise the start card. Switching to Spin closes any card and leaves the
run saved exactly where it is, so flicking the pill back and forth can't
lose anything.

What the daily bought was comparison on identical reels and a shared
jackpot spin. What replaced it is the ladder: "I got Feast" is the sentence
the family texts, so the copy-result button stays. The `bestDaily` and
`bestFree` keys fold into one `best` (the higher of the two) on first load.

### Menu

The shared ☰ (see `CLAUDE.md`) holds the full five-line rulebook, openable
at any time except mid-spin, and the save reset. The start card keeps its
three lines because they cost zero taps; the menu carries the long version
for whoever asks, including match and jackpot. Reset wipes the lifetime
stats, the best, and any run in progress, and the confirmation says so in
numbers.

The one exposure: a small child already in Run, past the start card, can
spin away a daily. Accepted rather than locked — the start card is one tap
and the pill is out of reach, and that's as much fence as a family arcade
wants.

## Rules

### Reels

- Reels 1 and 2: five symbols, uniform: 🍅 🥕 🧀 🫒 🥬
- Reel 3: **six** slots, uniform: 🍅 🥕 🧀 🫒 🥬 **🐰**

v2 shipped this symbol as a snail 🐌. v3 made it a bunny: bunnies eat
lettuce, snails only threaten to, and in Spin mode the same symbol has to be
lovable. Everything below that says "bunny" was designed and measured as
the snail; nothing about the odds or the strip order changed.

The strips are deliberately asymmetric (real machines do this). The bunny
lives only on reel 3, so a bust is always decided at the last reel-stop, at
the end of the deceleration, in the same moment a win is. Outcomes per spin:

| Outcome | Odds | Effect |
| --- | --- | --- |
| 🐰 on reel 3 | 1 in 6 (16.7%) | **Bust.** Bowl → 0, streak → 0. |
| 3 × 🥬 | 1 in 150 (0.67%) | **Jackpot.** Bowl ×3, then +50. |
| 3 of anything else | 1 in 37.5 (2.7%) | **Match.** Bowl ×2. |
| Reels 1 & 2 match | 1 in 5 (20%) | **Tension spin** — reel 3 crawls. |
| Anything else | the rest | Just the leaf (below). |

Given a tension spin, reel 3 lands: match 1/6, bunny 1/6, miss 4/6. The
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
- A bunny landing on an empty bowl takes nothing and resets nothing — "he
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

### One run at a time

- A run draws a random seed string once at the start and stores it, then
  draws three numbers per spin from `Arcade.seededRandom` keyed on it, and
  nothing else from the stream. Reopening mid-run resumes exactly: rebuild
  the stream, skip `spin × 3` draws, carry on. A phone call in the middle of
  a run costs nothing.
- **Copy result** on the end card writes one line to the clipboard:
  `🥬 Lettuce Slots · 214 served · Chef's salad · biggest bowl 88 · 🐰 11`
  Text only, no canvas — the score line is the whole story. Same
  `navigator.clipboard` call and `<textarea>` fallback as Daily Letters.
- v2 and v3 had a daily run on `Arcade.dailySeed()` with a practice run
  beside it. Cut in v4; the reasoning is under Modes → Run above.

### Measured

10,000 simulated 75-spin runs per strategy against the rules above
(`match ×2`, `jackpot ×3 +50`, bunny 1/6, triangular growth):

| Strategy | Mean | p10 | Median | p90 | p99 | Bunnies | Serves |
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
| **The creeping bunny.** A track under the reels; each spin the bunny advances 0–2; bust when he reaches the bowl. | The most legible version — you can *see* the risk coming. But it moves the bust off the third reel onto a second system, and the third reel is the product. One reel-stop deciding pay-or-eat beats two things to watch. |
| **Additive wins.** Match +50, jackpot +500 into the bowl. | Measured above: luck swamps nerve. Also a jackpot at streak 1 and streak 12 pay the same, so the bowl stops mattering the moment the reels get interesting. |
| **Lives.** Three bunnies and the run is over. | A cautious player never busts and the run never ends — the v1 problem in a hat. Bounded means a fixed spin count. |
| **Rising bunny odds** (bust chance grows with streak). | Wanted for the "getting scary" arc, but the triangular bowl already produces it with the risk left honest and flat. Nothing on reel 3 changes between spins, and the player can see that. |
| **Serve costs a spin.** | Makes the safe move expensive, so the timid player gets punished twice. Serve should be free and cheap-feeling; its real cost is the reset streak, and the sim shows that's plenty. |
| **Numberless Spin** (v3: no counter at all, a happy hopping bunny). | Shipped for a week. Verdict from the house: "'twas good how it was." The lifetime counter that only goes up *is* the dopamine of the toy; without it the crawl is a screensaver. v1's economy restored in v4. |
| **The daily run** (v2–v3: everyone gets the same 75 reels). | Cut in v4. Nobody was comparing on the day, and the daily gate ("reopening lands on the end card") read as a lockout on a toy. One best and the ladder do the comparing now. |
| **Slam-to-stop in Spin mode** (v3: a tap mid-spin lands the reels now). | Wanted so every toddler tap does something. Cut: Spin has no stakes, so the crawl is the entire product there, and slam lets a mashing kid skip every crawl. Revisit only if the mode tests as boring, not as slow. |
| **Four symbols instead of five** (v3: shorter runs, more jackpots). | Measured. Without a blank slot the bunny goes to 1 in 5 and sharp-vs-steady on the same reels drops from 61% to 52% — a coin flip. With a blank it works (tuning knob 3) but buys no play time, because time is spins × seconds, not symbols. |

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
  `🍅 🥕 🧀 🫒 🥬 🐰`, so one slot forward of 🥬 is the bunny, which would
  turn a miss into a bust. **A lettuce near-miss lands two slots forward,
  on 🍅:** the reel crawls through the lettuce, then through the bunny, then
  stops. Both the thing you wanted and the thing you feared go past. This
  rule only ever chooses which *losing* symbol shows. It can never turn a
  miss into a bust or a win, and the code should assert exactly that.
- **Tension bunny.** Because 🐰 sits directly after 🥬 on the ring, every
  lettuce-pair bust shows the lettuce arrive and slide past before the bunny
  settles. No special case; the strip order does it.

---

## Screen

Portrait, single view, nothing scrolls. The pill sits under the title in
both modes. In Spin mode the counter and SERVE are hidden and the readout
and footer carry the lifetime stats: title, pill, three reels, a status
line, two stat lines, one button.

```
        🥬 LETTUCE SLOTS
          [ Spin | Run ]
              41 spins left

     ┌─────┬─────┬─────┐
     │ 🍅  │ 🍅  │ 🐰  │     <- ~72px emoji, reels 1&2 ringed
     └─────┴─────┴─────┘

        the bunny ate 45

     🥗 0   ·   streak 0   ·   +1 next

          ┌───────────┐
          │  SERVE 0  │          <- dimmed at 0; the bowl is on the button
          └───────────┘
          ┌───────────┐
          │   SPIN    │          <- 72px tall, lowest, most-used
          └───────────┘

     served 138  ·  Chef's at 200 · 62 to go
```

- **Start card** (before spin 1): `75-spin run · your best 312 · [START]`,
  and under the button the short rulebook, three lines, no gate and no
  "Got it":
  - Every spin adds more than the last.
  - The 🐰 eats the bowl. SERVE keeps it.
  - 75 spins. Whatever's left at the end is served.

  Match and jackpot aren't in the list; the status line explains them the
  moment they happen (`MATCH — bowl doubled to 90`), and the ☰ menu has the
  full five lines for anyone who wants them first. "Adds more than the
  last" was chosen over "is worth more points than the last" because the
  second is false after a serve or a bunny, and a nine-year-old will notice.
- **Coaching, first run only.** On the first three leaves of a streak in
  the first run this device has ever played, the leaf status is replaced by
  `+1 · every spin adds more than the last`, `+2 · SERVE keeps the bowl`,
  `+3 · the 🐰 eats it. Serve, or spin?`. Keyed on the streak, not the spin,
  so an early bunny (which explains itself: `he found an empty bowl`)
  doesn't cancel the lesson. Stops for good once a streak reaches three or
  ten spins have gone by. Teaching by doing beats any card; it costs one
  flag.
- **Status line** is a fixed-height slot. States: `` / `TWO 🍅 — bowl 45 on
  the line…` / `MATCH — bowl doubled to 90` / `JACKPOT! 🥬🥬🥬 — bowl 185` /
  `the bunny ate 45` / `he found an empty bowl` / `so close — one off` /
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
     biggest bowl 88 · 🐰 11 · 🥬 jackpot ×1
     your best 312

      [ Copy result ]     [ Play again ]
```

  `Play again` opens a fresh random run. When the run just finished is the
  best, the best line reads `a new best` instead of a number.
- Win, bust and serve are each signalled by **text and colour together**,
  never colour alone.

## Controls

- Two tap targets, both ≥64px tall, both at the bottom. SPIN ≥72px.
- SPIN is disabled and dimmed during a spin and re-armed the instant reel 3
  lands. SERVE is disabled during a spin as well — you can't serve a bowl
  while the reel that might eat it is still moving. That wait is the game.
- Tapping during a spin does nothing. No queueing, no skip. The mode pill
  is disabled while a reel is moving, in both modes.
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
- **Bunny:** two low descending notes, ~180ms — a munch, not a buzzer. The
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
  bunny, plus start and end cards). At 90 spins the same model gives 5.3
  minutes. Spin count is tuning knob 1 and should be set from a stopwatch on
  the real phone, not from this table.
- A run has roughly 12 bunnies, 5–9 serves, about two doublings and a
  jackpot on two days in five. A streak the player lets run survives to
  eight spins about one time in four, which is where the bowl (36) is big
  enough for a tension spin to be frightening — so a sharp run has three or
  four of those moments, and a timid run has none. That difference is the
  game.

## Persistence

Via `Arcade.save` / `Arcade.load`, namespaced per game already:

- `run` — the run in progress, or `null`:
  `{ seed, spin, bowl, streak, served, biggest, bunnies, jackpots, coach }`.
  A v2 `run` still holding `snails` is read as `bunnies`; a v2/v3 run's
  `mode` and `date` are ignored and the run simply resumes.
  Because the seed is stored, reopening
  mid-run resumes exactly: rebuild the stream, skip `spin × 3` draws, carry
  on. A phone call in the middle of a run costs nothing.
- `best` — integer, the one best. On first v4 load it is the highest of
  itself, `bestDaily` and `bestFree`; the two old keys are then ignored.
- `points`, `jackpots`, `matches`, `dry` — Spin mode's lifetime stats,
  v1's keys, live again.
- `muted` — as before.
- `uiMode` — `"spin"` or `"run"`; where the pill was last left.
- `coached` — `true` once the first run's three coaching lines have shown.

Abandoned in place, never deleted: v2's `seenRules`, `daily`, `bestDaily`,
`bestFree`. The shared reset (☰ → Reset) is the only thing that removes
keys, and it removes all of them.

## Accessibility

- Emoji at ~72px, no font requests.
- Every outcome — win, bust, serve, last call — stated in words in the
  `aria-live="polite"` status line, once.
- The bowl, streak, spins-left and next-leaf values are text, not gauges.
- Bunny, match and serve are each colour *and* text *and* a distinct sound;
  no state depends on one channel.
- No hover, no drag, no precise targeting, no speed. `prefers-reduced-motion`
  shortens the reel walk to a fade and keeps the sounds and the words.

## Build checklist

- [x] ~~Rules card on first boot with a "How to play" link thereafter.~~
      Cut in v3: three rule lines on the start card, no gate. `seenRules`
      is abandoned in place.
- [x] Reel 3 strip is six slots; reels 1 and 2 stay five. Draws come from
      one `draw()` over the run's seeded stream (daily seed or a stored
      random seed) — nothing else in the file rolls an outcome.
- [x] Bowl, streak, spins-left, served, biggest, bunnies, jackpots in one
      `run` object; saved after every resolved spin and every serve.
- [x] Near-miss rule with the lettuce exception, and a guard that logs and
      falls back to the rolled symbol if the reindex ever changes the
      classification.
- [x] SERVE button with live label; disabled at 0 and during a spin.
- [x] Last-call auto-serve at spin 0; end card; ladder; copy-result line.
- [x] Start card for daily and free; daily reopen lands on the end card.
- [x] Serve and bunny sounds; normal spin retimed to 1.8s, tension ~3.1s.
- [x] Keyboard: Space / S; Enter presses a card's primary button.
- [x] `?turbo` query flag skips all animation so the page can be driven by
      keyboard. **Measured against the shipped page, 400 free runs per
      strategy:** timid 91, streak-5 160, steady 172, sharp 190, gambler
      159, reckless 40 — every mean within 5% of the table above, bunnies
      12.2–13.0 per run.
- [x] `Arcade.VERSION` → 22. Blurb in `games.json` updated. No new files.
- [x] Page weight: ~25KB, no images. (The 20KB guess undercounted emoji
      and the three cards; the house budget is 500KB.)

### v3

- [x] `Spin | Run` pill under the title; `uiMode` remembered; first boot
      opens on Spin.
- [x] Spin mode: `body.mode-spin` hides sub, readout, SERVE and footer;
      `toyDraw()` rolls from `Math.random`; `resolveToy()` shows words,
      never numbers; the bunny hops (`.reel.hop`, off under reduced motion).
- [x] Bunny → bunny everywhere: strip, ring class, copy, result line, sound
      (three crunches; plus a chirp in Spin). Save key `bunnies` → `bunnies`,
      with a read-side fallback for a v2 run or daily result in storage.
- [x] Rules card and `seenRules` gone; `RULES` (three lines) on the start
      card under START, only when not resuming.
- [x] First-run coaching: `COACH` lines replace the leaf status on the first
      three leaves of a streak in the first run ever; `coached` saved once a
      streak reaches three or ten spins pass.
- [x] "Free play" → "Practice run" in every label; keys unchanged.
- [x] Verified with `?turbo` and scripted input: every Spin outcome, the
      start-card rules, mode switching mid-run (run resumes at the same
      spin), a full 75-spin run to the end card, and the saved daily result.
- [x] `Arcade.VERSION` → 24. Blurb in `games.json` updated. No new files.
      Page weight ~28KB.

### v4

- [x] Daily gone: no `dailySeed`, no `daily` key, no date logic. `newRun()`
      always draws a random seed; `loadRun()` resumes any run.
- [x] One `best`, seeded from the higher of `bestDaily` / `bestFree`.
- [x] Spin mode = v1: five-symbol reel 3, `points`/`jackpots`/`matches`/`dry`
      in the readout and footer, +1 / +50 / +500, saved after every spin.
      The bunny, its hop, its pink ring and its chirp are gone from Spin.
- [x] `Arcade.menuButton({ rules: HELP, canOpen: !spinning, describeSave })`
      — five-line rulebook, reset with the lifetime stats named.
- [x] Mute button moved to `right: 60px` for the shared menu.
- [x] `Arcade.VERSION` → 26.

## Tuning knobs (in the order to distrust them)

1. **Spin count (75).** The run-length dial, roughly 1:1 with minutes.
   Set it from a stopwatch on the target phone; the timing model above is
   an estimate. Move by 10, not by 1. **Measured for v3** (4,000 runs per
   strategy, paired on the same reels, which is what a shared daily
   compares):

   | Spins | Steady mean | Sharp beats steady | Steady beats timid | Days with a jackpot | Minutes (model) |
   | --- | --- | --- | --- | --- | --- |
   | 30 | 68 | 53% | 93% | 18% | 1.8 |
   | 50 | 114 | 59% | 98% | 27% | 2.9 |
   | 75 | 173 | 61% | 99% | 39% | 4.3 |
   | 100 | 231 | 62% | 100% | 48% | 5.8 |
   | 150 | 348 | 64% | 99% | 63% | 8.6 |

   Below 50 the daily is a coin flip between two decent players; above 75
   the separation barely moves. The thing more spins keep buying is jackpot
   days — and on a daily the jackpot lands on the same spin for everyone,
   so that's the water-cooler moment. 75 is on the flat part of the curve
   with two jackpot days in five. Go to 60, never 50, if the stopwatch says
   runs drag.
2. **Jackpot formula (×3 +50).** The flat part decides whether a jackpot on
   a small bowl feels like a jackpot; the multiplier decides the tail. At ×5
   the best-run ceiling goes to ~1,900 against a median under 200 and stops
   being chaseable. Leave the multiplier; move the flat part if needed.
3. **Bunny odds (1 in 6).** If runs feel choppy — about 12 bunnies per run —
   add **one blank slot** to reel 3's strip (`·`, does nothing) for 1 in 7:
   measured, that lifts steady play from 174 to 189 and sharp from 186 to
   215 without changing the shape of the table. Don't add a second lettuce;
   that changes the jackpot odds, which are fine. If the ask is *shorter
   runs with more jackpots*, the measured recipe is **four symbols on every
   reel plus a blank on reel 3, at 60 spins**: bunny stays 1 in 6, jackpot
   goes to 1 in 96, a jackpot lands on 45% of days (38% now), skill
   separation holds at 60%, and a run models at 3.5 minutes against 4.3.
   Steady mean drops from 173 to 152, so re-derive the ladder if you do it.
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
- **Do the three rule lines survive a week?** If nobody reads those
  either, cut them and let the coaching carry it alone. The long version is
  in the menu now, so the start card can afford to lose them.
- **Does the last-call all-in read as a feature or a bug?** The last six
  spins have no reason to serve. If testers feel cheated by a bunny on
  spin 74, the fix is copy ("last call" on the counter), not a rule.
