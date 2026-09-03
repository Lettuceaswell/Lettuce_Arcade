# Lettuce Slots

- **Slug:** `games/lettuce-slots/`
- **Emoji:** 🥬
- **Status:** shipped

## One-line pitch
Three reels, one button. When the first two land on the same thing, the
third reel slows to a crawl — and that crawl is the whole game.

---

## The dopamine principle

**Anticipation, not reward.** Dopamine spikes during the *uncertain interval
before* an outcome, and the spike is largest when the odds feel live but
unresolved. It does not spike much at the payout itself. Slot machines are
the canonical example: the reels resolve one at a time, left to right, so
that by the third reel the player already knows whether a win is still
possible. Two matching reels plus one still spinning is the maximum-tension
state a three-reel machine can produce, and it is the only state the design
needs to protect.

Everything in this game exists to manufacture that state often, stretch it
out when it happens, and get the player back to the button fast enough to
reach it again.

Three consequences, and they drive every decision below:

1. **The third reel is the product.** It gets a dedicated slow-down, its own
   audio, and a visible pass over the matching symbol before it lands.
2. **Tension frequency beats payout size.** With five symbols and honest
   uniform reels, reels 1 and 2 match on **20% of spins** — one in five spins
   enters tension mode for free. No rigging is needed to make this game feel
   alive, so none is used.
3. **Time-to-next-spin is the throttle.** Every second between a result and
   the next available tap is a second the loop is dead. Non-tension spins
   resolve in ~1.4s and the button re-arms instantly.

---

## What got cut, and why

Each of these was in the original concept. None of them feed the third-reel
moment, and all of them cost either build time or seconds-per-spin.

| Cut | Reason |
| --- | --- |
| Per-symbol payout table (5 tiers) | Arithmetic the player never does mid-spin. Tension is identical whether the match is worth 10 or 80. Collapsed to two tiers. |
| Lettuce as a rare, low-odds symbol | Rarity is cubed across three reels: at 10% per reel the jackpot lands once in 1,000 spins and is never seen. Uniform odds make it 1 in 125 — rare enough to matter, common enough to exist. |
| Betting / coin balance / spend-per-spin | A balance introduces a fail state. Hitting zero stops the loop, which is the one thing the design cannot allow. Spins are free. |
| 2-of-3 lettuce consolation payout | The near-miss is *already* the reward — that is the entire thesis. Paying it out converts a tension moment into a bookkeeping moment. |
| "What happens at 0 coins" | Moot once spins are free. |
| Reel-strip graphics, custom art | Emoji at large size read better on an old phone and cost 0 KB. |

---

## Rules

- One button: **SPIN**. Free, unlimited, no bet.
- Three reels land on one symbol each, left to right, on a delay.
- Symbols, all equally likely: 🍅 🥕 🧀 🫒 🥬
- Outcomes:
  - **3 × 🥬** → `JACKPOT` — +500 salad points. Odds: 1 in 125 (0.8%).
  - **3 of anything else** → `MATCH` — +50 points. Odds: 1 in 31 (3.2%).
  - **Anything else** → +1 point. The counter always moves; there is no
    dead spin.
- Points only ever go up. There is no way to lose.

### Reel 3 behaviour (the important part)

The outcome is rolled **before** the animation starts, from a uniform,
unweighted draw — the odds above are real and the game does not decide
mid-spin whether to let you win.

Presentation is the only thing that reacts:

- **Normal spin** (reels 1 and 2 differ): reel 3 spins at a steady clip and
  stops at ~1400ms. Total spin ≈ 1.4s.
- **Tension spin** (reels 1 and 2 match — 20% of spins): reels 1 and 2 get a
  highlight ring, the status line reads e.g. `TWO 🥬 — one to go…`, and reel 3
  decelerates hard: cycle interval ramps 60ms → 120 → 200 → 320 → 450ms,
  landing at ~2800ms. The last two symbol changes are individually visible.
- **On a tension loss**, reel 3 is made to stop on a symbol *adjacent to the
  target on the strip*, so the player watches the winning symbol slide past
  and settle one slot off. This changes which losing symbol is shown; it does
  not change the odds of winning, which were already decided.

Strip order (fixed, for adjacency): `🍅 🥕 🧀 🫒 🥬` as a ring, so 🥬 sits
between 🫒 and 🍅.

---

## Screen

Portrait, single view, nothing scrolls.

```
        🥬 LETTUCE SLOTS

     ┌─────┬─────┬─────┐
     │ 🥬  │ 🥬  │ 🍅  │     <- ~72px emoji, reels 1&2 ringed
     └─────┴─────┴─────┘

       so close — one off

          ┌───────────┐
          │   SPIN    │          <- 72px tall, full width minus margins
          └───────────┘

   1,204 pts  ·  4 jackpots  ·  312 since last 🥬
```

- Status line is a fixed-height slot so nothing reflows between states.
  States: `` (idle) / `TWO 🥬 — one to go…` / `JACKPOT! 🥬🥬🥬` /
  `MATCH — 🫒🫒🫒` / `so close — one off` / `no match`.
- **Dry-streak counter** (`312 since last 🥬`) is a deliberate tension
  amplifier, not a stat. It grows every spin, resets to 0 on a jackpot, and
  gives a long unlucky session a rising sense of "it's due." Cheap to build,
  and it is the only stat that earns its place mid-loop.
- Win state is signalled by **text and color together**, never color alone.

## Controls

- One tap target, ≥72px tall, thumb-reachable at the bottom.
- Disabled and dimmed during a spin, re-armed the instant reel 3 lands —
  no post-result delay, no "collect" step.
- Tapping during a spin does nothing (no queueing, no skip). The wait *is*
  the game; letting the player skip it removes the product.

## Audio

Cheap WebAudio blips only, after `Arcade.boot()`. This is the anticipation
ramp and is worth the ~20 lines:

- Reel stop 1 → 440Hz click. Reel 2 → 554Hz. Reel 3 → 659Hz.
  Ascending pitch reads as "building" without any melody.
- Tension mode: reel 3's pre-stop cycles each get a soft tick, slowing with
  the reel.
- Jackpot: short rising 4-note arpeggio. Match: two notes. Loss: silence —
  no failure sound, ever.
- Muteable via whatever `Arcade` already exposes; if nothing, a small 🔇
  toggle in the corner.

## Session shape

- One spin = one self-contained action. Turn-based, trivially pausable,
  no timers, no reflex. Fits the house default without an exception.
- Expected session: 30–150 spins. Tension moment every ~5 spins, a match
  every ~31, a jackpot every ~125 — roughly one jackpot per solid sitting.

## Persistence

Via `Arcade.save` / `Arcade.load` (namespaced per game already):

- `points` — lifetime salad points, integer, default `0`.
- `jackpots` — lifetime jackpot count, default `0`.
- `dry` — spins since last jackpot, default `0`.

Nothing else is stored. No settings, no history log.

## Accessibility

- Emoji at ~72px — legible for a 60-something reader without a custom icon
  set or any font request.
- Every outcome stated in words as well as color.
- Reels get `aria-live="polite"` on the status line so the result is
  announced once, not three times.
- No hover, no drag, no precise targeting anywhere.

## Build checklist

- [ ] `games/lettuce-slots/index.html`, `game.js`, `game.css` — nothing else.
- [ ] Imports only `shared/arcade.css` and `shared/arcade.js`.
- [ ] `Arcade.boot()` before any audio or first spin; `Arcade.backButton()`.
- [ ] Append to `games.json`:
      `{ "slug": "lettuce-slots", "title": "Lettuce Slots", "blurb": "Three reels. One button. The third one takes its time.", "emoji": "🥬" }`
- [ ] Bump `Arcade.VERSION`.
- [ ] Page weight target: < 15KB. No images.

## Tuning knobs (the only numbers worth revisiting after playtest)

1. Reel 3 tension deceleration curve — if it feels slow rather than tense,
   shorten the tail, don't remove it.
2. Non-tension total spin time (1.4s) — the throttle on session length.
3. Jackpot odds (currently 0.8%) — raise only if a full sitting reliably
   ends without one.
