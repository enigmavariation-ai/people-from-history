# Figure pool — bias audit

_1043 enabled figures_

## Difficulty

| Difficulty | Count | Share |
| --- | --- | --- |
| medium | 767 | 73.5% |
| hard | 176 | 16.9% |
| easy | 100 | 9.6% |

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
| Male | 784 | 75.2% |
| Female | 133 | 12.8% |
| Unknown | 126 | 12.1% |

## Difficulty × Continent

|  | North America | Europe | Asia | South America | Africa | Oceania | Other / unmapped | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **easy** | 31 | 38 | 11 | 3 | 6 | 0 | 14 | 103 |
| **medium** | 190 | 381 | 80 | 21 | 33 | 5 | 80 | 790 |
| **hard** | 20 | 83 | 46 | 4 | 15 | 1 | 12 | 181 |

## Difficulty × Era

|  | 21st century | 20th century | 19th century | 18th century | 17th century | Renaissance (15th–16th) | Medieval (5th–14th) | Ancient / Classical | Unclassified | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **easy** | 14 | 55 | 11 | 5 | 3 | 5 | 1 | 6 | 0 | 100 |
| **medium** | 69 | 353 | 151 | 37 | 35 | 51 | 22 | 48 | 1 | 767 |
| **hard** | 6 | 38 | 18 | 9 | 9 | 29 | 34 | 30 | 3 | 176 |

## Easy-tier gaps

- Oceania — 0 in Easy, 5 Medium + 1 Hard

## Top 10 fields in Easy

| Field | Easy count | Share of Easy |
| --- | --- | --- |
| Politics | 23 | 23.0% |
| Music | 13 | 13.0% |
| Royalty | 13 | 13.0% |
| Film | 10 | 10.0% |
| Religion | 8 | 8.0% |
| Art | 4 | 4.0% |
| Literature | 3 | 3.0% |
| Physics | 2 | 2.0% |
| Philosophy | 2 | 2.0% |
| Activism | 2 | 2.0% |

## Top 10 regions in Easy

| Region (raw) | Easy count | Share of Easy |
| --- | --- | --- |
| USA | 26 | 26.0% |
| United Kingdom | 11 | 11.0% |
| Russia | 7 | 7.0% |
| Germany | 5 | 5.0% |
| England | 4 | 4.0% |
| Austria | 4 | 4.0% |
| France | 4 | 4.0% |
| Italy | 3 | 3.0% |
| India | 3 | 3.0% |
| Egypt | 2 | 2.0% |

## Notes

- Continent tagging uses keyword matches against `region`; a row like "Germany / USA" counts in both Europe and North America. The `Total` column in cross-tabs therefore sums to more than the figure count.
- Era bucketing reads keywords from `era`; mismatches go to "Unclassified" so we can spot label-hygiene issues.
- Gender is inferred from pronoun frequency in `summary`. It misses figures described in the passive voice or with non-binary identities; treat as a rough skew check, not ground truth.
