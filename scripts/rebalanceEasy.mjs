// One-shot: demote anything currently flagged "easy" that isn't on the
// curated household-name allowlist down to "medium". Reads
// SUPABASE_DB_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.

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

// Allowlist — figures we want to stay in "easy" because the average
// adult would recognize their portrait without context. Anything
// currently flagged easy that isn't in this set moves to "medium".
const KEEP_IN_EASY = new Set([
  // Politics & leaders
  'lincoln',
  'franklin-roosevelt',
  'theodore-roosevelt',
  'richard-nixon',
  'ronald-reagan',
  'jimmy-carter',
  'jfk',
  'joseph-stalin',
  'vladimir-lenin',
  'fidel-castro',
  'che-guevara',
  'gandhi',
  'mandela',
  'churchill',
  'margaret-thatcher',
  'mao',
  'napoleon',
  'julius-caesar',
  'alexander-great',
  'washington',
  'jefferson',
  'ben-franklin',

  // Scientists & inventors
  'einstein',
  'stephen-hawking',
  'marie-curie',
  'darwin',
  'galileo',
  'newton',
  'tesla',
  'edison',

  // Artists
  'van-gogh',
  'picasso',
  'da-vinci',
  'salvador-dali',
  'frida-kahlo',
  'andy-warhol',
  'michelangelo',

  // Writers
  'shakespeare',
  'mark-twain',
  'leo-tolstoy',
  'edgar-allan-poe',
  'oscar-wilde',
  'franz-kafka',
  'hemingway',

  // Musicians
  'mozart',
  'beethoven',
  'tchaikovsky',
  'elvis-presley',
  'john-lennon',
  'michael-jackson',
  'freddie-mercury',
  'bob-marley',
  'david-bowie',
  'prince-musician',
  'aretha-franklin',
  'whitney-houston',
  'frank-sinatra',
  'louis-armstrong',

  // Royals
  'cleopatra',
  'marie-antoinette',
  'queen-victoria',
  'elizabeth-ii',
  'princess-diana',
  'nefertiti',
  'tutankhamun',
  'henry-viii',
  'elizabeth-i',

  // Religion
  'gautama-buddha',
  'mother-teresa',
  'john-paul-ii',

  // Film / icons
  'marilyn-monroe',
  'audrey-hepburn',
  'bruce-lee',
  'alfred-hitchcock',
  'james-dean',
  'chaplin',
  'walt-disney',

  // Activists
  'malcolm-x',
  'rosa-parks',
  'frederick-douglass',
  'harriet-tubman',
  'mlk',

  // Other household names
  'steve-jobs',
  'joan-of-arc',
  'genghis-khan',
  'coco-chanel',
  'henry-ford',
]);

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
  console.log(`Currently ${easy.length} figures flagged easy.`);
  const toDemote = easy.filter((f) => !KEEP_IN_EASY.has(f.id));
  const toKeep = easy.filter((f) => KEEP_IN_EASY.has(f.id));
  console.log(`\nKeeping ${toKeep.length} in easy.`);
  console.log(`Demoting ${toDemote.length} to medium.`);

  console.log('\nKept:');
  for (const f of toKeep) console.log(`  ${f.name}  [${f.id}]`);

  console.log('\nDemoting:');
  for (const f of toDemote) console.log(`  ${f.name}  [${f.id}]`);

  if (process.argv.includes('--dry-run')) {
    console.log('\nDry run — no DB writes.');
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const f of toDemote) {
    try {
      await setDifficulty(f.id, 'medium');
      ok++;
    } catch (e) {
      failed++;
      console.error(`  FAIL ${f.id}: ${e.message}`);
    }
  }
  console.log(`\nDone. demoted=${ok} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
