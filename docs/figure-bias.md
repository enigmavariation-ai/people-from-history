# Figure pool — bias audit

_650 enabled figures_

## Difficulty

| Difficulty | Count | Share |
| --- | --- | --- |
| medium | 383 | 58.9% |
| easy | 137 | 21.1% |
| hard | 130 | 20.0% |

## Continent (region keyword match)

| Continent | Count | Share |
| --- | --- | --- |
| Europe | 273 | 42.0% |
| North America | 225 | 34.6% |
| Other / unmapped | 82 | 12.6% |
| Asia | 49 | 7.5% |
| Africa | 23 | 3.5% |
| South America | 12 | 1.8% |
| Oceania | 3 | 0.5% |

_Total tagged across continents ≥ 650 because dual-region rows like "Germany / USA" hit two buckets._

## Era bucket

| Era | Count | Share |
| --- | --- | --- |
| 20th century | 301 | 46.3% |
| 19th century | 116 | 17.8% |
| 21st century | 59 | 9.1% |
| Renaissance (15th–16th) | 46 | 7.1% |
| Medieval (5th–14th) | 38 | 5.8% |
| Ancient / Classical | 35 | 5.4% |
| 18th century | 28 | 4.3% |
| 17th century | 23 | 3.5% |
| Unclassified | 4 | 0.6% |

## Field (top 20)

| Field | Count | Share |
| --- | --- | --- |
| Politics | 77 | 11.8% |
| Music | 67 | 10.3% |
| Royalty | 62 | 9.5% |
| Literature | 55 | 8.5% |
| Film | 48 | 7.4% |
| Philosophy | 44 | 6.8% |
| Painting | 44 | 6.8% |
| Physics | 26 | 4.0% |
| Religion | 21 | 3.2% |
| Activism | 16 | 2.5% |
| Military | 15 | 2.3% |
| Mathematics | 14 | 2.2% |
| Poetry | 13 | 2.0% |
| Medicine | 9 | 1.4% |
| Invention | 8 | 1.2% |
| Art | 8 | 1.2% |
| Baseball | 8 | 1.2% |
| Exploration | 8 | 1.2% |
| Business | 6 | 0.9% |
| Television | 6 | 0.9% |

## Inferred gender (pronoun heuristic from summary)

| Gender | Count | Share |
| --- | --- | --- |
| Male | 508 | 78.2% |
| Female | 94 | 14.5% |
| Unknown | 48 | 7.4% |

## Difficulty × Continent

|  | North America | Europe | Asia | South America | Africa | Oceania | Other / unmapped | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **easy** | 81 | 28 | 6 | 3 | 4 | 1 | 16 | 139 |
| **medium** | 132 | 170 | 11 | 7 | 11 | 2 | 61 | 394 |
| **hard** | 12 | 75 | 32 | 2 | 8 | 0 | 5 | 134 |

## Difficulty × Era

|  | 21st century | 20th century | 19th century | 18th century | 17th century | Renaissance (15th–16th) | Medieval (5th–14th) | Ancient / Classical | Unclassified | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **easy** | 33 | 82 | 12 | 2 | 1 | 3 | 1 | 3 | 0 | 137 |
| **medium** | 26 | 201 | 91 | 19 | 13 | 16 | 6 | 10 | 1 | 383 |
| **hard** | 0 | 18 | 13 | 7 | 9 | 27 | 31 | 22 | 3 | 130 |

## Easy-tier gaps

_(no continents are entirely missing from Easy)_

## Top 10 fields in Easy

| Field | Easy count | Share of Easy |
| --- | --- | --- |
| Film | 28 | 20.4% |
| Music | 28 | 20.4% |
| Politics | 27 | 19.7% |
| Literature | 7 | 5.1% |
| Royalty | 7 | 5.1% |
| Comedy | 5 | 3.6% |
| Art | 4 | 2.9% |
| Entertainment | 3 | 2.2% |
| Physics | 2 | 1.5% |
| Religion | 2 | 1.5% |

## Top 10 regions in Easy

| Region (raw) | Easy count | Share of Easy |
| --- | --- | --- |
| USA | 73 | 53.3% |
| United Kingdom | 14 | 10.2% |
| Russia | 6 | 4.4% |
| Italy | 3 | 2.2% |
| France | 3 | 2.2% |
| Egypt | 2 | 1.5% |
| England | 2 | 1.5% |
| Argentina | 2 | 1.5% |
| Germany / USA | 2 | 1.5% |
| North America | 2 | 1.5% |

## Notes

- Continent tagging uses keyword matches against `region`; a row like "Germany / USA" counts in both Europe and North America. The `Total` column in cross-tabs therefore sums to more than the figure count.
- Era bucketing reads keywords from `era`; mismatches go to "Unclassified" so we can spot label-hygiene issues.
- Gender is inferred from pronoun frequency in `summary`. It misses figures described in the passive voice or with non-binary identities; treat as a rough skew check, not ground truth.
