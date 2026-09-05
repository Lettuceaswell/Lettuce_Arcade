import io, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
p = 'report.js'
s = io.open(p, encoding='utf-8').read()

old = """    longestDryGap: num(r.longestDryGap), rewardEvents: num(r.rewardEvents),
  }));"""
new = """    longestDryGap: num(r.longestDryGap), rewardEvents: num(r.rewardEvents),
    ptsCrash: num(r.ptsCrash), ptsNormal: num(r.ptsNormal), ptsKeto: num(r.ptsKeto),
    ptsDeep: num(r.ptsDeep), ptsFrenzy: num(r.ptsFrenzy),
    nearMissNoFrenzy: bool(r.nearMissNoFrenzy),
    fellBackWithoutFrenzy: bool(r.fellBackWithoutFrenzy),
    lastMoveWasReward: bool(r.lastMoveWasReward),
    ptsInFrenzy: num(r.ptsInFrenzy), movesInFrenzy: num(r.movesInFrenzy),
    ptsOutside: num(r.ptsOutside), movesOutside: num(r.movesOutside),
    climbCount: num(r.climbCount),
    climbLengths: (r.climbLengths || "").split("|").filter(Boolean).map(Number),
  }));"""
assert old in s
s = s.replace(old, new)

start = s.index("  // 6. Climb variability")
end = s.index("  // 7. Sensitivity heat map")
old6 = s[start:end]

new6 = r"""  // 6. Climb variability - real climbLengths (moves from entering keto to 100).
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

"""
s = s.replace(old6, new6)

old = """    const nearMiss = rows.filter((r) => r.peakMeter >= 90 && r.peakMeter <= 99 && r.frenzies === 0).length / (rows.length || 1);
    const everSat95 = rows.filter((r) => r.endedWithin5OfFrenzy).length / (rows.length || 1);
    return `<tr><td>${b}</td><td>${(nearMiss * 100).toFixed(1)}%</td><td>${(everSat95 * 100).toFixed(1)}%</td></tr>`;"""
new = """    const nearMiss = rows.filter((r) => r.nearMissNoFrenzy).length / (rows.length || 1);
    const endedNear = rows.filter((r) => r.endedWithin5OfFrenzy).length / (rows.length || 1);
    const fellBack = rows.filter((r) => r.fellBackWithoutFrenzy).length / (rows.length || 1);
    const lastReward = rows.filter((r) => r.lastMoveWasReward).length / (rows.length || 1);
    return `<tr><td>${b}</td><td>${(nearMiss * 100).toFixed(1)}%</td><td>${(endedNear * 100).toFixed(1)}%</td>
      <td>${(fellBack * 100).toFixed(1)}%</td><td>${(lastReward * 100).toFixed(1)}%</td></tr>`;"""
assert old in s
s = s.replace(old, new)

old = """    <h3>Near-miss rates (peak 90-99, zero frenzies / ended within 5 of frenzy with none after)</h3>
    <table><thead><tr><th>bot</th><th>peak 90-99 &amp; 0 frenzies</th><th>ended within 5 of frenzy</th></tr></thead><tbody>${nearMissRows}</tbody></table>"""
new = """    <h3>Near misses and final-move payoff</h3>
    <table><thead><tr><th>bot</th><th>peak 90-99 &amp; 0 frenzies</th><th>ended within 5 of frenzy</th>
      <th>ever sat 95-99 then fell back</th><th>final move was a reward event</th></tr></thead><tbody>${nearMissRows}</tbody></table>"""
assert old in s
s = s.replace(old, new)

old = """  const sanity = { keto: median(allRuns.keto.map((r) => r.moves)), ketoBig: median(allRuns.ketoBig.map((r) => r.moves)) };
  flags.push(`sanity check: keto median moves = ${sanity.keto}, ketoBig median moves = ${sanity.ketoBig} (GDD historical, pre-v28: ~134 / ~170 — see SIM-NOTES.md for the investigation)`);"""
new = r"""  const sanity = { keto: median(allRuns.keto.map((r) => r.moves)), ketoBig: median(allRuns.ketoBig.map((r) => r.moves)) };
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
  });"""
assert old in s
s = s.replace(old, new)

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print("report.js patched")
