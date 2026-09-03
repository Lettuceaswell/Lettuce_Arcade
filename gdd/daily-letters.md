# Daily Letters

- **Slug:** `games/daily-letters/`
- **Emoji:** 🔤
- **Status:** shipped (v18) — honor system, Commit ceremony, one Reopen,
  canvas share card

## One-line pitch
A shared daily tile rack — everyone in the family gets the same letters,
weaves as many as they can into one crossword, and commits their board for
a screenshot the group chat can judge.

---

## Design principle: one board, many solutions, no referee

Everyone opens the same rack. Nobody can out-luck anyone else — the only
thing that varies is how well you arrange what you were given. No rerolls,
no shuffle-for-a-better-draw, no do-over. You get today's 19 letters and
you either find the arrangement or you don't.

**The game does not check words.** This is an honor system, exactly like
the physical Q-Less it's modelled on. Three reasons:

1. **A dictionary is the wrong judge for a family.** Any bundled word list
   is either too permissive (obscure two-letter Scrabble words nobody
   knows) or too strict (a perfectly normal word that didn't make the
   cut). The family already knows what counts.
2. **Transparency beats validation.** Instead of the game saying "valid",
   the game shows *everything* — the lettered board and every run it
   contains — and the people in the chat do the judging. Cheating is
   possible and immediately visible, which is the same social contract as
   the physical game.
3. **It costs nothing.** No word list means no licensing question, no
   150KB data file over cell data, and a game that fits in a few KB.

Two consequences that drive the decisions below:

- **A full solve is a real, rare, shareable achievement — not the
  expected outcome.** The tile draw isn't guaranteed to contain a valid
  19-letter arrangement every day. Some days the best honest board leaves
  1–3 tiles stranded, and that's fine — "fewest left over" is the score
  precisely because zero isn't always reachable.
- **Commit is the moment.** Because nothing is validated live, the game
  has no natural "you won" trigger. The player supplies it by pressing
  Commit, and that press is where the ceremony and the share card live.

---

## Rules (honor system)

These are the rules the family agrees to, shown once on a "How to play"
sheet. The game enforces only the geometry (adjacency and connectivity);
the words are on you.

- Words are 3+ letters, read left-to-right or top-to-bottom only (no
  diagonals, no backwards).
- No proper nouns, no abbreviations.
- Every placed tile must belong to one connected crossword: every tile is
  orthogonally adjacent to at least one other placed tile, and the whole
  placed set is a single group. The game *does* count islands and shows
  it, because that's pure geometry and needs no dictionary.
- Goal: place every tile from the rack. Fewest left over wins.

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
  2. Draw 13 consonants from a frequency-weighted consonant pool, Q
     excluded. Rare letters (J, X, Z) stay in the pool at low weight rather
     than being banned outright — a stray Z is a fun constraint, a hand
     with three of them isn't, and the low weight keeps that from
     happening in practice.
  3. Shuffle the combined 19-tile rack (same seeded RNG) so tile order in
     the rack isn't alphabetical or vowels-first.
- `Arcade.dailySeed()` keys off the device's local calendar date, so the
  puzzle resets at local midnight per device — already true of every other
  daily-seed game in the arcade.

## Grid & placement

- Fixed **8×8 board**, cells sized to fill portrait width — ~44px each on
  a 375px-wide iPhone, which is the smallest that clears the 44px
  tap-target rule in `CLAUDE.md` (nine columns would come in under it).
  No panning, no zooming, the whole board is visible at once above the
  rack. 64 cells is plenty for 19 tiles; a 9-letter word is the only
  thing the board can't hold, and that's a rare loss.
- **Tap-to-place, not drag.** Tap a tile in the rack to select it (it
  lifts visually), then tap an empty grid cell to place it there. Tap a
  placed tile to pick it back up — it returns to the rack — then place it
  elsewhere. Two taps stand in for a drag, per the no-precise-dragging
  rule in `CLAUDE.md`.
- Placement direction (across vs. down) isn't chosen explicitly — it falls
  out of what's already adjacent, exactly like a real crossword or
  Bananagrams board.
- **Anything goes anywhere.** The game never refuses a placement. A tile
  floating alone is allowed; it just shows up in the island count.
- Live readouts in the header, updating on every tap:
  - **Tiles left** (the score — see Scoring).
  - **Islands** — number of disconnected groups. Shown only when > 1, as a
    quiet amber pill, never a modal. "1 group" is the target and is
    implied by the pill's absence.
- **Runs list** under the board: every row-run and column-run of 2+
  letters, extracted mechanically and listed as plain text ("TAB · NEST ·
  TONE · AS"). No validity colouring — it's a mirror, not a judge. This is
  the transparency layer: whatever's on the board is spelled out for the
  screenshot.

## Commit & ceremony

Commit is the game's one real decision and its only payoff moment.

- A **Commit** button sits below the rack. It's always enabled (you can
  commit a 12-left board if that's your honest best), and its label
  carries the score it would lock in: **"Commit · 2 left"**. When the
  rack empties it changes to **"Commit · Clean rack"** and pulses.
- Tapping Commit opens a one-line confirm sheet — "Lock in 2 left for
  today? You can reopen once." — because commit **locks the board**. The
  choice between locking in a 1-left board now or grinding for 0 is where
  the tension lives (see Scoring).
- **One Reopen per day** is the safety hatch. The share card carries a
  small "Reopen board" link. Tapping it returns to play with the board
  exactly as committed; the second Commit's confirm sheet reads "Lock in
  1 left? This one's final." and the link is gone after that. One
  mulligan covers the mis-tap and the spotted-it-a-minute-later case
  without dissolving the lock-in decision — the second press is the real
  one.
- Streaks count from the *first* commit of the day, so reopening never
  risks a streak. The card always reflects the latest commit.
- On confirm, the **ceremony** plays, and it's built as a reveal even
  though the player already knows the score:
  1. The rack and buttons slide away; the board recentres.
  2. Placed tiles flip face-down then face-up one at a time in placement
     order (~40ms each, ~0.8s total for a full board). This is the
     drumroll — a short, uncertain-feeling interval between the press and
     the payoff, same trick as the third reel in Lettuce Slots.
  3. The runs list types itself out under the board.
  4. The score stamps in last, big: **"2 left"** or **"CLEAN RACK"**, with
     a short `Arcade.audioCtx` chime scaled to the result (a single note
     for a commit, a rising triad for a clean rack) and a confetti burst
     on a clean rack only.
  5. The screen settles into the **share card** (see Sharing) and stays
     there. Reopening the game later that day lands straight on the card.
- Boards not committed by local midnight simply expire with no result
  (see Persistence). The nudge for this is soft: after the first tile is
  placed, the header date gains a "commits at midnight" subtitle.

## Scoring

**Primary: tiles left.** Lower is better. 0 is a **Clean rack**. This is
the honest Q-Less score and the only number the family ranks by. It's
shown at all times in the header, not just at commit.

**Secondary, on the card only (never summed into the score):**

- **Words** — count of runs of 3+ letters. Fewer words for the same tiles
  placed is the elegant board (a clean rack in 4 words beats one in 7),
  the same way Wordle's "in 3" beats "in 5". Runs of exactly 2 are listed
  in the runs list for scrutiny but don't count as words.
- **Longest word** — the single most bragged-about stat in physical
  Q-Less, and free to compute.
- **Groups** — should read "1". Anything else is a visible asterisk on
  the board.

**Streaks, across days:**

- **Commit streak** — consecutive local days with a committed board, any
  score. Missing a day resets it.
- **Clean streak** — consecutive committed days at 0 left.

Both live on the card as a small line ("🔥 6-day streak · 2 clean") and
in the header on the next day's fresh board, so yesterday's result is
the first thing you see.

### Where the tension lives

Tiles-left on its own is flat: deterministic, no variable reward, and the
player knows the number before Commit. The dopamine in this game isn't in
the payout — it's in three places the design puts pressure on:

1. **The last two tiles.** At 2–3 left, most of the board is fixed and
   every move is a live gamble on whether one more crossing exists. This
   is the maximum-uncertainty interval, the same spot the third reel
   occupies in Lettuce Slots. The header counter and the Commit label
   both tick down in real time so the player *feels* each drop.
2. **Lock in or keep going.** Commit locking the board turns "1 left"
   into a decision: bank it, or risk an evening of shuffling for a clean
   rack you might not find. Loss aversion on the streak (a missed commit
   resets it) pushes people to bank; the clean-rack chime and confetti
   pull them to push on. The single Reopen softens the first press but
   makes the second one carry full weight.
3. **The reveal delay.** Even a known score gets a ~1s drumroll before
   it stamps in. Slot machines pay out coins one at a time for the same
   reason.

What it deliberately doesn't do: hand out points for placing tiles,
escalating multipliers, or per-word scoring. Those would make a nonsense
board with 19 placed score higher than an honest board with 2 left, and
the honor system only works if the score can't be gamed *within* the
rules.

## Timing

- One puzzle per day, resets at local midnight (inherits
  `Arcade.dailySeed()` behavior).
- No timer, no session limit. The board stays interactive all day until
  committed; closing and reopening the tab restores exactly where you left
  off via `Arcade.save`.

## Sharing

The screenshot *is* the celebration, so the game's job is to make sure
what's on screen after Commit is worth screenshotting and easy to send.

**The share card** (the post-commit screen):

```
   ┌──────────────────────────────┐
   │  🔤 Daily Letters · Sep 3    │
   │  Lev                         │
   │                              │
   │   · · T A B · · · ·          │
   │   · · O · A · · · ·          │
   │   · · N E S T · · ·          │   <- lettered board, cropped
   │   · · E · · · · · ·          │      to bounding box + 1 cell
   │                              │
   │   TAB · TONE · NEST · AS     │   <- every run, for the judges
   │                              │
   │        ✨ CLEAN RACK ✨       │
   │   19/19 · 4 words · longest 4│
   │   🔥 6-day streak · 2 clean  │
   └──────────────────────────────┘

        [ Share ]     [ Copy text ]
```

- **Letters are shown, not hidden.** Transparency is the point — the
  family judges the words. This is a spoiler for anyone who hasn't played
  yet, and that's accepted: the group-chat convention is "don't open the
  thread until you've committed."
- The player's **name** comes from a one-time prompt at first boot,
  stored via `Arcade.save`, editable from the How to play sheet. Without
  it, screenshots from two phones are indistinguishable.
- **Share** button: renders the card to a `<canvas>` (plain text tiles on
  coloured rects — no fonts, no images) and hands it to
  `navigator.share({ files: [png] })`. On iOS Safari this opens the
  native sheet straight into Messages, and "Save Image" is right there.
  Vanilla API, no library. If `navigator.canShare` says no, the button
  hides and the card itself is laid out to fit one portrait viewport
  cleanly for a native screenshot.
- **Copy text** button: a monospace text block for chats that strip
  images, via `navigator.clipboard.writeText` with a `<textarea>`
  fallback. Letters included, cropped to bounding box:

  ```
  Daily Letters — Sep 3 — Lev
  CLEAN RACK · 4 words · longest 4

  · · T A B
  · · O · A
  · · N E S T
  · · E · ·
  ```

## Screen (during play)

```
      🔤  Sep 3  ·  2 left  ·  🔥 6

   ┌─────────────────────────────┐
   │ · · T A B · · · ·           │
   │ · · O · A · · · ·           │
   │ · · N E S T · · ·           │
   │ · · E · · · · · ·           │
   │ · · · · · · · · ·           │   <- 8x8 board, full width
   │ · · · · · · · · ·           │
   │ · · · · · · · · ·           │
   │ · · · · · · · · ·           │
   │ · · · · · · · · ·           │
   └─────────────────────────────┘
      TAB · TONE · NEST · AS          <- runs list, live

   ┌───┬───┐
   │ K │ W │                          <- rack, tap to select
   └───┴───┘

   [ Shuffle rack ]   [ Commit · 2 left ]
```

- Board on top (fixed, whole thing visible), runs list, rack pinned
  below, two buttons at the bottom.
- "Shuffle rack" reorders the *unplaced* tiles cosmetically only — it
  never changes which 19 letters you got.
- No red states anywhere during play. The only non-neutral signal is the
  amber "2 groups" pill when the board is disconnected.

## Controls

- Tap to select a rack tile, tap to place, tap a placed tile to lift it.
  Every target ≥44px per `CLAUDE.md`.
- No drag, no swipe, no long-press, no multi-touch gestures.

## Session shape

- Turn-based and endlessly pausable — no timer pressure, matching the
  house default in `CLAUDE.md`.
- A typical sitting is a few minutes; the puzzle supports many short
  visits across the day since state persists and nothing punishes leaving
  mid-build. Commit ends the day's play.

## Persistence

Via `Arcade.save` / `Arcade.load`, namespaced per game automatically.

`state` — today's board, one object:

- `date` — the `Arcade.dailySeed()` value this state belongs to, so a
  stale save from yesterday is detected and discarded on load rather than
  shown.
- `rack` — today's 19 letters, in seeded order (regenerated from the seed
  if ever missing — never trusted blindly from storage).
- `placed` — `{ letter, row, col }[]` for tiles currently on the board.
- `committed` — `false`, or the committed result `{ left, words, longest,
  groups }` so the share card can be rebuilt without recomputing.
- `reopened` — `true` once the day's single Reopen has been used, so the
  second commit is final and the link doesn't come back.

`profile` — persists across days:

- `name` — the player's display name for the card.
- `streak` — `{ lastCommitDate, days, clean }`. On load, if
  `lastCommitDate` is neither today nor yesterday, `days` and `clean`
  reset to 0 before anything is shown.
- `seenHowToPlay` — whether the rules sheet has been dismissed once.

## Accessibility

- Every board/rack tile shows its letter as text, never as a colour-only
  or icon-only cue.
- Tiles-left, groups count, and the runs list are all plain text and live
  in an `aria-live="polite"` region so the state is announced as it
  changes.
- Tap targets ≥44px on both board cells and rack tiles.
- No hover states, no precision dragging, no timed input anywhere. The
  ceremony's flip animation respects `prefers-reduced-motion` (tiles
  appear instantly, chime and score still play).

## Assets

- None. No word list, no images, no fonts, no icon requests — tiles are
  plain text in styled divs, and the share image is drawn on a canvas at
  share time. Whole game should land well under 30KB.

## Build checklist

- [x] `games/daily-letters/index.html`, self-contained, imports only
      `shared/arcade.css` and `shared/arcade.js`.
- [x] `Arcade.boot()` before any gameplay or audio; `Arcade.backButton()`.
- [x] First-boot name prompt + How to play sheet (rules, honor system).
- [x] Tile draw: seeded, weighted, no Q, 6 vowels / 13 consonants of 19.
- [x] Tap-to-place / tap-to-lift, any cell, no refusals.
- [x] Live header: tiles left, groups pill (when > 1), streak.
- [x] Runs extraction (rows + columns, 2+ letters) → live runs list.
- [x] Commit button with live label, confirm sheet, board lock, one
      Reopen per day (second commit final).
- [x] Ceremony: flip-in, runs type-out, score stamp, chime, confetti on
      clean rack, `prefers-reduced-motion` path.
- [x] Share card layout that fits one portrait viewport.
- [x] Canvas render → `navigator.share` with file; hide button when
      unsupported.
- [x] Copy-text share with `<textarea>` fallback.
- [x] Streak bookkeeping (commit + clean), reset on a missed day.
- [x] `games.json` entry (`slug`, `title`, `blurb`, `emoji`).
- [x] Bump `Arcade.VERSION`.

## Tuning knobs

1. **Tile count (19) and vowel target (6/19).** The two numbers that
   decide whether most days feel solvable or most days strand tiles.
2. **Board size (8×8).** Nine columns would give room for 9-letter words
   but drops cells under 44px on a 375px phone. Ten is right out.
3. **Reopen allowance (1).** Shipped as one reopen per day: enough to
   cover a mis-tap or a spotted-it-a-minute-later fix, few enough that
   the second commit still carries weight. If even that feels punishing
   in playtest, the softer fallback is unlimited reopens with "best of
   day kept" — but that dissolves the lock-in decision entirely.
4. **Rare-letter weighting (J/X/Z).** Currently low but nonzero — raise
   for more "fun constraint" days, lower toward zero if it lands as
   "unfair" more than "fun."
5. **Ceremony length.** ~1s drumroll is the guess. Too short and it's a
   flash; too long and it's a loading bar.

## Open questions

- **Archive of past days.** `state` only ever holds today. Worth deciding
  whether a small history of past cards (date, left, words) is worth the
  persistence — it'd make the streak line feel earned rather than just
  a number.
- **Two-letter runs.** They're listed for transparency but excluded from
  the word count. If the family decides two-letter words are fine, that's
  a one-line change.
- **Shared spoilers.** The card shows letters by design. If the "don't
  open the thread until you've committed" convention doesn't hold, a
  "hide letters" toggle on the card is cheap to add.
