# Figure pool — bias audit

_1043 enabled figures_

## Difficulty

| Difficulty | Count | Share |
| --- | --- | --- |
| medium | 685 | 65.7% |
| easy | 188 | 18.0% |
| hard | 170 | 16.3% |

## Continent (region keyword match)

| Continent | Count | Share |
| --- | --- | --- |
| Europe | 502 | 48.1% |
| North America | 241 | 23.1% |
| Asia | 137 | 13.1% |
| Other / unmapped | 106 | 10.2% |
| Africa | 54 | 5.2% |
| South America | 28 | 2.7% |
| Oceania | 6 | 0.6% |

_Total tagged across continents ≥ 1043 because dual-region rows like "Germany / USA" hit two buckets._

## Era bucket

| Era | Count | Share |
| --- | --- | --- |
| 20th century | 446 | 42.8% |
| 19th century | 180 | 17.3% |
| 21st century | 89 | 8.5% |
| Renaissance (15th–16th) | 85 | 8.1% |
| Ancient / Classical | 84 | 8.1% |
| Medieval (5th–14th) | 57 | 5.5% |
| 18th century | 51 | 4.9% |
| 17th century | 47 | 4.5% |
| Unclassified | 4 | 0.4% |

## Field (top 20)

| Field | Count | Share |
| --- | --- | --- |
| Politics | 166 | 15.9% |
| Royalty | 128 | 12.3% |
| Literature | 117 | 11.2% |
| Music | 107 | 10.3% |
| Philosophy | 66 | 6.3% |
| Painting | 65 | 6.2% |
| Film | 54 | 5.2% |
| Poetry | 36 | 3.5% |
| Religion | 33 | 3.2% |
| Military | 32 | 3.1% |
| Physics | 29 | 2.8% |
| Mathematics | 19 | 1.8% |
| Activism | 16 | 1.5% |
| Exploration | 14 | 1.3% |
| Invention | 11 | 1.1% |
| Medicine | 10 | 1.0% |
| Art | 8 | 0.8% |
| Baseball | 8 | 0.8% |
| Business | 7 | 0.7% |
| Chemistry | 7 | 0.7% |

## Inferred gender (pronoun heuristic from summary)

| Gender | Count | Share |
| --- | --- | --- |
| Male | 508 | 48.7% |
| Unknown | 441 | 42.3% |
| Female | 94 | 9.0% |

## Difficulty × Continent

|  | North America | Europe | Asia | South America | Africa | Oceania | Other / unmapped | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **easy** | 83 | 66 | 13 | 5 | 6 | 1 | 19 | 193 |
| **medium** | 144 | 353 | 78 | 19 | 33 | 4 | 75 | 706 |
| **hard** | 14 | 83 | 46 | 4 | 15 | 1 | 12 | 175 |

## Difficulty × Era

|  | 21st century | 20th century | 19th century | 18th century | 17th century | Renaissance (15th–16th) | Medieval (5th–14th) | Ancient / Classical | Unclassified | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **easy** | 35 | 95 | 28 | 6 | 4 | 9 | 3 | 8 | 0 | 188 |
| **medium** | 51 | 316 | 134 | 36 | 34 | 47 | 20 | 46 | 1 | 685 |
| **hard** | 3 | 35 | 18 | 9 | 9 | 29 | 34 | 30 | 3 | 170 |

## Easy-tier gaps

_(no continents are entirely missing from Easy)_

## Top 10 fields in Easy

| Field | Easy count | Share of Easy |
| --- | --- | --- |
| Politics | 34 | 18.1% |
| Music | 31 | 16.5% |
| Film | 29 | 15.4% |
| Literature | 14 | 7.4% |
| Royalty | 13 | 6.9% |
| Religion | 8 | 4.3% |
| Art | 5 | 2.7% |
| Painting | 5 | 2.7% |
| Comedy | 5 | 2.7% |
| Military | 4 | 2.1% |

## Top 10 regions in Easy

| Region (raw) | Easy count | Share of Easy |
| --- | --- | --- |
| USA | 73 | 38.8% |
| United Kingdom | 15 | 8.0% |
| Russia | 10 | 5.3% |
| France | 8 | 4.3% |
| Germany | 7 | 3.7% |
| Italy | 7 | 3.7% |
| England | 6 | 3.2% |
| Austria | 5 | 2.7% |
| Spain | 3 | 1.6% |
| Argentina | 3 | 1.6% |

## Notes

- Continent tagging uses keyword matches against `region`; a row like "Germany / USA" counts in both Europe and North America. The `Total` column in cross-tabs therefore sums to more than the figure count.
- Era bucketing reads keywords from `era`; mismatches go to "Unclassified" so we can spot label-hygiene issues.
- Gender is inferred from pronoun frequency in `summary`. It misses figures described in the passive voice or with non-binary identities; treat as a rough skew check, not ground truth.
