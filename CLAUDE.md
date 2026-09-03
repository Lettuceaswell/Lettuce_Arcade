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
  calls `Arcade.backButton()`. The arcade index (`index.html`) does neither —
  it has no back button and doesn't need a tap-to-start gate.
- Adding a game means: one new folder under `games/`, one new object
  appended to `games.json` (`slug`, `title`, `blurb`, `emoji`). Nothing else
  in the codebase should need to change.
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
