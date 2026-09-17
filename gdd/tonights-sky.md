# Tonight's Sky

- **Slug:** `games/tonights-sky/`
- **Emoji:** 🌌
- **Status:** shipped behind the beta flag (df21bc5, `Arcade.VERSION` 54).
  The Pocket rule was fixed in v56. This GDD was written afterwards, from
  the code. The GDD the build commit refers to never made it into the
  repo.

## One-line pitch
A daily patience game: the same 52-card deal for the whole family every
night. Clear a 21-star pyramid by chaining ranks up and down, light the
North Star, say goodnight.

---

## Lineage

Nothing here is new except the Pocket. The game combines three known
pieces:

- **The chaining rule comes from Golf / TriPeaks solitaire.** Play any
  uncovered card one rank above or below the Waste card, ignore suits, and
  let King and Ace wrap. Flip the Stock when there's no move.
- **The layout comes from Pyramid solitaire.** Six rows, 21 cards, and each
  card is covered by the two below it. Pyramid's own rule (pairs that add
  up to 13) is *not* used.
- **The shared daily deal comes from Wordle**, through the arcade's
  `Arcade.dailySeed()` convention. Everyone gets the same start, so the
  family can compare choices at dinner.
- **The Pocket is the one new mechanic.** It's a single holding cell,
  close to one FreeCell cell. Its job is to turn "flip until something
  fits" into a real choice about what to set aside for later.

## Rules

- **Deal:** a seeded 52-card shuffle. The first 21 cards form the pyramid:
  row 0 is the North Star at the tip, row 5 is the 6-card base. The other
  31 go to the Stock, and the first Stock card starts face up as the
  Waste, which leaves **30 cards in the Stock**.
- **Uncovered:** a base-row card is always uncovered. Any other card is
  uncovered once both cards below it are gone. Covered cards are dealt
  face down.
- **Play:** tap an uncovered star that's one rank from the Waste card
  (K–A wraps). It becomes the new Waste card.
- **Draw:** tap the Stock to turn over a new Waste card. Once the Stock is
  empty, it stays empty.
- **Pocket:** if the Pocket is empty, tap it (it lights up), then tap any
  uncovered star to move it off the pyramid into the Pocket. That move is
  free. The card comes back out **like any star**: tap the Pocket to put
  it on the Waste, but only when it's one rank from the Waste card. The
  Pocket is a bet that its neighbor will come up.
- **Win:** the pyramid is empty *and* so is the Pocket. The North Star is
  always the last card to leave the pyramid, because both cards under it
  have to go first.
- **Miss:** no legal move is left. The Stock is empty, the Pocket is
  full, and neither a star nor the Pocket card is next to the Waste. An
  empty Pocket never counts as stuck, since pocketing is always legal.
- **Undo is free and unlimited.** Restarting the same sky is free too.
  Nothing counts as a loss.

## Deal guarantee

`solver.js` holds the whole rules engine: `legalMoves`, `applyMove`,
`isWin` and `isStuck`, all as pure functions. `game.js` never keeps its
own copy of the state. It rebuilds the state by replaying the move log
through the same `applyMove`, so what the player can do and what the
solver checked can't drift apart. Saves, reloads and undo all rebuild the
same way.

`findSolvableDeal(seed)` runs a depth-first search capped at 25,000 nodes.
It tries play moves first, then unpocket, then pocket, then draw. If a
seed fails, it retries with `seed#1`, `seed#2` and so on, up to 200
attempts. If none of them solves, it falls back to the last one tried.

Measured 2026-09-16 with the v56 Pocket rule: all 365 dates in 2026 get
a solvable deal. 352 solve on the first seed and 13 on the second, and
the whole year takes ~1.1s under node. 297 of 300 random deals can be
won at all.

## Controls / interaction

- Everything is a tap: a star, the Stock, the Pocket, Undo. No drag, no
  swipe, no long-press.
- The piles sit in a thumb bar at the bottom: **Stock** (with a count),
  **Waste**, **Pocket**.
- **Glow hints** are on by default and can be turned off in the help
  sheet. Legal plays glow, the Pocket glows once its card can come out,
  and once the Pocket is armed, pocketable stars glow too.
- Tapping a card that can't move shows a short hint instead of an error:
  "Needs to be next to the 7" (for a star or the Pocket) or "Tap the
  Pocket first…".
- Teaching happens through captions, not a tutorial. The first caption is
  "Tap a star one above or below the 7". The first time there's no direct
  play, a one-time caption says "You can pocket a card for later."
- Cards scale between 52 and 64px wide to fit the screen, so star targets
  stay above 44px. The top-right corner stays clear for the ☰ menu and the
  pinned restart button.

## Session shape

- Turn-based and pausable. There's no timer.
- A sitting is a few minutes: about 21 plays plus some draws.
- One daily sky per local day. Opening the game after midnight (or
  switching back to the tab) deals the new sky, with no penalty for last
  night. Visibility changes trigger a reload.
- **Practice skies** ("Another sky") use a random seed, go through the
  same solvability check, and never touch daily stats.

## The peak

- **Win:** the result screen draws the pyramid as a constellation. Lines
  light up row by row from the base to the tip, 420ms per row. The North
  Star flares last, then the constellation's name fades in. The name is
  picked from a bank of 84 homely names in `names.js` ("The Kettle",
  "Grandmother's Chair"), seeded from the day, so the whole family sees
  the same name. A rising four-note chime plays, and confetti fires if you
  had 15+ cards to spare or tied your best. Then "Solved · N cards to
  spare", a stats card, and a sign-off: "Goodnight." after 9pm, "See you
  tonight." before.
- **Miss:** "N stars short. Same sky, try again?" with Undo, Try again,
  and Another sky. The miss screen names how close you got instead of
  calling it a loss.
- With reduced motion (`Arcade.reducedMotion()`), or when a solved day is
  reopened, the finished constellation shows without the animation.

## Scoring / persistence

**Score: cards to spare**, the Stock cards left unturned when the sky is
cleared. Higher is better, and a solve with more to spare is the better
solve. The ceiling is 30, but a real deal's best possible score is far
lower and changes from night to night: from 5 to 22 across the first 40
dailies of 2026, found by exhaustive search. A simple bot that plays any
match and otherwise draws wins ~60% of dailies, with a median of 6 to
spare. That gap between a win and a great win is what the family argues
about.

Saved under one `Arcade.save("save")` object:

- `settings` — `{ glow, sound }`. Sound is off by default. Tones play
  through `Arcade.audioCtx`.
- `current` — `{ seed, moves[], practice, dateKey }`. The live sky as a
  move log. A daily from an earlier date gets replaced when loaded.
- `days[date]` — `{ solved, spare }`. Only the **first** daily solve is
  recorded. Later solves of the same day don't change it.
- `playedDates[date]` — set on the first move of any sky, practice
  included.
- `best` — the best spare on a daily.
- `seenCaption`, `seenPocketHint` — one-time teaching flags.

Shown in three places: `Arcade.stats` (nights played, dailies solved, best
to spare), `Arcade.brag` ("✦ Solved · N to spare"), and the **"Your sky"
archive**. The archive draws each night played as a star at a spot seeded
by its date. Solved nights shine brighter, and tapping a star shows that
night's result. **Share** sends "Tonight's Sky · Sep 16 · ✦ Solved, 12 to
spare".

## House-rule wiring

- `Arcade.boot(start)`, `Arcade.backButton()`, and
  `Arcade.menuButton({ help, describeSave, actions })`. Help opens the
  in-game sheet with the rules and the glow/sound toggles.
- Pinned action **"Try tonight's sky again"**, with a confirm. `show` is
  true while a daily has moves and no result screen is up. `nudge` is true
  while the daily is stuck.
- Page weight is ~47KB for all five files, with no images or fonts.

## Accessibility notes

- Every card shows its rank and suit as text. Red/black is extra, never
  the only signal.
- The caption and hint lines use `aria-live="polite"`.
- Glow hints can be switched off by players who want to find moves
  themselves.
- The constellation animation respects reduced motion.

## Open questions

### 1. Resolved (v56): the Pocket was a free delete button

At launch, a card could leave the Pocket without a rank check, so
pocket-then-unpocket removed any uncovered star. Every deal was won with
30 to spare without drawing (1,000 of 1,000 simulated deals). Adding a
rank check only when pocketing wouldn't have fixed it. The fix is one
rule: the pocketed card leaves only when it's one rank from the Waste.
After the change, that loop wins 0 of 1,000 deals. Saves from v1 had
their scores, solved days and in-progress sky reset on load. Nights
played and settings were kept.

### 2. The pinned restart's `nudge` can never show

`nudge` requires `isStuck` *and* a hidden result screen. But being stuck
opens the miss screen right away, and that screen can only be closed by
undoing or restarting. So the button never lights up. It should instead
fire on a *lost cause*: a position the solver can't finish from, checked
with a small budget, even though moves are still available. That's the
stale-run case CLAUDE.md describes, and it's more useful than the literal
dead end.

### 3. "Current run" in the archive shows nights played

The archive's "Current run" row just repeats the total nights played.
Either calculate a real streak of consecutive nights or cut the row.
Cutting it matches "cut before adding".

### 4. How it stacks up against the Design section

- **Depth per rule:** there are three verbs plus the Pocket. The
  decisions: which neighbor to take when two are showing, which blocker
  to pocket and bet on, when to draw. The best possible score varies
  from 5 to 22 a night, so there's room at the top.
- **Anticipation:** the constellation cascade is a good peak. During play
  there's no moment that builds toward it. Ideas that deepen what's
  already there instead of widening the game: turn over the Stock card
  with a short delay once the pyramid is down to its last few stars, and
  make the North Star's tap its own sound, separate from the win chime.
- **Variable payout:** the payout is fixed: same animation, one chime,
  confetti at a threshold. Scaling the cascade with cards to spare (for
  example, more of the sky lighting up) would vary the size of the reward
  without adding rules.
- **End on the peak:** the win screen shows the peak. The miss screen
  shows how close you got but not your best position in that sky. "You
  got within 2 stars" is the peak of a missed run.
