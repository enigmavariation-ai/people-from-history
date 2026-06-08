// One-shot: promote figures from Medium → Easy whose portrait is
// genuinely recognisable to a non-specialist. Second pass after the
// initial promoteEuropeanEasy.mjs round — these are figures the
// previous pass missed (mostly US-icon politicians, the universal
// sports faces, and a few that newly landed in Medium after the
// dedupe).
//
//   node scripts/promoteIconicFaces.mjs
//   node scripts/promoteIconicFaces.mjs --dry-run
//
// Falls back to a name lookup if the id slug differs from what the
// list expects (handles cases like 'edison' vs 'thomas-edison').

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

const dryRun = process.argv.includes('--dry-run');

// [id, canonical name] — canonical name is used as a fallback lookup
// if the id slug isn't in the DB (e.g. 'edison' vs 'thomas-edison').
const TARGETS = [
  // Strong yes — universally iconic faces
  ['muhammad-ali',       'Muhammad Ali'],
  ['mlk',                'Martin Luther King Jr.'],
  ['jfk',                'John F. Kennedy'],
  ['pele',               'Pelé'],
  ['walt-disney',        'Walt Disney'],
  ['thomas-edison',      'Thomas Edison'],
  ['henry-ford',         'Henry Ford'],
  ['rembrandt',          'Rembrandt'],
  ['hemingway',          'Ernest Hemingway'],
  ['confucius',          'Confucius'],
  ['theodore-roosevelt', 'Theodore Roosevelt'],
  ['franklin-roosevelt', 'Franklin D. Roosevelt'],
  // Likely yes — broadly recognised across cultures
  ['charles-de-gaulle',  'Charles de Gaulle'],
  ['ho-chi-minh',        'Hồ Chí Minh'],
  ['indira-gandhi',      'Indira Gandhi'],
  ['babe-ruth',          'Babe Ruth'],
  ['carl-sagan',         'Carl Sagan'],
  ['eleanor-roosevelt',  'Eleanor Roosevelt'],
  ['otto-von-bismarck',  'Otto von Bismarck'],
  ['antonio-vivaldi',    'Antonio Vivaldi'],
];

async function fetchById(id) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/figures?select=id,difficulty&id=eq.${encodeURIComponent(id)}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!res.ok) return null;
  return (await res.json())[0] ?? null;
}

async function fetchByName(name) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/figures?select=id,difficulty&name=eq.${encodeURIComponent(name)}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!res.ok) return null;
  return (await res.json())[0] ?? null;
}

async function patchDifficulty(id, difficulty) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/figures?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ difficulty }),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
}

async function main() {
  console.log(`${TARGETS.length} promotion candidates${dryRun ? ' (DRY RUN)' : ''}\n`);
  let ok = 0, miss = 0, skip = 0, fail = 0;
  for (const [id, label] of TARGETS) {
    let cur = await fetchById(id);
    if (!cur) {
      cur = await fetchByName(label);
      if (cur) console.log(`  found ${cur.id} via name lookup`);
    }
    if (!cur) {
      console.log(`  MISS  ${id.padEnd(24)} (${label})`);
      miss++;
      continue;
    }
    if (cur.difficulty === 'easy') {
      console.log(`  SKIP  ${cur.id.padEnd(24)} already easy`);
      skip++;
      continue;
    }
    if (dryRun) {
      console.log(`  WOULD ${cur.id.padEnd(24)} ${cur.difficulty} → easy   (${label})`);
      ok++;
      continue;
    }
    try {
      await patchDifficulty(cur.id, 'easy');
      console.log(`  OK    ${cur.id.padEnd(24)} ${cur.difficulty} → easy   (${label})`);
      ok++;
    } catch (e) {
      console.log(`  FAIL  ${cur.id.padEnd(24)} ${e.message}`);
      fail++;
    }
  }
  console.log(`\nDone. ok=${ok} miss=${miss} skip=${skip} fail=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
