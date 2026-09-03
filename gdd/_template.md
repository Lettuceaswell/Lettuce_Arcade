# <Game Title>

- **Slug:** `games/<slug>/` (folder name, matches `games.json`)
- **Emoji:** 🎮
- **Status:** idea / prototype / shipped

## One-line pitch
What is this game, in one sentence?

## Rules
How do you play? What's the goal? What ends the game (a timer, a win
condition, running out of moves)?

## Controls / interaction
- Single tap? Drag? Multiple buttons?
- Confirm it works one-thumb, no hover, no precise dragging (per `CLAUDE.md`).

## Session shape
- Turn-based, pausable, or timed? (Timed/twitch games are the exception, not
  the default — see `CLAUDE.md`.)
- Rough length of one play session.

## Scoring / persistence
- What gets saved via `Arcade.save`/`Arcade.load` (e.g. personal best)?
- Any daily-challenge use of `Arcade.dailySeed()` / `Arcade.seededRandom()`?

## Accessibility notes
- Text size, contrast, tap target size — anything specific to this game
  beyond the shared defaults in `shared/arcade.css`.

## Open questions
Anything undecided before this moves from idea to prototype.
