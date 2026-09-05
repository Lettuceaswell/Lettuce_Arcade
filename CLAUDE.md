# Lettuce Arcade — house rules

A family arcade of tiny web games. Static site, zero build step, deployed to
Cloudflare Pages as-is.

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
  eating) marks its restart action `pinned: true` so it gets its own
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
  on hover states or precise dragging — assume a thumb on glass.
- Assume the target device is an older iPhone on cell data. Keep total page
  weight per game under 500KB.
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
  same day.
- Keep icons and assets as flat, high-contrast PNGs/SVGs — no external font
  or icon CDN requests.
