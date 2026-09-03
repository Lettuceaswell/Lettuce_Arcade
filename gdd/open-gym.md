# OPEN GYM — Game Design Document

*(Working title. Alternates: Block by Block, The Circuit, Foot Traffic.)*

**Genre:** Single-player turn-based territory strategy
**Platform:** HTML/JS, browser, family arcade site
**Session length:** 5–10 minutes per level
**Players:** 1 (all opponents are AI)

---

## 1. The Pitch

The map is a neighborhood. You run a gym. Every block you hold is people who train with you.

A rival chain is opening across the street, and everyone neither of you reaches stays **Sedentary**.

Sign the whole neighborhood before they do.

---

## 2. Vocabulary

Final. Use these names in code and UI.

| Term | Meaning |
|---|---|
| **Block** | One hex. A city block of people. |
| **Circuit** | A connected group of your Blocks. One economy. |
| **Gym** | A Circuit's home Block. Holds its Momentum. |
| **Momentum** | The single currency. Earned per Block per turn, spent to recruit, drained by Load. |
| **Load** | Total upkeep of every member in a Circuit, paid each turn. |
| **Fold** | Load exceeds Momentum. That Circuit goes under — every member is gone. |
| **Recruit** | Take a Block. |
| **Sedentary** | People who never joined. Spreads into any block nobody is serving. |
| **Lapsed** | People who quit and won't come back. Entrenched, harder to reclaim, spreads faster. |
| **Injury** | What a lost member leaves behind. Goes Sedentary next turn. |
| **Branch** | A satellite location. Free to run, holds its neighborhood. |
| **Rival** | An AI-run competing gym. Same rules as you. |

---

## 3. Members

Four tiers of commitment. Merge two of the same tier to advance one.

| Tier | Strength | Recruit Cost | Load / turn | Can clear |
|---|---|---|---|---|
| **Trial** | 1 | 10 | 2 | Sedentary |
| **Member** | 2 | 20 | 6 | Sedentary, Lapsed |
| **Regular** | 3 | 30 | 18 | Sedentary, Lapsed |
| **Lifer** | 4 | 40 | 54 | Sedentary, Lapsed |

Load quadruples per tier. That is the whole difficulty curve — commitment is cheap to sign and expensive to keep.

A member moves anywhere inside its own Circuit, or one Block past the border.

---

## 4. Rules

**Turn order:** You act → economy resolves → Rival acts → Sedentary spreads.

**Economy, per Circuit, each turn:**
1. Momentum += number of Blocks in the Circuit
2. Momentum −= Load
3. Momentum < 0 → **Fold**. Every member in that Circuit is removed, each leaving an Injury.

**Recruiting a Block:** A member can enter any adjacent Block whose defense is *lower* than its own strength.

**Defense of a Block** = the highest of: a member standing on it, a member on an adjacent Block of the same color, an adjacent Branch (2), its own Gym (1). Sedentary defends at 0. Lapsed defends at 1.

**Merging:** Drag a member onto one of the same tier inside your Circuit. They become the next tier up. Lifers can't merge.

**Branch:** Costs 15. Zero Load. Defends itself and every adjacent Block at strength 2. Can't move, can't recruit.

**Splitting a Circuit:** Recruit a Block that connects two halves of a Circuit and it becomes two Circuits, each recalculating Momentum from its own smaller size. Both halves often Fold. This works on the Rival, and the Rival will do it to you.

**Injury:** Produces no Momentum. Goes Sedentary at the start of the next turn.

---

## 5. Sedentary and Lapsed

Not players. A spread rule that runs at the end of each turn.

1. **Spread:** Each Sedentary Block has a 30% chance to spread into one adjacent unclaimed or Injury Block.
2. **Lapse:** A Sedentary Block that survives 5 turns becomes **Lapsed**.
3. **Lapsed spread:** 50%, and it can take *your* Blocks if they have no member and no adjacent Branch.
4. **Drag:** Lapsed adjacent to your Circuit costs that Circuit 1 Momentum per turn.

Spread percentages are the main difficulty dial.

---

## 6. The Rival

One rival gym, same rules, no cheating. Its whole AI, in priority order:

1. If a Circuit will Fold next turn, sell nothing — just don't recruit. Let it ride.
2. If a single recruit would split one of the player's Circuits, do that.
3. If a Block can be taken and held, take the one with the most adjacent Blocks.
4. Merge any two same-tier members that are adjacent and idle.
5. If Momentum is over 40 and nothing else applies, buy a Branch on the border.
6. Otherwise clear the nearest Sedentary.

That's it. Six rules, checked top to bottom, and it plays well enough to lose interestingly.

**Difficulty** is set by giving the Rival a Momentum multiplier per level: 0.75 easy, 1.0 fair, 1.25 hard. Never change its rules — only its income.

---

## 7. Win / Lose

- **Win:** No Rival, Sedentary, or Lapsed Blocks remain.
- **Lose:** No members and not enough Momentum to recruit one.
- **Soft fail:** Fold. Survivable, usually fatal within a few turns.

---

## 8. Levels

Hand-designed, not random. 15 levels, four arcs.

| Levels | Teaches | Rival? |
|---|---|---|
| 1–3 | Recruit, Momentum, signing a Trial | No |
| 4–6 | Load and Fold. Level 5 should let the player Fold and recover. | No |
| 7–9 | Merging, Lapsed, Branch | Introduced level 8 |
| 10–12 | Splitting Circuits — theirs and protecting yours | Yes, 1.0 |
| 13–15 | Tight Momentum, entrenched Lapsed, no margin | Yes, 1.25 |

Each level: fixed map, fixed starting Momentum, fixed Sedentary placement, one lesson.

---

## 9. Build Order

1. Hex grid + render
2. Flood-fill for Circuits
3. Economy loop (Momentum, Load, Fold)
4. Members: recruit, move, merge, capture
5. Sedentary spread + Lapsed
6. Branch, Injury
7. Win/lose detection
8. Rival AI (the six rules)
9. Level loader (JSON per level)
10. 15 levels
11. Polish: undo last move, turn counter, Momentum forecast

Steps 1–7 are a complete game without the Rival. Build and playtest that first — step 8 is a bolt-on, and if the game isn't fun at step 7 the Rival won't save it.

---

## 10. Playtest Iteration Map

In order. Each test has one question and one thing you're allowed to change.

### Test 1 — Is the loop legible?
**Who:** One person who's never seen it.
**Do:** Play level 1, no explanation.
**Watch:** Do they grasp that Blocks make Momentum? Do they recruit without being told?
**Change if it fails:** UI only — labels, Momentum readout, a first-turn hint. No rule changes yet.

### Test 2 — Does Fold teach?
**Who:** Same person plus one.
**Do:** Levels 4–6.
**Watch:** Do they Fold? Do they know why? Do they play differently after?
**Change if it fails:** Load values, and whether Fold warns you the turn before.

### Test 3 — Is Sedentary threatening?
**Who:** Two players, one a kid.
**Do:** A mid-level at 30% spread.
**Watch:** Is there any turn where they feel behind? No pressure means it's a chore, not a puzzle.
**Change if it fails:** Spread percentage only. Try 40%, then 25%. Nothing else.

### Test 4 — Is merging discovered?
**Who:** Fresh player.
**Watch:** Do they merge unprompted? Merging is the depth of the game. Invisible merging means a shallow game.
**Change if it fails:** Make it visible — highlight mergeable pairs on hover.

### Test 5 — Do the words work?
**Who:** Three people, one who doesn't play games.
**Ask after playing:** What's Momentum? What's a Circuit? What's Lapsed?
**Watch:** Any term they can't define is overhead.
**Change if it fails:** Vocabulary. This is the one test where renaming is allowed.

### Test 6 — Is the Rival fair?
**Who:** Someone who's already cleared level 7.
**Do:** Level 8 and 10.
**Watch:** When they lose, do they blame themselves or the game? "That was cheap" means the AI is doing something they couldn't see coming.
**Change if it fails:** The Momentum multiplier. Not the six rules.

### Test 7 — Difficulty curve
**Who:** Two players, full 15-level run.
**Watch:** Where do they quit? That level is too hard, or the three before it were too easy.
**Change if it fails:** Level layouts. Not rules.

### Test 8 — Replay
**Ask anyone who finished:** Would you replay a level to do it better?
**If no:** Add a par — turns taken, or peak Momentum — shown on completion.

---

## 11. Open Questions

- Final title.
- Whether **Fold** or **Collapse** reads better on a loss screen. Test 5 decides.
- Whether the Rival should be one chain across all levels with a name and a personality, or an anonymous color. A named chain is more fun and costs nothing but text.
- Whether **Branch** survives, or its job gets folded into a Lifer that trades movement for holding ground.
