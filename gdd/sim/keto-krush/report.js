"use strict";
const fs = require("fs");
const path = require("path");

const RESULTS_DIR = path.join(__dirname, "results");
const OUT = path.join(__dirname, "report.html");

function parseCsv(text) {
  const lines = text.trim().split("\n");
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    // simple CSV split (no embedded commas in our numeric/bool fields except endReason/tierBefore strings, which are plain words)
    const cells = line.split(",");
    const row = {};
    header.forEach((h, i) => { row[h] = cells[i]; });
    return row;
  });
}

function num(v) { return v === undefined || v === "" ? 0 : Number(v); }
function bool(v) { return v === "true"; }

const BOTS = ["random", "greedy", "keto", "ketoBig", "tempted_1_0", "tempted_1_25", "tempted_1_5", "tempted_2_0", "lookahead", "casual"];

function loadRuns(bot) {
  const p = path.join(RESULTS_DIR, `runs-${bot}.csv`);
  if (!fs.existsSync(p)) return [];
  return parseCsv(fs.readFileSync(p, "utf8")).map((r) => ({
    seed: num(r.seed), bot: r.bot, score: num(r.score), moves: num(r.moves),
    movesEarned: num(r.movesEarned), endReason: r.endReason, frenzies: num(r.frenzies),
    peakMeter: num(r.peakMeter), crashed: bool(r.crashed), maxCombo: num(r.maxCombo),
    bestMovePts: num(r.bestMovePts), proteinTiles: num(r.proteinTiles), carbTiles: num(r.carbTiles),
    pctCrash: num(r.pctCrash), pctNormal: num(r.pctNormal), pctKeto: num(r.pctKeto),
    pctDeep: num(r.pctDeep), pctFrenzy: num(r.pctFrenzy),
    tierUpsSeen: num(r.tierUpsSeen), firstTierUpMove: num(r.firstTierUpMove),
    endState: r.endState, endedWithin5OfFrenzy: bool(r.endedWithin5OfFrenzy),
    longestDryGap: num(r.longestDryGap), rewardEvents: num(r.rewardEvents),
    ptsCrash: num(r.ptsCrash), ptsNormal: num(r.ptsNormal), ptsKeto: num(r.ptsKeto),
    ptsDeep: num(r.ptsDeep), ptsFrenzy: num(r.ptsFrenzy),
    nearMissNoFrenzy: bool(r.nearMissNoFrenzy),
    fellBackWithoutFrenzy: bool(r.fellBackWithoutFrenzy),
    lastMoveWasReward: bool(r.lastMoveWasReward),
    ptsInFrenzy: num(r.ptsInFrenzy), movesInFrenzy: num(r.movesInFrenzy),
    ptsOutside: num(r.ptsOutside), movesOutside: num(r.movesOutside),
    climbCount: num(r.climbCount),
    climbLengths: (r.climbLengths || "").split("|").filter(Boolean).map(Number),
  }));
}

function loadMoves(bot) {
  const p = path.join(RESULTS_DIR, `moves-${bot}.csv`);
  if (!fs.existsSync(p)) return [];
  return parseCsv(fs.readFileSync(p, "utf8")).map((r) => ({
    seed: num(r.seed), move: num(r.move), tierBefore: r.tierBefore,
    altProteinPts: r.altProteinPts === "" ? null : num(r.altProteinPts),
    altCarbPts: r.altCarbPts === "" ? null : num(r.altCarbPts),
  }));
}

function median(arr) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function pctile(arr, p) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))))];
}

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

function svgHistogram(values, opts) {
  opts = opts || {};
  const w = opts.w || 360, h = opts.h || 140, bins = opts.bins || 20;
  const max = opts.max != null ? opts.max : Math.max(1, ...values);
  const min = 0;
  const binW = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);
  values.forEach((v) => {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / binW)));
    counts[idx]++;
  });
  const maxCount = Math.max(1, ...counts);
  const barW = w / bins;
  const bars = counts.map((c, i) => {
    const bh = (c / maxCount) * (h - 20);
    const x = i * barW;
    const y = h - bh - 15;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barW - 1).toFixed(1)}" height="${bh.toFixed(1)}" fill="var(--bar)" />`;
  }).join("");
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${bars}
    <text x="0" y="${h - 2}" font-size="9" fill="var(--fg-dim)">0</text>
    <text x="${w - 20}" y="${h - 2}" font-size="9" fill="var(--fg-dim)">${max}</text>
  </svg>`;
}

function svgStackedBars(rows, keys, colors, opts) {
  opts = opts || {};
  const w = opts.w || 420, h = opts.h || 28, gap = 4;
  const barH = h;
  let svg = `<svg viewBox="0 0 ${w} ${rows.length * (barH + gap)}" width="${w}" height="${rows.length * (barH + gap)}">`;
  rows.forEach((row, ri) => {
    const total = keys.reduce((s, k) => s + (row.values[k] || 0), 0) || 1;
    let x = 90;
    const y = ri * (barH + gap);
    svg += `<text x="0" y="${y + barH / 2 + 4}" font-size="11" fill="var(--fg)">${esc(row.label)}</text>`;
    keys.forEach((k, ki) => {
      const frac = (row.values[k] || 0) / total;
      const bw = frac * (w - 90);
      svg += `<rect x="${x.toFixed(1)}" y="${y}" width="${bw.toFixed(1)}" height="${barH}" fill="${colors[ki]}" />`;
      x += bw;
    });
  });
  svg += "</svg>";
  return svg;
}

function headlineTable(allRuns) {
  const rowsHtml = BOTS.map((bot) => {
    const rows = allRuns[bot];
    if (!rows.length) return "";
    const scores = rows.map((r) => r.score);
    const moves = rows.map((r) => r.moves);
    const pctBudget = rows.filter((r) => r.endReason === "budget").length / rows.length;
    const avgFrenzies = rows.reduce((a, r) => a + r.frenzies, 0) / rows.length;
    const pctTierUp = rows.filter((r) => r.tierUpsSeen > 0).length / rows.length;
    const medDryGap = median(rows.map((r) => r.longestDryGap));
    return `<tr><td>${bot}</td><td>${median(scores).toFixed(0)}</td>
      <td>${pctile(scores, 10).toFixed(0)}–${pctile(scores, 90).toFixed(0)}</td>
      <td>${median(moves).toFixed(0)}</td>
      <td>${(pctBudget * 100).toFixed(0)}%</td>
      <td>${avgFrenzies.toFixed(2)}</td>
      <td>${(pctTierUp * 100).toFixed(0)}%</td>
      <td>${medDryGap.toFixed(0)}</td></tr>`;
  }).join("");
  return `<table><thead><tr><th>bot</th><th>median score</th><th>p10–p90</th><th>median moves</th>
    <th>% budget end</th><th>avg frenzies</th><th>% tier-up</th><th>median dry gap</th></tr></thead>
    <tbody>${rowsHtml}</tbody></table>`;
}

function main() {
  const allRuns = {};
  BOTS.forEach((b) => { allRuns[b] = loadRuns(b); });

  const sections = [];

  sections.push(`<section><h2>1. Headline</h2>${headlineTable(allRuns)}</section>`);

  // 2. Score distributions
  const scoreMax = Math.max(...BOTS.flatMap((b) => allRuns[b].map((r) => r.score)), 1000);
  const scoreCharts = BOTS.map((b) => {
    const values = allRuns[b].map((r) => r.score);
    return `<div class="chart"><h4>${b}</h4>${svgHistogram(values, { max: scoreMax })}</div>`;
  }).join("");
  sections.push(`<section><h2>2. Score distributions</h2><div class="grid">${scoreCharts}</div></section>`);

  // 3. Choice reality (from moves CSVs)
  const tierChoiceHtml = BOTS.map((b) => {
    const moves = loadMoves(b);
    const byTier = { crash: { carb: 0, protein: 0, none: 0 }, normal: { carb: 0, protein: 0, none: 0 },
      keto: { carb: 0, protein: 0, none: 0 }, deep: { carb: 0, protein: 0, none: 0 }, frenzy: { carb: 0, protein: 0, none: 0 } };
    moves.forEach((m) => {
      const t = byTier[m.tierBefore] || byTier.normal;
      if (m.altProteinPts === null) t.none++;
      else if (m.altCarbPts !== null && m.altCarbPts > m.altProteinPts) t.carb++;
      else t.protein++;
    });
    const rows = Object.keys(byTier).map((tier) => ({ label: tier, values: byTier[tier] }));
    return `<div class="chart"><h4>${b}</h4>${svgStackedBars(rows, ["carb", "protein", "none"], ["#e07a5f", "#81b29a", "#ccc"], { w: 380 })}</div>`;
  }).join("");
  sections.push(`<section><h2>3. Choice reality (carb pays more / protein pays more / no protein move), by tier held</h2>
    <p class="legend"><span style="color:#e07a5f">■</span> carb pays more &nbsp; <span style="color:#81b29a">■</span> protein pays more &nbsp; <span style="color:#ccc">■</span> no protein move</p>
    <div class="grid">${tierChoiceHtml}</div></section>`);

  // 4. Rhythm
  const dryGapMax = Math.max(...["casual", "ketoBig"].flatMap((b) => allRuns[b].map((r) => r.longestDryGap)), 10);
  const dryGapCharts = ["casual", "ketoBig"].map((b) => {
    const values = allRuns[b].map((r) => r.longestDryGap);
    return `<div class="chart"><h4>${b}</h4>${svgHistogram(values, { max: dryGapMax, bins: 15 })}</div>`;
  }).join("");
  const densityRows = BOTS.map((b) => {
    const rows = allRuns[b];
    const density = rows.reduce((a, r) => a + (r.moves ? r.rewardEvents / r.moves * 10 : 0), 0) / (rows.length || 1);
    return `<tr><td>${b}</td><td>${density.toFixed(2)}</td></tr>`;
  }).join("");
  sections.push(`<section><h2>4. Rhythm</h2>
    <h3>Longest dry gap (casual, ketoBig)</h3><div class="grid">${dryGapCharts}</div>
    <h3>Reward density (events per 10 moves)</h3>
    <table><thead><tr><th>bot</th><th>reward events / 10 moves</th></tr></thead><tbody>${densityRows}</tbody></table>
  </section>`);

  // 5. Endings
  const endStateRows = BOTS.map((b) => {
    const rows = allRuns[b];
    const counts = { crash: 0, normal: 0, keto: 0, deep: 0, frenzy: 0 };
    rows.forEach((r) => { counts[r.endState] = (counts[r.endState] || 0) + 1; });
    return { label: b, values: counts };
  });
  const nearMissRows = BOTS.map((b) => {
    const rows = allRuns[b];
    const nearMiss = rows.filter((r) => r.nearMissNoFrenzy).length / (rows.length || 1);
    const endedNear = rows.filter((r) => r.endedWithin5OfFrenzy).length / (rows.length || 1);
    const fellBack = rows.filter((r) => r.fellBackWithoutFrenzy).length / (rows.length || 1);
    const lastReward = rows.filter((r) => r.lastMoveWasReward).length / (rows.length || 1);
    return `<tr><td>${b}</td><td>${(nearMiss * 100).toFixed(1)}%</td><td>${(endedNear * 100).toFixed(1)}%</td>
      <td>${(fellBack * 100).toFixed(1)}%</td><td>${(lastReward * 100).toFixed(1)}%</td></tr>`;
  }).join("");
  sections.push(`<section><h2>5. Endings</h2>
    <h3>End state distribution</h3>
    ${svgStackedBars(endStateRows, ["crash", "normal", "keto", "deep", "frenzy"], ["#ff6b6b", "#ffd23f", "#4ade80", "#38bdf8", "#c084fc"], { w: 480 })}
    <p class="legend"><span style="color:#ff6b6b">■</span> crash <span style="color:#ffd23f">■</span> normal <span style="color:#4ade80">■</span> keto <span style="color:#38bdf8">■</span> deep <span style="color:#c084fc">■</span> frenzy</p>
    <h3>Near misses and final-move payoff</h3>
    <table><thead><tr><th>bot</th><th>peak 90-99 &amp; 0 frenzies</th><th>ended within 5 of frenzy</th>
      <th>ever sat 95-99 then fell back</th><th>final move was a reward event</th></tr></thead><tbody>${nearMissRows}</tbody></table>
  </section>`);

  // 6. Climb variability - real climbLengths (moves from entering keto to 100).
  const climbRows = BOTS.map((b) => {
    const all = allRuns[b].flatMap((r) => r.climbLengths);
    if (!all.length) return `<tr><td>${b}</td><td colspan="5">no climbs recorded</td></tr>`;
    return `<tr><td>${b}</td><td>${all.length}</td><td>${median(all).toFixed(1)}</td>
      <td>${pctile(all, 10)}</td><td>${pctile(all, 90)}</td><td>${Math.max(...all)}</td></tr>`;
  }).join("");
  const climbHistBots = ["ketoBig", "lookahead", "casual"];
  const climbAll = climbHistBots.flatMap((b) => allRuns[b].flatMap((r) => r.climbLengths));
  const climbMax = Math.max(10, ...climbAll);
  const climbCharts = climbHistBots.map((b) => {
    const v = allRuns[b].flatMap((r) => r.climbLengths);
    return `<div class="chart"><h4>${b} (n=${v.length})</h4>${svgHistogram(v, { max: climbMax, bins: 15 })}</div>`;
  }).join("");
  sections.push(`<section><h2>6. Climb variability (moves from entering keto &ge;70 to hitting 100)</h2>
    <table><thead><tr><th>bot</th><th>climbs</th><th>median</th><th>p10</th><th>p90</th><th>max</th></tr></thead>
    <tbody>${climbRows}</tbody></table>
    <div class="grid">${climbCharts}</div></section>`);

  // 6b. Skill spread, luck overlap, tier occupancy, frenzy value, crash rate.
  const randomBySeed = {};
  allRuns.random.forEach((r) => { randomBySeed[r.seed] = r; });
  const lookaheadBySeed = {};
  allRuns.lookahead.forEach((r) => { lookaheadBySeed[r.seed] = r; });
  const randomMed = median(allRuns.random.map((r) => r.score)) || 1;
  const skillRows = BOTS.map((b) => {
    const rows = allRuns[b];
    const sc = rows.map((r) => r.score);
    const mv = rows.map((r) => r.moves);
    const neverTierUp = rows.filter((r) => r.tierUpsSeen === 0).length / rows.length;
    const firstUp = rows.filter((r) => r.firstTierUpMove > 0).map((r) => r.firstTierUpMove);
    const beatsRandom = rows.filter((r) => randomBySeed[r.seed] && r.score > randomBySeed[r.seed].score).length / rows.length;
    const fzPts = rows.reduce((a, r) => a + r.ptsInFrenzy, 0);
    const fzMv = rows.reduce((a, r) => a + r.movesInFrenzy, 0);
    const outPts = rows.reduce((a, r) => a + r.ptsOutside, 0);
    const outMv = rows.reduce((a, r) => a + r.movesOutside, 0);
    return `<tr><td>${b}</td>
      <td>${median(sc).toFixed(0)}</td><td>${(median(sc) / randomMed).toFixed(2)}x</td>
      <td>${median(mv)}</td><td>${pctile(mv, 90)}</td><td>${Math.max(...mv)}</td>
      <td>${(beatsRandom * 100).toFixed(0)}%</td>
      <td>${(neverTierUp * 100).toFixed(1)}%</td>
      <td>${firstUp.length ? median(firstUp).toFixed(0) : "-"}</td>
      <td>${(rows.filter((r) => r.crashed).length / rows.length * 100).toFixed(1)}%</td>
      <td>${fzMv ? (fzPts / fzMv).toFixed(0) : "-"}</td>
      <td>${outMv ? (outPts / outMv).toFixed(0) : "-"}</td>
      <td>${(fzPts + outPts) ? (fzPts / (fzPts + outPts) * 100).toFixed(1) + "%" : "-"}</td></tr>`;
  }).join("");
  const randBeatsKetoBig = allRuns.ketoBig.filter((r) => randomBySeed[r.seed] && randomBySeed[r.seed].score > r.score).length / (allRuns.ketoBig.length || 1);
  const casualBeatsLook = allRuns.casual.filter((r) => lookaheadBySeed[r.seed] && r.score > lookaheadBySeed[r.seed].score).length / (allRuns.casual.length || 1);
  const occRows = BOTS.map((b) => {
    const rows = allRuns[b];
    const avg = (k) => (rows.reduce((a, r) => a + r[k], 0) / rows.length * 100).toFixed(1) + "%";
    return `<tr><td>${b}</td><td>${avg("pctCrash")}</td><td>${avg("pctNormal")}</td><td>${avg("pctKeto")}</td><td>${avg("pctDeep")}</td><td>${avg("pctFrenzy")}</td></tr>`;
  }).join("");
  sections.push(`<section><h2>6b. Skill spread, run length, first good thing, frenzy value</h2>
    <table><thead><tr><th>bot</th><th>median score</th><th>vs random</th><th>median moves</th><th>p90 moves</th><th>max moves</th>
      <th>% seeds beating random</th><th>% runs never tier-up</th><th>median move of 1st tier-up</th><th>% runs that crash</th>
      <th>pts/move in frenzy</th><th>pts/move outside</th><th>frenzy share of score</th></tr></thead>
    <tbody>${skillRows}</tbody></table>
    <p class="legend">Luck overlap (paired by seed): random beats ketoBig on ${(randBeatsKetoBig * 100).toFixed(1)}% of seeds;
      casual beats lookahead on ${(casualBeatsLook * 100).toFixed(1)}% of seeds.</p>
    <h3>Tier occupancy (mean share of a run's moves, by state at end of move)</h3>
    <table><thead><tr><th>bot</th><th>crash</th><th>normal</th><th>keto</th><th>deep</th><th>frenzy</th></tr></thead>
    <tbody>${occRows}</tbody></table></section>`);

  // 7. Sensitivity heat map
  let sweepHtml = "<p>No sweep data found.</p>";
  const sweepPath = path.join(RESULTS_DIR, "sweep.csv");
  if (fs.existsSync(sweepPath)) {
    const sweep = parseCsv(fs.readFileSync(sweepPath, "utf8"));
    const baseline = {}; // knob -> bot -> baseline medianMoves/medianScore
    const shippedVal = { "refund.deep": "2", "refund.keto": "2", "refund.frenzy": "5", moveBudget: "30", drain: "2/3", sugarRush: "1.5", frenzyMoves: "5", frenzyLand: "70", carbLoss: "3", proteinGain: "4" };
    sweep.forEach((r) => {
      if (r.value === shippedVal[r.knob]) {
        baseline[r.knob] = baseline[r.knob] || {};
        baseline[r.knob][r.bot] = r;
      }
    });
    const metrics = [
      { key: "medianMoves", label: "median moves" },
      { key: "medianScore", label: "median score" },
      { key: "pctRunsWithFrenzy", label: "% frenzy runs" },
      { key: "pctRunsWithTierUp", label: "% tier-up runs" },
    ];
    const knobs = [...new Set(sweep.map((r) => r.knob))];
    let rowsHtml = "";
    knobs.forEach((knob) => {
      const values = [...new Set(sweep.filter((r) => r.knob === knob).map((r) => r.value))];
      values.forEach((value) => {
        const cells = ["casual", "ketoBig", "lookahead"].map((bot) => {
          const rec = sweep.find((r) => r.knob === knob && r.value === value && r.bot === bot);
          const base = baseline[knob] && baseline[knob][bot];
          if (!rec) return "<td>-</td>";
          return metrics.map((m) => {
            const v = num(rec[m.key]);
            const b = base ? num(base[m.key]) : v;
            const delta = b ? (v - b) / b : 0;
            const isBase = base === rec;
            const bg = isBase ? "var(--base-cell)" : delta > 0.05 ? "rgba(74,222,128,0.35)" : delta < -0.05 ? "rgba(255,107,107,0.35)" : "transparent";
            return `<td style="background:${bg}" title="${m.label}: ${v}">${typeof v === "number" && v < 1 ? (v * 100).toFixed(0) + "%" : v.toFixed ? v.toFixed(1) : v}</td>`;
          }).join("");
        }).join("<td class='sep'></td>");
        rowsHtml += `<tr><td>${knob}</td><td>${value}${value === shippedVal[knob] ? " (shipped)" : ""}</td>${cells}</tr>`;
      });
    });
    const header = ["casual", "ketoBig", "lookahead"].map((b) => `<th colspan="4">${b}</th>`).join("<th class='sep'></th>");
    const subheader = ["casual", "ketoBig", "lookahead"].map(() => metrics.map((m) => `<th>${m.label}</th>`).join("")).join("<th class='sep'></th>");
    sweepHtml = `<table class="sweep"><thead><tr><th>knob</th><th>value</th>${header}</tr><tr><th></th><th></th>${subheader}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
  }
  sections.push(`<section><h2>7. Sensitivity sweep (colour = change vs shipped baseline)</h2>${sweepHtml}</section>`);

  // 8. Flags
  const flags = [];
  BOTS.forEach((b) => {
    const rows = allRuns[b];
    if (!rows.length) return;
    const moves = rows.map((r) => r.moves);
    const p90 = pctile(moves, 90);
    const max = Math.max(...moves);
    if (p90 > 400) flags.push(`${b}: p90 moves ${p90} > 400 (runaway check)`);
    if (max > 1500) flags.push(`${b}: max moves ${max} > 1500 (runaway check)`);
  });
  const randomMedianScore = median(allRuns.random.map((r) => r.score));
  BOTS.forEach((b) => {
    if (b === "random") return;
    const med = median(allRuns[b].map((r) => r.score));
    if (med <= randomMedianScore) flags.push(`${b}: median score ${med.toFixed(0)} does not beat random (${randomMedianScore.toFixed(0)})`);
  });
  const casualDryGapP90 = pctile(allRuns.casual.map((r) => r.longestDryGap), 90);
  if (casualDryGapP90 > 12) flags.push(`casual: dry gap p90 ${casualDryGapP90} > 12`);
  const sanity = { keto: median(allRuns.keto.map((r) => r.moves)), ketoBig: median(allRuns.ketoBig.map((r) => r.moves)) };
  flags.push(`sanity check: keto median moves = ${sanity.keto}, ketoBig median moves = ${sanity.ketoBig}. `
    + `The GDD's ~134 / ~170 were measured under the pre-v20 meterFrozen carb waiver (removed in commit 761edc3) `
    + `and do NOT apply to the shipped rules; reproducing that waiver in this engine gives 155 / 171. See FINDINGS.md.`);
  const casualNeverTierUp = allRuns.casual.filter((r) => r.tierUpsSeen === 0).length / (allRuns.casual.length || 1);
  if (casualNeverTierUp > 0.25) flags.push(`casual: ${(casualNeverTierUp * 100).toFixed(1)}% of runs never see a tier-up`);
  const casualFrenzy = allRuns.casual.filter((r) => r.frenzies > 0).length / (allRuns.casual.length || 1);
  if (casualFrenzy < 0.25) flags.push(`casual: only ${(casualFrenzy * 100).toFixed(1)}% of runs ever see a frenzy`);
  BOTS.forEach((b) => {
    const rows = allRuns[b];
    if (!rows.length) return;
    const climbs = rows.flatMap((r) => r.climbLengths);
    if (climbs.length && pctile(climbs, 90) - pctile(climbs, 10) <= 2) {
      flags.push(`${b}: climb length p10-p90 is ${pctile(climbs, 10)}-${pctile(climbs, 90)} (narrow, predictable frenzy)`);
    }
  });

  sections.push(`<section><h2>8. Flags</h2><ul>${flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></section>`);

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Keto Krush sim report</title>
  <style>
    :root { --bg:#fff; --fg:#111; --fg-dim:#888; --bar:#4ade80; --base-cell:#eee; --border:#ddd; }
    @media (prefers-color-scheme: dark) { :root { --bg:#151515; --fg:#eee; --fg-dim:#999; --bar:#4ade80; --base-cell:#333; --border:#333; } }
    body { background:var(--bg); color:var(--fg); font-family: -apple-system, system-ui, sans-serif; padding: 24px; }
    h1 { margin-top: 0; }
    section { margin-bottom: 48px; }
    table { border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid var(--border); padding: 4px 8px; text-align: right; }
    th:first-child, td:first-child { text-align: left; }
    td.sep, th.sep { border: none; padding: 0 6px; }
    .grid { display: flex; flex-wrap: wrap; gap: 16px; }
    .chart { border: 1px solid var(--border); padding: 8px; }
    .chart h4 { margin: 0 0 6px; font-size: 12px; }
    .legend { font-size: 12px; color: var(--fg-dim); }
    table.sweep th, table.sweep td { font-size: 11px; padding: 2px 5px; }
  </style></head><body>
  <h1>Keto Krush simulation report</h1>
  <p class="legend">Generated ${new Date().toISOString()}. Numbers and pictures only — see SIM-NOTES.md for interpretation.</p>
  ${sections.join("\n")}
  </body></html>`;

  fs.writeFileSync(OUT, html);
  console.log("wrote", OUT, (fs.statSync(OUT).size / 1024).toFixed(0) + "KB");
}

main();
