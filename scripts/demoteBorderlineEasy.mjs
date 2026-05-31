// Second pass on the easy bucket — demote figures where the name is
// famous but the face isn't iconic enough for a casual audience to
// recognize cold. Triggered by user feedback ("Vivien Leigh is in
// easy but I wouldn't recognize her"). Targets ~60 IDs.
//
//   node scripts/demoteBorderlineEasy.mjs --dry-run
//   node scripts/demoteBorderlineEasy.mjs

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
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const dryRun = process.argv.includes('--dry-run');

// Move these from easy → medium. Grouped only for readability — the
// flat list is what gets PATCHed.
const DEMOTE = [
  // --- Hollywood golden age: famous names, less-iconic faces ---
  'henry-fonda',
  'joan-crawford',
  'vivien-leigh',
  'greta-garbo',
  'lauren-bacall',
  'ava-gardner',
  'doris-day',
  'gregory-peck',
  'spencer-tracy',
  'gene-kelly',

  // --- Modern actors: name-known, face less-so ---
  'philip-seymour-hoffman',
  'roger-moore',
  'christopher-lee',
  'james-gandolfini',

  // --- Musicians: heard the music, can't picture them ---
  'nat-king-cole',
  'otis-redding',
  'sam-cooke',
  'tom-petty',
  'eddie-van-halen',
  'avicii',
  'bing-crosby',
  'dean-martin',
  'john-denver',
  'roy-orbison',

  // --- Sports: legends to fans, not to casual audience ---
  'lou-gehrig',
  'mickey-mantle',
  'yogi-berra',
  'roberto-clemente',
  'joe-louis',
  'sugar-ray-robinson',
  'rocky-marciano',
  'joe-frazier',
  'johan-cruyff',
  'bill-russell',

  // --- Comedians / TV ---
  'bob-hope',
  'johnny-carson',
  'andy-griffith',
  'walter-cronkite',

  // --- Directors: only nerds recognize the face ---
  'federico-fellini',
  'akira-kurosawa',
  'ingmar-bergman',
  'david-lean',

  // --- US Presidents: pre-FDR or short-tenure ---
  'herbert-hoover',
  'woodrow-wilson',

  // --- International leaders: less-iconic faces ---
  'augusto-pinochet',
  'leonid-brezhnev',
  'nikita-khrushchev',

  // --- Royals: name-famous, face less-recognizable ---
  'queen-mother',
  'princess-margaret',
  'king-george-vi',
  'edward-viii',
  'tsar-nicholas-ii',
  'anastasia-romanov',

  // --- Business tycoons ---
  'john-d-rockefeller',
  'andrew-carnegie',
  'jp-morgan',
  'howard-hughes',

  // --- Other ---
  'sally-ride',
  'jim-henson',
  'arnold-palmer',
  'ayrton-senna',
  'enzo-ferrari',
  'leonard-bernstein',
  'maria-callas',
  'leonard-cohen',
  'frank-zappa',
  'larry-king',

  // --- Military ---
  'george-patton',
  'douglas-macarthur',
  'erwin-rommel',
  'te-lawrence',

  // --- Music additions ---
  'aaliyah',
  'michael-hutchence',

  // --- Other ---
  'mata-hari',
  'crazy-horse',
  'annie-oakley',
  'tchaikovsky', // classical composer; face is much less iconic than the music
];

async function listEasy() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/figures?select=id,name&difficulty=eq.easy`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Range: '0-9999',
      },
    },
  );
  if (!res.ok) throw new Error(`list HTTP ${res.status}`);
  return res.json();
}

async function setDifficulty(id, difficulty) {
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
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PATCH ${id}: HTTP ${res.status}: ${body}`);
  }
}

async function main() {
  const easy = await listEasy();
  const easyIds = new Set(easy.map((f) => f.id));
  const easyById = new Map(easy.map((f) => [f.id, f.name]));

  const inEasy = DEMOTE.filter((id) => easyIds.has(id));
  const notInEasy = DEMOTE.filter((id) => !easyIds.has(id));

  console.log(`Easy now: ${easy.length}.`);
  console.log(`Demoting: ${inEasy.length} (of ${DEMOTE.length} requested).`);
  if (notInEasy.length) {
    console.log(`Already not in easy (skipped): ${notInEasy.length}`);
    for (const id of notInEasy) console.log(`  ! ${id}`);
  }
  console.log('\nList:');
  for (const id of inEasy) console.log(`  ${easyById.get(id)}  [${id}]`);

  if (dryRun) {
    console.log('\nDry run — no DB writes.');
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const id of inEasy) {
    try {
      await setDifficulty(id, 'medium');
      ok++;
    } catch (e) {
      failed++;
      console.error(`  FAIL ${id}: ${e.message}`);
    }
  }
  console.log(`\nDone. demoted=${ok} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
