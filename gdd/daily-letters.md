# Daily Letters

- **Slug:** `games/daily-letters/`
- **Emoji:** 🔤
- **Status:** designed — ready to build (word list sourcing is the one
  blocking dependency, see Build checklist)

## One-line pitch
A shared daily tile rack — everyone in the family gets the same letters and
races to weave all of them into one connected crossword before midnight.

---

## Design principle: one board, many solutions

Everyone opens the same rack. Nobody can out-luck anyone else — the only
thing that varies is how well you can arrange what you were given. That's
the whole appeal of Q-Less and the whole reason to keep this digital version
honest: no rerolls, no shuffle-for-a-better-draw, no do-over. You get today's
19 letters and you either find the arrangement or you don't.

Two consequences that drive the decisions below:

1. **The puzzle must be checkable without a human ref.** Physical Q-Less
   relies on players catching each other's mistakes. A solo phone session
   has no one to catch a fake word, so the game needs its own dictionary.
2. **A full solve is a real, rare, shareable achievement — not the expected
   outcome.** The tile draw isn't guaranteed to contain a valid 19-letter
   anagram-of-sorts every day (nothing guarantees one exists, same as a
   Scrabble bag). Some days the best possible arrangement leaves 1–3 tiles
   stranded, and that's fine — "fewest left over" is the score precisely
   because zero isn't always reachable.

---

## Rules

- Words are 3+ letters, read left-to-right or top-to-bottom only (no
  diagonals, no backwards).
- No proper nouns, no abbreviations — enforced by the bundled word list
  itself (see Word list), not by an honor system.
- Every placed tile must belong to a connected crossword: every tile is
  orthogonally adjacent to at least one other placed tile, and the whole
  placed set is one connected group (no separate islands of tiles).
- A tile sitting alone with no neighbor doesn't count as a word and blocks
  the solve.
- Goal: place every tile from the rack onto the grid, with every row-run and
  column-run of 2+ tiles reading as a valid word.

## Letters

- **19 tiles** (mid-point of the 18–20 range in the original brief — enough
  that a full solve takes real work, not so many it can't fit one screen).
- No **Q**, ever.
- Vowel target: **6 of 19** (≈32%, "near one third"). Vowels = A E I O U —
  Y is treated as a consonant for this purpose since it's drawn far less
  reliably.
- Draw procedure, seeded from `Arcade.dailySeed()` via
  `Arcade.seededRandom()` so every device produces an identical rack:
  1. Draw 6 vowels from a frequency-weighted vowel pool (E and A weighted
     heaviest, matching real English letter frequency).
  2. Draw 13 consonants from a frequency-weighted consonant pool, Q excluded.
     Rare letters (J, X, Z) stay in the pool at low weight rather than being
     banned outright — a stray Z is a fun constraint, a hand with three of
     them isn't, and the low weight keeps that from happening in practice.
  3. Shuffle the combined 19-tile rack (same seeded RNG) so tile order in
     the rack isn't alphabetical or vowels-first.
- `Arcade.dailySeed()` keys off the device's local calendar date, so the
  puzzle resets at local midnight per device — already true of every other
  daily-seed game in the arcade, not a new behavior to design around.

## Word list

The one piece this design leans on that isn't already in `shared/`: a
bundled, local word list. No dependency, no CDN, no network call — just a
static data file shipped in the game's own folder, same as any other asset.

- A single newline-separated string of lowercase words (not a JS array of
  20,000 string literals — the parse/memory overhead of one big string split
  once at load is smaller), 3+ letters, common-word corpus with proper nouns
  and abbreviations already excluded by the source list.
- Loaded into a `Set` at boot for O(1) lookup per placed run.
- Every row-run and column-run of length 2+ is re-checked after each tile
  placement: not-yet-a-word (still shorter than 3, or not in the set) reads
  as **in progress**, never as an error — you're mid-build, not wrong. A
  completed run that isn't in the word list is the only state flagged red.
- Budget: aim for ≤150KB for the word list file, which keeps the whole game
  comfortably inside the 500KB-per-game ceiling in `CLAUDE.md` alongside
  markup, CSS, and JS.

## Grid & placement

- Fixed **9×9 board**, cells sized to fill portrait width on a small phone
  (~38px each, ~342px board width) — no panning, no zooming, the whole board
  is visible at once above the rack.
- **Tap-to-place, not drag.** Tap a tile in the rack to select it (it lifts
  visually), then tap an empty grid cell to place it there. Tap a placed
  tile to pick it back up — it returns to the rack — then place it elsewhere.
  Two taps stand in for a drag, per the no-precise-dragging rule in
  `CLAUDE.md`.
- Placement direction (across vs. down) isn't chosen explicitly — it falls
  out of what's already adjacent on the grid, exactly like a real crossword
  or Bananagrams board. Placing a tile next to an existing tile just extends
  whatever run touches it.
- Unused-tile count updates live in the rack header as tiles come on and off
  the board.

## Scoring

- Primary score: **tiles left unused** at any moment — lower is better,
  visible at all times, not just at a "submit" step.
- A **full solve** (0 unused, every run a valid word, one connected group)
  triggers a small celebration state and locks in as that day's result. You
  can still keep fiddling after — rearranging is free until midnight — but
  the share card remembers your best (fewest-unused) arrangement of the day,
  not just your last one.
- Ties are expected and fine — several people hitting 0 the same day is the
  point, not a bug to resolve with a tiebreaker.

## Timing

- One puzzle per day, resets at local midnight (see Letters — inherits
  `Arcade.dailySeed()` behavior).
- No timer, no session limit. The board stays interactive all day; closing
  and reopening the tab restores exactly where you left off via
  `Arcade.save`.

## Sharing

No accounts, no backend, so sharing is a copyable text block sized for a
group chat — same spirit as a Wordle-style share square, adapted to a grid:

```
Daily Letters — Sep 3
15/19 placed · 4 words · 2 crossings

⬜⬜🟩🟩🟩⬜⬜⬜⬜
⬜⬜🟩⬜🟩⬜⬜⬜⬜
🟩🟩🟩🟩🟩⬜⬜⬜⬜
⬜⬜⬜⬜🟩⬜⬜⬜⬜
```

- The grid is cropped to the bounding box of placed tiles (not the full 9×9)
  so it reads as a compact shape in a text thread.
- 🟩 = an occupied cell, ⬜ = empty — letters themselves are never included,
  so the shape is legible but the words stay a surprise for anyone who
  hasn't solved it yet.
- A **Copy** button uses the browser's built-in Clipboard API
  (`navigator.clipboard.writeText`) — no library needed. Falls back to a
  selected, tappable `<textarea>` if the Clipboard API is unavailable.
- Screenshotting instead of copying always works too and needs nothing
  built for it.

## Screen

```
      🔤  Sep 3  ·  15/19 left to place

   ┌─────────────────────────────┐
   │ · · T A B · · · ·           │
   │ · · O · A · · · ·           │
   │ · · N E S T · · ·           │
   │ · · E · · · · · ·           │
   │ · · · · · · · · ·           │   <- 9x9 board, ~342px wide
   │ · · · · · · · · ·           │
   │ · · · · · · · · ·           │
   │ · · · · · · · · ·           │
   │ · · · · · · · · ·           │
   └─────────────────────────────┘

   ┌───┬───┬───┬───┬───┬───┬───┐
   │ R │ E │ I │ K │ D │ L │ W │      <- rack, tap to select
   └───┴───┴───┴───┴───┴───┴───┘

   [ Shuffle rack view ]   [ Share ]
```

- Board on top (fixed, whole thing visible), rack pinned below it, two
  buttons at the bottom.
- "Shuffle rack view" reorders the *unplaced* tiles cosmetically only — it
  never changes which 19 letters you got, it just helps when the leftover
  tiles cluster into an awkward run of similar letters.
- A run that completes as an invalid word gets a red underline and a small
  shake; a run in progress (too short or not yet a word) is neutral, never
  red — see Word list.

## Controls

- Tap to select a rack tile, tap to place, tap a placed tile to lift it.
  Every target ≥44px per `CLAUDE.md`.
- No drag, no swipe, no long-press, no multi-touch gestures.

## Session shape

- Turn-based and endlessly pausable — no timer pressure, matching the house
  default in `CLAUDE.md`.
- A typical sitting is a few minutes; the puzzle supports many short visits
  across the day since state persists and nothing punishes leaving mid-build.

## Persistence

Via `Arcade.save` / `Arcade.load`, namespaced per game automatically, one
`state` key per day:

- `date` — the `Arcade.dailySeed()` value this state belongs to, so a stale
  save from yesterday is detected and discarded on load rather than shown.
- `rack` — today's 19 letters, in seeded order (regenerated from the seed if
  ever missing — never trusted blindly from storage).
- `placed` — `{ letter, row, col }[]` for tiles currently on the board.
- `bestUnused` — fewest-unused count reached today, for the share card.
- `solved` — whether a full solve has been hit today (for the celebration
  state, shown once per day even if you keep rearranging after).

## Accessibility

- Every board/rack tile shows its letter as text, never as a color-only or
  icon-only cue.
- Word-state (in progress / valid / invalid) is stated via an
  `aria-live="polite"` status line in addition to color and shake, since
  color alone fails the colorblind case and shake alone fails anyone using
  a screen reader.
- Tap targets ≥44px on both board cells and rack tiles.
- No hover states, no precision dragging, no timed input anywhere.

## Assets

- `wordlist.txt`-derived data file, bundled locally, budgeted ≤150KB (see
  Word list).
- No images, no fonts, no icon requests — tiles are plain text in styled
  divs, consistent with the rest of the arcade.

## Build checklist

- [ ] Source and license-check a common-English word list (3+ letters, no
      proper nouns/abbreviations) small enough to fit the ≤150KB budget —
      this is the one real dependency the design leans on and needs to be
      resolved before the board logic can be tested end-to-end.
- [ ] `games/daily-letters/index.html` + word list data file. Self-contained
      folder, no other cross-game imports.
- [ ] Imports only `shared/arcade.css` and `shared/arcade.js`.
- [ ] `Arcade.boot()` before any gameplay; `Arcade.backButton()`.
- [ ] Tile draw: seeded, weighted, no Q, 6 vowels / 13 consonants out of 19.
- [ ] Tap-to-place / tap-to-lift interaction, no drag.
- [ ] Live run validation (in progress / valid / invalid) against the
      bundled word list.
- [ ] Connectivity check (single connected group) gates the full-solve state.
- [ ] Share-card text generation, cropped to bounding box, Clipboard API
      with `<textarea>` fallback.
- [ ] `games.json` entry (`slug`, `title`, `blurb`, `emoji`).
- [ ] Bump `Arcade.VERSION`.
- [ ] Page weight check: whole game, word list included, under 500KB.

## Tuning knobs

1. **Tile count (19) and vowel target (6/19).** The two numbers that decide
   whether most days feel solvable or most days strand several tiles.
2. **Board size (9×9).** Bigger gives more room to spread words out but
   pushes cell size down or the board off-screen on an older phone; smaller
   forces denser, harder-to-place words.
3. **Word list size/coverage.** Too permissive (a huge list) makes obscure
   words trivially available and full solves too easy; too strict frustrates
   people typing perfectly normal words that didn't make the cut.
4. **Rare-letter weighting (J/X/Z).** Currently low but nonzero — raise it
   for more "fun constraint" days, lower it toward zero if it's landing as
   "unfair" more than "fun."

## Open questions

- **Which word list corpus to bundle**, and under what license — the one
  item blocking a real build (see Build checklist).
- **Archive of past days.** Nothing in the brief mentions replaying
  yesterday's rack — worth deciding before build whether `state` only ever
  holds *today*, or whether a small history of past racks/results is worth
  the extra persistence.
- **What "share" looks like for a non-solve.** The mock above assumes any
  partial arrangement is shareable; worth confirming that's desired versus
  only allowing a share once some minimum (e.g. all tiles placed, solved or
  not) is reached.
