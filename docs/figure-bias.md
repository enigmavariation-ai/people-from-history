# Figure pool — bias audit

_986 enabled figures_

## Difficulty

| Difficulty | Count | Share |
| --- | --- | --- |
| medium | 713 | 72.3% |
| hard | 157 | 15.9% |
| easy | 116 | 11.8% |

## Continent (region keyword match)

| Continent | Count | Share |
| --- | --- | --- |
| Europe | 467 | 47.4% |
| North America | 239 | 24.2% |
| Asia | 125 | 12.7% |
| Other / unmapped | 102 | 10.3% |
| Africa | 51 | 5.2% |
| South America | 25 | 2.5% |
| Oceania | 6 | 0.6% |

_Total tagged across continents ≥ 986 because dual-region rows like "Germany / USA" hit two buckets._

## Era bucket

| Era | Count | Share |
| --- | --- | --- |
| 20th century | 429 | 43.5% |
| 19th century | 171 | 17.3% |
| 21st century | 88 | 8.9% |
| Renaissance (15th–16th) | 82 | 8.3% |
| Ancient / Classical | 78 | 7.9% |
| Medieval (5th–14th) | 50 | 5.1% |
| 18th century | 42 | 4.3% |
| 17th century | 42 | 4.3% |
| Unclassified | 4 | 0.4% |

## Field (top 20)

| Field | Count | Share |
| --- | --- | --- |
| Politics | 157 | 15.9% |
| Royalty | 117 | 11.9% |
| Literature | 114 | 11.6% |
| Music | 97 | 9.8% |
| Painting | 63 | 6.4% |
| Philosophy | 60 | 6.1% |
| Film | 54 | 5.5% |
| Poetry | 33 | 3.3% |
| Military | 31 | 3.1% |
| Religion | 31 | 3.1% |
| Physics | 29 | 2.9% |
| Mathematics | 18 | 1.8% |
| Activism | 15 | 1.5% |
| Exploration | 13 | 1.3% |
| Invention | 11 | 1.1% |
| Medicine | 10 | 1.0% |
| Art | 8 | 0.8% |
| Baseball | 8 | 0.8% |
| Business | 7 | 0.7% |
| Architecture | 7 | 0.7% |

## Inferred gender (pronoun heuristic from summary)

| Gender | Count | Share |
| --- | --- | --- |
| Male | 740 | 75.1% |
| Female | 127 | 12.9% |
| Unknown | 119 | 12.1% |

## Difficulty × Continent

|  | North America | Europe | Asia | South America | Africa | Oceania | Other / unmapped | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **easy** | 43 | 42 | 12 | 3 | 5 | 0 | 14 | 119 |
| **medium** | 176 | 352 | 74 | 20 | 31 | 5 | 76 | 734 |
| **hard** | 20 | 73 | 39 | 2 | 15 | 1 | 12 | 162 |

## Difficulty × Era

|  | 21st century | 20th century | 19th century | 18th century | 17th century | Renaissance (15th–16th) | Medieval (5th–14th) | Ancient / Classical | Unclassified | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **easy** | 13 | 68 | 13 | 6 | 4 | 5 | 1 | 6 | 0 | 116 |
| **medium** | 69 | 326 | 141 | 30 | 31 | 51 | 20 | 44 | 1 | 713 |
| **hard** | 6 | 35 | 17 | 6 | 7 | 26 | 29 | 28 | 3 | 157 |

## Easy-tier gaps

- Oceania — 0 in Easy, 5 Medium + 1 Hard

## Top 10 fields in Easy

| Field | Easy count | Share of Easy |
| --- | --- | --- |
| Politics | 29 | 25.0% |
| Music | 14 | 12.1% |
| Royalty | 13 | 11.2% |
| Film | 10 | 8.6% |
| Religion | 7 | 6.0% |
| Art | 4 | 3.4% |
| Literature | 4 | 3.4% |
| Philosophy | 3 | 2.6% |
| Football | 2 | 1.7% |
| Physics | 2 | 1.7% |

## Top 10 regions in Easy

| Region (raw) | Easy count | Share of Easy |
| --- | --- | --- |
| USA | 38 | 32.8% |
| United Kingdom | 11 | 9.5% |
| Russia | 7 | 6.0% |
| Germany | 6 | 5.2% |
| France | 5 | 4.3% |
| Italy | 4 | 3.4% |
| England | 4 | 3.4% |
| Austria | 4 | 3.4% |
| India | 3 | 2.6% |
| Egypt | 2 | 1.7% |

## Notes

- Continent tagging uses keyword matches against `region`; a row like "Germany / USA" counts in both Europe and North America. The `Total` column in cross-tabs therefore sums to more than the figure count.
- Era bucketing reads keywords from `era`; mismatches go to "Unclassified" so we can spot label-hygiene issues.
- Gender is inferred from pronoun frequency in `summary`. It misses figures described in the passive voice or with non-binary identities; treat as a rough skew check, not ground truth.
