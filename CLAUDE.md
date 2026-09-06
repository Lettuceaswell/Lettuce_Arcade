# Lettuce Arcade — house rules

A family arcade of tiny web games. Static site, zero build step, deployed to
Cloudflare Pages as-is.

## Design

Every game, and every change to a game, is held to this. When a rule below
and this section pull in different directions, this section wins.

- Design for maximum depth per unit of rules. Few elements, each distinct,
  combining into a decision space the player can't exhaust — small enough to
  teach in a minute, large enough to argue about for years. If the "How to
  play" panel needs a scrollbar, the game has too many rules, not too few
  words.
- Platform limits are not obstacles; they are the forcing function that
  produces the design. No build step, one thumb, a 500KB budget, an old
  phone on cell data: treat each as a constraint to design *from*, never
  something to route around. A feature that needs more than the limits
  allow is the wrong feature.
- Then shape that system against how attention actually works:
  - Anticipation drives engagement harder than payout, so reward the reach,
    not just the grasp. Make the moment *before* the result the loud one
    (the reel slowing, the last tile sliding in, the near-miss shown, never
    hidden). A payout with no build-up is a wasted payout.
  - Vary the interval. Never reward on a fixed beat; jitter the timing and
    the size so the player can't settle into a rhythm and stop noticing.
  - Build toward a legible peak, and end on it. Sessions are remembered by
    their high point and their last thirty seconds, not their average. A run
    should get tighter or louder as it goes, the end should be the biggest
    thing that happened, and the end screen should replay that peak (best
    combo, closest call, new record) rather than an average score.
- Cut before adding. If a proposed feature makes the game wider instead of
  deeper, drop it or fold it into an element that already exists.

## Hard rules

- No dependencies, no npm, no build step, no bundler, no TypeScript, no
  service worker. Ever. Plain HTML, CSS, and vanilla JS only.
- Every game is one self-contained folder under `games/<slug>/`, importing
  only `shared/arcade.css` and `shared/arcade.js`. No other cross-game or
  cross-folder imports.
- Every game calls `Arcade.boot()` before starting any gameplay or audio, and
  calls `Arcade.backButton()` and `Arcade.menuButton({ rules | help,
  describeSave })`. The menu is the one place for "How to play" and for
  wiping that game's save (confirmed, never one tap). A game with its own
  mute button sits it at `right: 60px` so the menu keeps the corner. The
  arcade index (`index.html`) does none of this — it has no back button, no
  menu, and doesn't need a tap-to-start gate.
- A game with a run that can go stale (a bad board, a bowl the bunny keeps
  eating) has lost its peak — a stale run ends on a low point, and that is
  what the player remembers. Such a game marks its restart action `pinned: true` so it gets its own
  "↻ New run" button under the ☰, outside the menu. Give it `show` (when a
  run exists) and, if the game can tell, `nudge` (when the run is a lost
  cause) so the button lights up and begs. It still confirms, and the
  confirm arms after a beat. Keep the top ~110px on the right clear for it.
- Games that are played by swiping (Keto Krush) call `Arcade.trapBack()`
  and keep tiles out of the 24px edge zone, so iOS's back-swipe can't end a
  run. Everywhere else, leave the swipe alone — it's how people get home.
- Adding a game means: one new folder under `games/`, one new object
  appended to `games.json` (`slug`, `title`, `blurb`, `emoji`, and optionally
  `icon` — a PNG inside the game's own folder, shown instead of the emoji).
  Nothing else in the codebase should need to change. Add `"beta": true` to
  list a game behind the index's "Beta games" button instead of on the main
  list: anyone can play it, but its play count stays at zero, so removing
  the flag later ships it to the main list wearing the "New!" tag.
- Portrait-first, one-thumb play. Minimum 44×44px tap targets. No reliance
  on hover states or precise dragging — assume a thumb on glass. One thumb
  is an input budget, and the design should spend it on decisions, not on
  aiming.
- Assume the target device is an older iPhone on cell data. Keep total page
  weight per game under 500KB. Spend the budget on the peak (the win
  animation, the near-miss, the final beat), never on the average moment.
- Increment `Arcade.VERSION` in `shared/arcade.js` on every change that gets
  deployed.

## Conventions

- `games.json` is the single source of truth for what appears on the arcade
  index. The index fetches it at runtime — don't hardcode game tiles in
  `index.html`.
- `shared/arcade.js` exposes a single global `Arcade` object. Don't add new
  globals; extend `Arcade` instead.
- Use `Arcade.save`/`Arcade.load` for any persistence — they're namespaced
  per game automatically and degrade gracefully if `localStorage` is
  unavailable.
- Use `Arcade.dailySeed()` + `Arcade.seededRandom()` for any "daily
  challenge" style game so everyone in the family sees the same board on the
  same day. A shared board is what makes the game arguable: the same few
  rules, the same start, and different choices to compare at dinner.
- Keep icons and assets as flat, high-contrast PNGs/SVGs — no external font
  or icon CDN requests.
