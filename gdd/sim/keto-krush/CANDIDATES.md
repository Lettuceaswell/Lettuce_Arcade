# Keto Krush tuning-experiment candidates

Numbers only, generated from `run-configs.js` output (results/cfg-<name>/,
2,000 runs/bot, seeds 1-2000, same seeds across all configs). `shipped`
reuses the existing `results/` (also 2,000 runs/bot, seeds 1-2000).

Configs: `shipped` (as-is) · `AB` (drain keto 2 / deep 3, moveBudget 30) ·
`ABC1` (AB + specialFloorStep1) · `ABC2` (AB + detonationCarbsFree) ·
`A` (drain 2/3 only) · `B` (moveBudget 30 only).

Runaway warning: flagged inline when p90 moves > 100 or max moves > 300.

## Per-config, per-bot tables

### shipped

| bot | median score | p10-p90 score | vs random | median moves | p90 moves | max moves | % budget end | avg frenzies | % runs w/ frenzy | % ever crash | % end in crash | % never tier-up | median dry gap | % peak 90-99, 0 frenzy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 2824.0 | 1680.0-6890.0 | 1.00x | 25.0 | 42 | 97 | 94.1% | 0.13 | 9.9% | 84.8% | 30.8% | 7.0% | 6.0 | 10.6% |
| casual | 3245.0 | 1911.0-8520.0 | 1.15x | 27.0 | 46 | 121 | 94.3% | 0.17 | 12.8% | 82.8% | 26.8% | 5.8% | 5.0 | 14.4% |
| greedy | 3422.5 | 1975.0-9195.0 | 1.21x | 27.0 | 45 | 113 | 93.3% | 0.18 | 13.4% | 88.8% | 30.0% | 4.3% | 5.0 | 12.2% |
| keto | 4123.0 | 2116.0-10775.0 | 1.46x | 33.0 | 53 | 113 | 94.3% | 0.28 | 23.3% | 75.7% | 23.7% | 5.2% | 6.0 | 20.4% |
| ketoBig | 4533.0 | 2362.0-12300.0 | 1.61x | 31.0 | 54 | 139 | 93.3% | 0.34 | 24.6% | 82.5% | 24.9% | 3.7% | 5.0 | 19.1% |
| lookahead | 6238.0 | 3190.0-22491.0 | 2.21x | 31.0 | 66 | 200 | 94.2% | 0.51 | 27.4% | 88.3% | 27.0% | 5.0% | 5.0 | 14.9% |

### AB

| bot | median score | p10-p90 score | vs random | median moves | p90 moves | max moves | % budget end | avg frenzies | % runs w/ frenzy | % ever crash | % end in crash | % never tier-up | median dry gap | % peak 90-99, 0 frenzy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 3445.5 | 2049.0-8932.0 | 1.00x | 32.0 | 51 | 134 | 93.1% | 0.21 | 15.1% | 88.2% | 29.9% | 4.8% | 6.0 | 10.4% |
| casual | 3980.5 | 2342.0-11205.0 | 1.16x | 34.0 | 57 | 152 | 92.8% | 0.30 | 20.0% | 87.0% | 25.9% | 3.9% | 6.0 | 13.6% |
| greedy | 4162.0 | 2415.0-11609.0 | 1.21x | 32.0 | 55 | 177 | 91.8% | 0.29 | 20.0% | 92.0% | 30.4% | 2.5% | 5.0 | 11.3% |
| keto | 5186.0 | 2625.0-13638.0 | 1.51x | 39.0 | 64 | 119 | 93.3% | 0.52 | 35.5% | 81.5% | 23.3% | 3.4% | 6.0 | 15.8% |
| ketoBig | 5642.5 | 2896.0-15953.0 | 1.64x | 38.0 | 65 | 129 | 92.3% | 0.58 | 36.5% | 87.3% | 26.6% | 1.8% | 5.0 | 15.2% |
| lookahead | 8203.0 | 3911.0-32794.0 | 2.38x | 40.0 | 91 | 246 | 93.4% | 0.96 | 38.7% | 91.7% | 25.4% | 2.8% | 5.0 | 12.6% |

### ABC1

| bot | median score | p10-p90 score | vs random | median moves | p90 moves | max moves | % budget end | avg frenzies | % runs w/ frenzy | % ever crash | % end in crash | % never tier-up | median dry gap | % peak 90-99, 0 frenzy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 3485.5 | 2070.0-9336.0 | 1.00x | 32.0 | 52 | 118 | 93.0% | 0.23 | 15.9% | 87.2% | 27.8% | 5.5% | 6.0 | 10.3% |
| casual | 4062.0 | 2370.0-11625.0 | 1.17x | 34.0 | 58 | 141 | 92.8% | 0.33 | 21.5% | 84.9% | 23.3% | 4.6% | 6.0 | 13.2% |
| greedy | 4272.5 | 2490.0-12710.0 | 1.23x | 32.0 | 58 | 166 | 91.5% | 0.34 | 22.4% | 89.6% | 26.1% | 3.0% | 5.0 | 10.7% |
| keto | 5390.0 | 2640.0-14642.0 | 1.55x | 39.0 | 67 | 146 | 93.0% | 0.58 | 37.7% | 76.8% | 19.8% | 3.5% | 6.0 | 15.4% |
| ketoBig | 6135.5 | 2966.0-18198.0 | 1.76x | 40.0 | 70 | 176 | 92.0% | 0.72 | 40.3% | 80.6% | 21.6% | 2.9% | 6.0 | 13.9% |
| lookahead | 8805.0 | 4098.0-40855.0 | 2.53x | 42.0 | 100 | 251 | 92.5% | 1.25 | 43.1% | 87.5% | 20.1% | 3.9% | 5.0 | 11.0% |

### ABC2

| bot | median score | p10-p90 score | vs random | median moves | p90 moves | max moves | % budget end | avg frenzies | % runs w/ frenzy | % ever crash | % end in crash | % never tier-up | median dry gap | % peak 90-99, 0 frenzy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 3840.0 | 2127.0-12921.0 | 1.00x | 34.0 | 64 | 164 | 91.8% | 0.45 | 26.3% | 81.9% | 22.6% | 4.2% | 6.0 | 10.1% |
| casual | 4856.5 | 2446.0-17903.0 | 1.26x | 38.0 | 75 | 156 | 91.6% | 0.69 | 35.4% | 80.2% | 17.9% | 3.3% | 6.0 | 12.6% |
| greedy | 6047.0 | 2635.0-22475.0 | 1.57x | 39.0 | 82 | 239 | 89.2% | 0.96 | 43.3% | 82.7% | 17.6% | 2.3% | 6.0 | 9.2% |
| keto | 6553.0 | 2700.0-19543.0 | 1.71x | 43.0 | 81 | 179 | 92.3% | 0.91 | 48.3% | 73.8% | 16.7% | 2.8% | 6.0 | 13.7% |
| ketoBig | 8979.0 | 3153.0-26365.0 | 2.34x | 47.5 | 94 | 254 | 90.2% | 1.36 | 56.1% | 73.6% | 15.9% | 2.1% | 6.0 | 11.1% |
| lookahead | 16998.0 | 4423.0-67745.0 | 4.43x | 58.0 | 151 ⚠️ | 569 ⚠️ | 89.5% | 2.77 | 61.8% | 82.1% | 14.9% | 3.2% | 6.0 | 8.1% |

### A

| bot | median score | p10-p90 score | vs random | median moves | p90 moves | max moves | % budget end | avg frenzies | % runs w/ frenzy | % ever crash | % end in crash | % never tier-up | median dry gap | % peak 90-99, 0 frenzy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 2880.5 | 1685.0-8070.0 | 1.00x | 25.0 | 45 | 129 | 94.2% | 0.20 | 14.2% | 83.9% | 30.4% | 7.0% | 6.0 | 9.5% |
| casual | 3345.0 | 1916.0-10267.0 | 1.16x | 27.0 | 51 | 147 | 94.0% | 0.28 | 19.0% | 81.3% | 25.9% | 5.8% | 6.0 | 13.1% |
| greedy | 3473.5 | 1985.0-10420.0 | 1.21x | 27.0 | 48 | 172 | 93.0% | 0.26 | 18.1% | 88.5% | 29.1% | 4.3% | 5.0 | 10.3% |
| keto | 4467.5 | 2154.0-12860.0 | 1.55x | 33.0 | 58 | 114 | 94.2% | 0.50 | 34.3% | 74.3% | 22.6% | 5.2% | 6.0 | 15.6% |
| ketoBig | 4907.5 | 2385.0-14760.0 | 1.70x | 33.0 | 58 | 124 | 93.0% | 0.55 | 35.0% | 81.8% | 25.6% | 3.7% | 5.0 | 14.8% |
| lookahead | 6773.0 | 3225.0-29460.0 | 2.35x | 33.0 | 80 | 241 | 94.3% | 0.87 | 36.4% | 88.0% | 24.6% | 4.7% | 5.0 | 11.7% |

### B

| bot | median score | p10-p90 score | vs random | median moves | p90 moves | max moves | % budget end | avg frenzies | % runs w/ frenzy | % ever crash | % end in crash | % never tier-up | median dry gap | % peak 90-99, 0 frenzy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 3375.5 | 2030.0-7655.0 | 1.00x | 32.0 | 48 | 102 | 93.3% | 0.14 | 10.5% | 89.3% | 30.1% | 4.8% | 6.0 | 11.7% |
| casual | 3840.5 | 2328.0-9434.0 | 1.14x | 32.0 | 52 | 126 | 93.2% | 0.18 | 13.5% | 88.0% | 25.4% | 3.9% | 6.0 | 15.3% |
| greedy | 4061.0 | 2407.0-10261.0 | 1.20x | 32.0 | 51 | 118 | 92.4% | 0.20 | 14.8% | 92.8% | 30.6% | 2.5% | 5.0 | 13.2% |
| keto | 4744.0 | 2600.0-11513.0 | 1.41x | 38.0 | 59 | 126 | 93.6% | 0.29 | 24.1% | 83.0% | 22.8% | 3.4% | 6.0 | 20.8% |
| ketoBig | 5269.0 | 2880.0-13575.0 | 1.56x | 38.0 | 60 | 144 | 92.5% | 0.36 | 25.4% | 88.0% | 26.9% | 1.8% | 5.0 | 19.9% |
| lookahead | 7485.5 | 3858.0-24798.0 | 2.22x | 38.0 | 76 | 209 | 92.9% | 0.56 | 29.8% | 91.5% | 24.4% | 2.8% | 5.0 | 15.4% |

## Summary: ketoBig vs casual, all configs

| config | bot | median score | skill ratio (ketoBig/casual) | % runs w/ frenzy | % end in crash | median moves |
|---|---|---|---|---|---|---|
| shipped | ketoBig | 4533.0 | 1.40x | 24.6% | 24.9% | 31.0 |
| shipped | casual | 3245.0 | (see above) | 12.8% | 26.8% | 27.0 |
| AB | ketoBig | 5642.5 | 1.42x | 36.5% | 26.6% | 38.0 |
| AB | casual | 3980.5 | (see above) | 20.0% | 25.9% | 34.0 |
| ABC1 | ketoBig | 6135.5 | 1.51x | 40.3% | 21.6% | 40.0 |
| ABC1 | casual | 4062.0 | (see above) | 21.5% | 23.3% | 34.0 |
| ABC2 | ketoBig | 8979.0 | 1.85x | 56.1% | 15.9% | 47.5 |
| ABC2 | casual | 4856.5 | (see above) | 35.4% | 17.9% | 38.0 |
| A | ketoBig | 4907.5 | 1.47x | 35.0% | 25.6% | 33.0 |
| A | casual | 3345.0 | (see above) | 19.0% | 25.9% | 27.0 |
| B | ketoBig | 5269.0 | 1.37x | 25.4% | 26.9% | 38.0 |
| B | casual | 3840.5 | (see above) | 13.5% | 25.4% | 32.0 |

## Paired luck lines (per seed, per config)

- **shipped**: random beats ketoBig on 20.3% of seeds; casual beats lookahead on 13.8% of seeds.
- **AB**: random beats ketoBig on 20.4% of seeds; casual beats lookahead on 12.9% of seeds.
- **ABC1**: random beats ketoBig on 19.1% of seeds; casual beats lookahead on 12.8% of seeds.
- **ABC2**: random beats ketoBig on 18.4% of seeds; casual beats lookahead on 11.8% of seeds.
- **A**: random beats ketoBig on 19.7% of seeds; casual beats lookahead on 14.3% of seeds.
- **B**: random beats ketoBig on 21.1% of seeds; casual beats lookahead on 12.3% of seeds.

