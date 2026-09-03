# Tap Race

- **Slug:** `games/tap-race/`
- **Emoji:** 🕹️
- **Status:** shipped

## One-line pitch
Tap a button as many times as you can before a 15-second timer runs out.

## Rules
Tap the on-screen button repeatedly. Each tap increments the score. The
game ends automatically when the 15-second timer hits zero.

## Controls / interaction
- Single tap on one large circular button.
- No dragging, no multi-touch, no precision required.

## Session shape
- Timed (15 seconds) — this is a deliberate exception to the
  turn-based/pausable default in `CLAUDE.md`. It exists as the minimal
  pipeline smoke test, not as a template for future games.
- One session: ~15-20 seconds including the tap-to-start screen.

## Scoring / persistence
- Personal best tap count saved via `Arcade.save("best", taps)` /
  `Arcade.load("best", 0)`, namespaced to this game automatically.
- No daily-seed use — every run is independent.

## Accessibility notes
- Uses shared defaults from `shared/arcade.css` only (large button, 44px+
  tap target, high contrast). No game-specific accommodations needed.

## Open questions
None — this game is intentionally minimal and considered "done."
