// One-shot: demote figures from Easy → Medium whose PORTRAIT (not
// just their name) is not instantly recognisable to a non-specialist.
// Playtest feedback was that Easy still felt too hard — the bar for
// Easy is "the face pops without context", not "I've heard of them".
//
//   node scripts/pruneEasyTier.mjs            # writes to DB
//   node scripts/pruneEasyTier.mjs --dry-run
//
// To reverse a specific entry later, run the promote pattern from
// scripts/promoteEuropeanEasy.mjs against that id.

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

// Curated demote list — each id is currently in Easy but the
// portrait is not visually iconic to a casual player. Grouped by
// reason so future curators can argue with the assignment.
const DEMOTE = [
  // — Name yes, face no
  'antoni-gaudi', 'nicolaus-copernicus', 'johannes-gutenberg', 'alfred-nobel',
  'jane-austen', 'alexandre-dumas', 'hans-christian-andersen', 'jules-verne',
  'edgar-allan-poe', 'goethe', 'franz-kafka', 'dante-alighieri',
  'florence-nightingale', 'dickens', 'voltaire', 'mark-twain', 'leo-tolstoy',
  'dostoevsky', 'henry-kissinger', 'colin-powell',
  // — Old Hollywood / US-centric film
  'clark-gable', 'carrie-fisher', 'ingrid-bergman', 'shirley-temple',
  'heath-ledger', 'patrick-swayze', 'christopher-reeve', 'fred-astaire',
  'marlene-dietrich', 'stanley-kubrick', 'steve-mcqueen', 'charlton-heston',
  'bette-davis', 'katharine-hepburn', 'cary-grant', 'james-stewart',
  'paul-newman', 'sean-connery', 'john-wayne',
  // — Pre-photographic conquerors / generic depictions
  'genghis-khan', 'alexander-the-great', 'attila-the-hun', 'geronimo',
  'hernan-cortes',
  // — Niche US sports / entertainment
  'hugh-hefner', 'joe-dimaggio', 'hank-aaron', 'wilt-chamberlain',
  'harry-houdini', 'evel-knievel', 'buffalo-bill',
  // — Pop / rock — name famous, face less so
  'george-harrison', 'ray-charles', 'johnny-cash', 'kurt-cobain',
  'notorious-big', 'tchaikovsky', 'buddy-holly', 'janis-joplin',
  'george-michael', 'jim-morrison', 'marvin-gaye', 'tupac-shakur',
  'joseph-haydn', 'aretha-franklin', 'amy-winehouse', 'selena',
  'whitney-houston', 'prince', 'tina-turner', 'frederic-chopin',
  // — Painters whose work is iconic, face is not
  'caravaggio', 'claude-monet', 'hokusai', 'mc-escher', 'michelangelo',
  // — US 20th-c presidents the average non-American doesn't picture
  'george-hw-bush', 'harry-truman', 'dwight-eisenhower', 'richard-nixon',
  'theodore-roosevelt', 'franklin-roosevelt',
  // — Native-American figures — name yes, depiction less so
  'sitting-bull',
  // — Borderline politics / opera
  'pavarotti', 'eva-peron', 'che-guevara',
];

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

async function fetchOne(id) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/figures?select=id,name,difficulty&id=eq.${encodeURIComponent(id)}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] ?? null;
}

async function main() {
  const ids = [...new Set(DEMOTE)];
  console.log(`Demoting ${ids.length} ids Easy → Medium${dryRun ? ' (DRY RUN)' : ''}\n`);
  let ok = 0, miss = 0, skip = 0, fail = 0;
  for (const id of ids) {
    const cur = await fetchOne(id);
    if (!cur) {
      console.log(`  MISS  ${id}`);
      miss++;
      continue;
    }
    if (cur.difficulty !== 'easy') {
      console.log(`  SKIP  ${cur.difficulty.padEnd(7)} ${id}  (not easy)`);
      skip++;
      continue;
    }
    if (dryRun) {
      console.log(`  WOULD ${id}  ·  ${cur.name}`);
      ok++;
      continue;
    }
    try {
      await patchDifficulty(id, 'medium');
      console.log(`  OK    ${id}  ·  ${cur.name}`);
      ok++;
    } catch (e) {
      console.log(`  FAIL  ${id}  — ${e.message}`);
      fail++;
    }
  }
  console.log(`\nDone. ok=${ok} miss=${miss} skip=${skip} fail=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
