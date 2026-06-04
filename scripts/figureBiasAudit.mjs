// Bias audit — reads every enabled figure and writes a markdown
// breakdown by difficulty × region × era × field × inferred gender.
// Purpose: surface where the curation pool skews (e.g. "82% of Easy
// is post-1900 USA entertainment") so the next curation pass has a
// real target list, not vibes.
//
// Run:
//   node scripts/figureBiasAudit.mjs > docs/figure-bias.md
//
// Reads VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
// Read-only — no writes.

import { readFileSync } from 'node:fs';

function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}

// ---- Continent mapping --------------------------------------------------

// Hand-rolled mapping from common country / region strings to a
// coarse continent bucket. The `region` column is freeform text
// ("USA", "Germany / USA", "Italy", "Ancient Rome"), so we look for
// any keyword match per row and tag with each continent that hits.
// "USA / Germany" → ["North America", "Europe"].
const CONTINENT_KEYWORDS = {
  'North America': [
    'usa', 'u.s.', 'us ', 'united states', 'america', 'canada', 'mexico',
  ],
  'South America': [
    'argentina', 'brazil', 'chile', 'peru', 'colombia', 'venezuela',
    'bolivia', 'paraguay', 'uruguay', 'south america',
  ],
  Europe: [
    'europe', 'uk', 'britain', 'england', 'scotland', 'wales', 'ireland',
    'france', 'germany', 'italy', 'spain', 'portugal', 'austria',
    'netherlands', 'belgium', 'switzerland', 'sweden', 'norway',
    'denmark', 'finland', 'poland', 'czech', 'hungary', 'romania',
    'bulgaria', 'greece', 'rome', 'roman', 'greek', 'macedon',
    'russia', 'ussr', 'soviet', 'ukraine', 'serbia', 'croatia',
    'iceland', 'lithuania', 'latvia', 'estonia',
  ],
  Africa: [
    'africa', 'egypt', 'south africa', 'nigeria', 'kenya', 'ethiopia',
    'morocco', 'algeria', 'libya', 'tunisia', 'sudan', 'ghana',
    'senegal', 'mali', 'tanzania', 'uganda', 'zimbabwe', 'congo',
  ],
  Asia: [
    'asia', 'china', 'japan', 'korea', 'india', 'pakistan', 'bangladesh',
    'sri lanka', 'mongolia', 'vietnam', 'thailand', 'malaysia',
    'indonesia', 'philippines', 'persia', 'iran', 'iraq', 'turkey',
    'ottoman', 'arabia', 'saudi', 'israel', 'palestine', 'lebanon',
    'syria', 'jordan', 'afghanistan', 'tibet',
  ],
  Oceania: ['australia', 'new zealand', 'oceania', 'polynesia'],
};

function continentsFor(region) {
  if (!region) return ['Unknown'];
  const lower = region.toLowerCase();
  const hits = [];
  for (const [continent, keywords] of Object.entries(CONTINENT_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) hits.push(continent);
  }
  return hits.length > 0 ? hits : ['Other / unmapped'];
}

// ---- Era bucketing ------------------------------------------------------

// Bucket the `era` column into broad time bands. The column itself
// is freeform, so we look for century keywords. Anything unmatched
// goes into "Unclassified" so we can spot label-hygiene issues too.
function eraBucket(era) {
  if (!era) return 'Unclassified';
  const lower = era.toLowerCase();
  if (lower.includes('21st')) return '21st century';
  if (lower.includes('20th')) return '20th century';
  if (lower.includes('19th')) return '19th century';
  if (lower.includes('18th')) return '18th century';
  if (lower.includes('17th')) return '17th century';
  if (lower.includes('renaissance') || lower.includes('16th') || lower.includes('15th'))
    return 'Renaissance (15th–16th)';
  if (lower.includes('medieval') || /1[0-4]th/.test(lower)) return 'Medieval (5th–14th)';
  if (
    lower.includes('classical') ||
    lower.includes('ancient') ||
    lower.includes('bc') ||
    lower.includes('roman') ||
    lower.includes('greek') ||
    lower.includes('egypt')
  )
    return 'Ancient / Classical';
  return 'Unclassified';
}

// ---- Gender inference ---------------------------------------------------

// Trivial heuristic: count gendered pronouns in the figure's summary
// and tag with whichever class wins. Imperfect (mistakes monarchs
// described in passive voice, etc.) but good enough to spot
// systemic skews. Anything with no signal or a tie is "Unknown".
function inferGender(summary) {
  if (!summary || typeof summary !== 'string') return 'Unknown';
  const text = ` ${summary.toLowerCase().replace(/[.,;:!?()'"]/g, ' ')} `;
  const fem = countAll(text, [' she ', ' her ', ' hers ', ' herself ']);
  const masc = countAll(text, [' he ', ' his ', ' him ', ' himself ']);
  if (fem === 0 && masc === 0) return 'Unknown';
  if (fem > masc * 1.2) return 'Female';
  if (masc > fem * 1.2) return 'Male';
  return 'Unknown';
}

function countAll(haystack, needles) {
  return needles.reduce((sum, n) => sum + occurrences(haystack, n), 0);
}

function occurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let i = 0;
  while ((i = haystack.indexOf(needle, i)) !== -1) {
    count++;
    i += needle.length;
  }
  return count;
}

// ---- Data ---------------------------------------------------------------

async function listFigures() {
  // Paginate so we don't hit the 1000-row default cap.
  const pageSize = 500;
  const all = [];
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/figures?select=id,name,difficulty,era,field,region,summary,enabled&order=id.asc`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          Range: `${from}-${to}`,
        },
      },
    );
    if (!res.ok) throw new Error(`list HTTP ${res.status}: ${await res.text()}`);
    const page = await res.json();
    all.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return all.filter((f) => f.enabled !== false);
}

// ---- Tally helpers ------------------------------------------------------

function tally(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const keys = keyFn(item);
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function pct(part, whole) {
  if (whole === 0) return '0.0%';
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function renderTable(headers, rows) {
  const sep = headers.map(() => '---').join(' | ');
  const head = headers.join(' | ');
  const body = rows.map((r) => r.join(' | ')).join('\n');
  return `| ${head} |\n| ${sep} |\n${body
    .split('\n')
    .map((r) => `| ${r} |`)
    .join('\n')}`;
}

// Cross-tabulation: rows × columns, with counts and row totals.
function crossTab(items, rowKey, colKey, rowOrder, colOrder) {
  const cells = new Map(); // "row||col" -> count
  const rowTotals = new Map();
  const colTotals = new Map();
  for (const item of items) {
    const r = rowKey(item);
    const c = colKey(item);
    const cs = Array.isArray(c) ? c : [c];
    for (const cv of cs) {
      const key = `${r}||${cv}`;
      cells.set(key, (cells.get(key) ?? 0) + 1);
      rowTotals.set(r, (rowTotals.get(r) ?? 0) + 1);
      colTotals.set(cv, (colTotals.get(cv) ?? 0) + 1);
    }
  }
  const rows = rowOrder.filter((r) => rowTotals.has(r));
  const cols = colOrder.filter((c) => colTotals.has(c));
  const headers = ['', ...cols, 'Total'];
  const body = rows.map((r) => [
    `**${r}**`,
    ...cols.map((c) => String(cells.get(`${r}||${c}`) ?? 0)),
    String(rowTotals.get(r) ?? 0),
  ]);
  return renderTable(headers, body);
}

// ---- Report -------------------------------------------------------------

function topLines(entries, n) {
  return entries
    .slice(0, n)
    .map(([k, v], i) => `${i + 1}. ${k} — ${v}`)
    .join('\n');
}

function easyGaps(byDifficultyRegion) {
  // Pretty-printed "buckets with 0 in Easy that have rows elsewhere" —
  // a quick "where should we expand the Easy tier?" cheat sheet.
  const gaps = [];
  for (const [continent, counts] of byDifficultyRegion) {
    if ((counts.easy ?? 0) === 0 && (counts.medium ?? 0) + (counts.hard ?? 0) > 0) {
      gaps.push(`- ${continent} — 0 in Easy, ${counts.medium ?? 0} Medium + ${counts.hard ?? 0} Hard`);
    }
  }
  return gaps.length ? gaps.join('\n') : '_(no continents are entirely missing from Easy)_';
}

async function main() {
  const figures = await listFigures();
  const total = figures.length;
  if (total === 0) {
    console.error('No enabled figures found.');
    process.exit(1);
  }

  const lines = [];
  lines.push(`# Figure pool — bias audit`);
  lines.push('');
  lines.push(`_${total} enabled figures_`);
  lines.push('');

  // -- Difficulty --
  const byDifficulty = tally(figures, (f) => f.difficulty ?? 'unknown');
  lines.push('## Difficulty');
  lines.push('');
  lines.push(
    renderTable(
      ['Difficulty', 'Count', 'Share'],
      byDifficulty.map(([k, v]) => [k, String(v), pct(v, total)]),
    ),
  );
  lines.push('');

  // -- Continent --
  const byContinent = tally(figures, (f) => continentsFor(f.region));
  lines.push('## Continent (region keyword match)');
  lines.push('');
  lines.push(
    renderTable(
      ['Continent', 'Count', 'Share'],
      byContinent.map(([k, v]) => [k, String(v), pct(v, total)]),
    ),
  );
  lines.push('');
  lines.push(`_Total tagged across continents ≥ ${total} because dual-region rows like "Germany / USA" hit two buckets._`);
  lines.push('');

  // -- Era --
  const byEra = tally(figures, (f) => eraBucket(f.era));
  lines.push('## Era bucket');
  lines.push('');
  lines.push(
    renderTable(
      ['Era', 'Count', 'Share'],
      byEra.map(([k, v]) => [k, String(v), pct(v, total)]),
    ),
  );
  lines.push('');

  // -- Field --
  const byField = tally(figures, (f) => f.field ?? 'Unknown');
  lines.push('## Field (top 20)');
  lines.push('');
  lines.push(
    renderTable(
      ['Field', 'Count', 'Share'],
      byField.slice(0, 20).map(([k, v]) => [k, String(v), pct(v, total)]),
    ),
  );
  lines.push('');

  // -- Inferred gender --
  const byGender = tally(figures, (f) => inferGender(f.summary));
  lines.push('## Inferred gender (pronoun heuristic from summary)');
  lines.push('');
  lines.push(
    renderTable(
      ['Gender', 'Count', 'Share'],
      byGender.map(([k, v]) => [k, String(v), pct(v, total)]),
    ),
  );
  lines.push('');

  // -- Difficulty × Continent --
  lines.push('## Difficulty × Continent');
  lines.push('');
  lines.push(
    crossTab(
      figures,
      (f) => f.difficulty ?? 'unknown',
      (f) => continentsFor(f.region),
      ['easy', 'medium', 'hard'],
      [
        'North America',
        'Europe',
        'Asia',
        'South America',
        'Africa',
        'Oceania',
        'Other / unmapped',
        'Unknown',
      ],
    ),
  );
  lines.push('');

  // -- Difficulty × Era --
  lines.push('## Difficulty × Era');
  lines.push('');
  lines.push(
    crossTab(
      figures,
      (f) => f.difficulty ?? 'unknown',
      (f) => eraBucket(f.era),
      ['easy', 'medium', 'hard'],
      [
        '21st century',
        '20th century',
        '19th century',
        '18th century',
        '17th century',
        'Renaissance (15th–16th)',
        'Medieval (5th–14th)',
        'Ancient / Classical',
        'Unclassified',
      ],
    ),
  );
  lines.push('');

  // -- Easy gaps --
  const easyByContinent = new Map();
  for (const f of figures) {
    const cs = continentsFor(f.region);
    for (const c of cs) {
      const cur = easyByContinent.get(c) ?? { easy: 0, medium: 0, hard: 0 };
      if (f.difficulty === 'easy') cur.easy++;
      else if (f.difficulty === 'medium') cur.medium++;
      else if (f.difficulty === 'hard') cur.hard++;
      easyByContinent.set(c, cur);
    }
  }
  lines.push('## Easy-tier gaps');
  lines.push('');
  lines.push(easyGaps([...easyByContinent.entries()]));
  lines.push('');

  // -- Top fields by difficulty --
  lines.push('## Top 10 fields in Easy');
  lines.push('');
  const easyFigs = figures.filter((f) => f.difficulty === 'easy');
  const easyFields = tally(easyFigs, (f) => f.field ?? 'Unknown');
  lines.push(
    renderTable(
      ['Field', 'Easy count', 'Share of Easy'],
      easyFields
        .slice(0, 10)
        .map(([k, v]) => [k, String(v), pct(v, easyFigs.length)]),
    ),
  );
  lines.push('');

  // -- Heaviest regions in Easy --
  lines.push('## Top 10 regions in Easy');
  lines.push('');
  const easyRegions = tally(easyFigs, (f) => f.region ?? 'Unknown');
  lines.push(
    renderTable(
      ['Region (raw)', 'Easy count', 'Share of Easy'],
      easyRegions
        .slice(0, 10)
        .map(([k, v]) => [k, String(v), pct(v, easyFigs.length)]),
    ),
  );
  lines.push('');

  // -- Summary --
  lines.push('## Notes');
  lines.push('');
  lines.push(
    '- Continent tagging uses keyword matches against `region`; a row like "Germany / USA" counts in both Europe and North America. The `Total` column in cross-tabs therefore sums to more than the figure count.',
  );
  lines.push(
    '- Era bucketing reads keywords from `era`; mismatches go to "Unclassified" so we can spot label-hygiene issues.',
  );
  lines.push(
    '- Gender is inferred from pronoun frequency in `summary`. It misses figures described in the passive voice or with non-binary identities; treat as a rough skew check, not ground truth.',
  );

  console.log(lines.join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
