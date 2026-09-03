# Keto Krush — Needed Changes

> Note to Claude: these are playtest notes from the developer, not a locked
> spec. Skip or push back on anything that falls outside the plausibility of
> the Lettuce Arcade project (see the root `CLAUDE.md` — no dependencies,
> no build step, portrait/one-thumb play, <500KB per game, etc). When a
> change below is implemented, remove it from this file entirely. Anything
> left undone is waiting on the developer to rescope it.

* when the hints highlight, I want them to highlight the whole combo that will be completed. I also want the hint to prefer the biggest combos first. e.g. if there's a combo of 4 and a combo of 3, it should show the 4 icon combo, and highlight just the 4 that match, and not the icon that's getting switched out.
combo priority: highest number keto combo, lower number keto combo, highest non-keto combo, then normal keto combo
what gets highlighted: if it's a 4-pizza combo, the 4 pizzas will be highlighted, not the cheese that's getting swapped out