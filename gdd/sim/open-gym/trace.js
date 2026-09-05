const { buildContext } = require("./harness.js");
const bot = require("./bot.js");
const vm = require("vm");
const lvl = Number(process.argv[2] || 3), seed = process.argv[3] || "s1";
const ctx = buildContext({ mathRandomSeed: seed });
if (process.env.OG_OVERRIDE) vm.runInContext(process.env.OG_OVERRIDE, ctx);
vm.runInContext("levelIndex = " + (lvl - 1) + "; loadLevel(levelIndex); buildBoard(); render();", ctx);
function summary() {
  const bs = Object.values(ctx.state.blocks);
  const c = (f) => bs.filter(f).length;
  const gym = bs.find(b => b.owner === "player" && b.isGym);
  const units = bs.filter(b => b.owner === "player" && b.unit).map(b => b.unit.tier[0]).join("");
  return `T${ctx.state.turn} mom=${gym ? gym.momentum : "-"} own=${c(b => b.owner === "player")} units=${units} blank=${c(b => !b.owner && !b.state)} sed=${c(b => !b.owner && b.state === "sedentary")} lap=${c(b => !b.owner && b.state === "lapsed")} rival=${c(b => b.owner === "rival")}`;
}
for (let t = 0; t < 60 && !ctx.state.gameOver; t++) {
  const before = summary();
  const log = bot.playTurn(ctx);
  console.log(before, "|", log.join(", "));
}
console.log(summary(), ctx.state.gameOver, ctx.state.loseReason || "");
