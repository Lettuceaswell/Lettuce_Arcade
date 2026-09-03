# Zorro Runner

- **Slug:** `games/zorro-runner/`
- **Emoji:** 🦊
- **Status:** shipped

## One-line pitch
An endless runner starring a masked, whip-cracking Zorro who never stops
running through Spanish California — the player only decides how he gets
past what's ahead. Core fantasy: effortless momentum.

## Rules
Zorro auto-runs to the right; speed increases steadily over time. Obstacles
scroll in from the right in short, repeatable chunks (drawn from a pool that
gets harder as score climbs). The player reads each obstacle and reacts;
clean clears build a combo multiplier, sloppy clears reset it. One collision
ends the run and shows a "You've been caught!" screen with the run's
distance and personal best.

Obstacle vocabulary and how each is cleared:
- **Adobe walls** — tall; only clearable by swinging (a jump-slash alone
  isn't high enough).
- **Hay carts** — mid-height; clearable by either a jump-slash or a swing.
- **Aqueducts (low)** — must be sliding under them for the full overlap;
  jumping or swinging into one still counts as a collision.
- **Guards on horseback** — whipped off (removed, no penalty) if struck by
  a jump-slash within reach, or cleared by jumping/swinging over them if
  not struck in time.
- **Banners** — never a hazard; carving through one mid-swing awards a
  bonus ("Z-CARVE!") and doesn't affect the combo if missed.

## Controls / interaction
- **Tap / quick press** — jump-slash: a short hop that also whip-strikes
  any guard within reach at the moment of the tap.
- **Hold** — whip-swing: Zorro anchors into the offscreen tree canopy and
  arcs upward; the longer the hold (up to a cap), the higher/farther the
  arc. Releasing (or hitting the cap) begins the descent back to the road.
- **Swipe down / ArrowDown** — slide under low aqueducts. Only available
  while grounded.
- One-button-first: tap and hold alone are enough to clear every obstacle
  type except aqueducts, which require the slide gesture. Keyboard
  (Space to tap/hold, ArrowDown to slide) works as a full substitute for
  touch, per the one-thumb / no-precision-dragging rule in `CLAUDE.md`.
- `touch-action: none` is scoped to the game canvas only; the arcade menu
  itself stays normally scrollable.

## Session shape
- Continuous/twitch, not turn-based — a deliberate second exception to the
  turn-based default in `CLAUDE.md` (alongside Tap Race), since "endless
  runner" is the genre itself.
- Runs are unbounded until the player dies; a single run typically lasts
  anywhere from a few seconds (early death) to a couple of minutes as speed
  ramps and harder obstacle chunks enter the pool.

## Scoring / persistence
- Distance/score climbs continuously while running, boosted by clean
  obstacle clears, defeated guards, and banner Z-carves.
- Personal best saved via `Arcade.save("best", score)` /
  `Arcade.load("best", 0)`, namespaced to this game automatically.
- Mute preference saved via `Arcade.save("muted", …)`, matching the pattern
  used by the other games.
- No daily-seed use — this is an arcade high-score chaser, not a
  daily-challenge game, so obstacle chunks are picked with `Math.random()`.

## Accessibility notes
- Minimum 44×44px back/mute buttons per the shared tap-target rule.
- High-contrast HUD text (score, combo, best) with a drop shadow so it
  reads over the sunset background at any point in the parallax scene.
- Full keyboard fallback (Space + ArrowDown) so the game doesn't depend on
  touch/pointer input to be playable.

## Open questions
- Whether to add a slow difficulty ramp-down (a "practice mode") for
  younger players who bounce off the current speed curve — not implemented
  yet, no player feedback either way.
- Whether banners should ever be part of a required (not just bonus) path
  as difficulty rises, to give high-score chasers a harder execution check.
