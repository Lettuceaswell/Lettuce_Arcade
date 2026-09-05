
### Headline (2,000 runs/bot, seeds 1-2000, shipped config)

| bot | median score | p10-p90 score | vs random | median moves | p90 moves | max moves | % budget end | avg frenzies | % runs w/ frenzy | % runs w/ tier-up | median dry gap |
|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 2824 | 1680-6890 | 1.00x | 25 | 42 | 97 | 94.1% | 0.130 | 10.0% | 93.0% | 6 |
| greedy | 3422.5 | 1975-9195 | 1.21x | 27 | 45 | 113 | 93.3% | 0.176 | 13.4% | 95.8% | 5 |
| keto | 4123 | 2116-10775 | 1.46x | 33 | 53 | 113 | 94.3% | 0.283 | 23.3% | 94.8% | 6 |
| ketoBig | 4533 | 2362-12300 | 1.61x | 31 | 54 | 139 | 93.3% | 0.340 | 24.6% | 96.3% | 5 |
| tempted_1_0 | 3144 | 1923-7880 | 1.11x | 25 | 41 | 87 | 96.0% | 0.144 | 10.6% | 97.3% | 5 |
| tempted_1_25 | 3336.5 | 1993-9196 | 1.18x | 25 | 45 | 121 | 94.6% | 0.176 | 12.8% | 96.4% | 5 |
| tempted_1_5 | 3352.5 | 1993-9295 | 1.19x | 27 | 45 | 121 | 94.5% | 0.181 | 13.3% | 96.3% | 5 |
| tempted_2_0 | 4083 | 2278-10615 | 1.45x | 29 | 50 | 102 | 95.0% | 0.240 | 17.8% | 97.0% | 5 |
| lookahead | 6238 | 3190-22491 | 2.21x | 31 | 66 | 200 | 94.2% | 0.510 | 27.5% | 95.0% | 5 |
| casual | 3245 | 1911-8520 | 1.15x | 27 | 46 | 121 | 94.3% | 0.167 | 12.8% | 94.2% | 5 |

### Tier occupancy (mean share of a run's moves, state at end of move)

| bot | crash | normal | keto | deep | frenzy |
|---|---|---|---|---|---|
| random | 17.9% | 75.6% | 4.4% | 0.7% | 1.3% |
| greedy | 19.1% | 73.2% | 5.0% | 0.8% | 1.9% |
| keto | 11.4% | 74.5% | 9.4% | 1.7% | 3.0% |
| ketoBig | 13.3% | 72.8% | 8.6% | 1.8% | 3.5% |
| tempted_1_0 | 25.7% | 68.9% | 3.4% | 0.5% | 1.6% |
| tempted_1_25 | 22.6% | 70.8% | 4.2% | 0.6% | 1.8% |
| tempted_1_5 | 22.6% | 70.8% | 4.2% | 0.6% | 1.8% |
| tempted_2_0 | 16.4% | 73.2% | 6.9% | 1.2% | 2.4% |
| lookahead | 10.5% | 75.3% | 8.7% | 1.5% | 4.0% |
| casual | 15.8% | 75.7% | 5.9% | 0.9% | 1.7% |

### Dopamine: dry gaps, reward density, first good thing

| bot | median longest dry gap | p90 longest dry gap | reward events /10 moves | % runs never tier-up | median move of 1st tier-up | p90 move of 1st tier-up |
|---|---|---|---|---|---|---|
| random | 6 | 9 | 3.75 | 7.0% | 8 | 19 |
| greedy | 5 | 8 | 4.12 | 4.3% | 7 | 16 |
| keto | 6 | 10 | 4.21 | 5.2% | 2 | 14 |
| ketoBig | 5 | 8 | 4.51 | 3.7% | 3 | 14 |
| tempted_1_0 | 5 | 8 | 3.95 | 2.8% | 7 | 16 |
| tempted_1_25 | 5 | 8 | 4.11 | 3.6% | 7 | 16 |
| tempted_1_5 | 5 | 8 | 4.10 | 3.7% | 7 | 16 |
| tempted_2_0 | 5 | 8 | 4.52 | 3.0% | 5 | 16 |
| lookahead | 5 | 8 | 4.83 | 5.0% | 4 | 17 |
| casual | 5 | 9 | 3.98 | 5.9% | 6 | 17 |

### Dopamine: near misses, endings, crash rate

| bot | peak 90-99 & 0 frenzies | ended within 5 of frenzy | ever sat 95-99 then fell back | final move was a reward | % runs that ever crash | % end on lock |
|---|---|---|---|---|---|---|
| random | 10.6% | 0.1% | 9.6% | 34.3% | 84.8% | 5.9% |
| greedy | 12.2% | 0.2% | 12.3% | 39.0% | 88.8% | 6.7% |
| keto | 20.4% | 0.1% | 23.8% | 36.5% | 75.6% | 5.7% |
| ketoBig | 19.1% | 0.1% | 26.0% | 36.6% | 82.5% | 6.7% |
| tempted_1_0 | 9.2% | 0.1% | 8.6% | 40.6% | 95.0% | 4.0% |
| tempted_1_25 | 11.3% | 0.1% | 11.6% | 38.8% | 93.3% | 5.4% |
| tempted_1_5 | 10.8% | 0.1% | 11.9% | 39.1% | 93.5% | 5.5% |
| tempted_2_0 | 16.1% | 0.1% | 18.1% | 40.6% | 87.6% | 5.0% |
| lookahead | 14.9% | 0.1% | 24.3% | 43.3% | 88.3% | 5.8% |
| casual | 14.4% | 0.1% | 12.3% | 37.0% | 82.8% | 5.7% |

### End state distribution (state at the final move)

| bot | crash | normal | keto | deep | frenzy |
|---|---|---|---|---|---|
| random | 30.8% | 68.7% | 0.4% | 0.0% | 0.1% |
| greedy | 30.0% | 69.2% | 0.4% | 0.1% | 0.3% |
| keto | 23.7% | 75.8% | 0.3% | 0.1% | 0.2% |
| ketoBig | 24.9% | 74.4% | 0.4% | 0.0% | 0.4% |
| tempted_1_0 | 31.9% | 67.5% | 0.5% | 0.1% | 0.1% |
| tempted_1_25 | 30.9% | 68.5% | 0.5% | 0.0% | 0.1% |
| tempted_1_5 | 31.4% | 68.0% | 0.5% | 0.0% | 0.1% |
| tempted_2_0 | 27.7% | 71.9% | 0.4% | 0.1% | 0.1% |
| lookahead | 27.0% | 72.3% | 0.5% | 0.1% | 0.1% |
| casual | 26.8% | 72.5% | 0.6% | 0.1% | 0.1% |

### Climb variability (moves from entering keto >=70 to hitting 100) and frenzy value

| bot | climbs recorded | median | p10 | p90 | max | pts/move in frenzy | pts/move outside | frenzy share of total score |
|---|---|---|---|---|---|---|---|---|
| random | 216 | 3 | 2 | 6 | 9 | 555 | 116 | 9.5% |
| greedy | 263 | 3 | 2 | 5 | 11 | 614 | 137 | 11.5% |
| keto | 525 | 4 | 2 | 6 | 18 | 503 | 138 | 13.0% |
| ketoBig | 641 | 3 | 2 | 6 | 12 | 563 | 153 | 15.6% |
| tempted_1_0 | 194 | 3 | 2 | 4 | 8 | 676 | 129 | 11.6% |
| tempted_1_25 | 255 | 3 | 2 | 5 | 10 | 681 | 137 | 12.9% |
| tempted_1_5 | 277 | 3 | 2 | 5 | 10 | 678 | 137 | 13.1% |
| tempted_2_0 | 429 | 3 | 2 | 6 | 11 | 573 | 148 | 12.6% |
| lookahead | 877 | 3 | 2 | 6 | 13 | 844 | 215 | 21.3% |
| casual | 275 | 3 | 2 | 6 | 9 | 608 | 126 | 11.5% |

### Luck overlap (paired by seed)

- random beats ketoBig on **20.3%** of seeds
- casual beats lookahead on **13.8%** of seeds
- movesEarned (refunded moves) median: random=2, greedy=2, keto=8, ketoBig=8, tempted_1_0=0, tempted_1_25=2, tempted_1_5=2, tempted_2_0=4, lookahead=8, casual=2

### Choice reality (all decision points in the moves CSVs, by tier held)


### Choice reality (pooled over all 10 bots)

| tier held | n | carb pays more | protein pays more | equal | no protein move available |
|---|---|---|---|---|---|
| crash | 9200 | 59.7% | 25.8% | 1.6% | 12.9% |
| normal | 48170 | 57.8% | 19.5% | 2.0% | 20.7% |
| keto | 5526 | 51.4% | 15.7% | 2.3% | 30.6% |
| deep | 949 | 45.8% | 13.8% | 2.2% | 38.1% |
| frenzy | 2349 | 52.7% | 18.5% | 2.4% | 26.4% |
