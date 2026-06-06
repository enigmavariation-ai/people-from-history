// One-shot: promote universally-recognisable European figures who
// are currently miscategorised in Medium or Hard up to Easy. The
// bias audit (docs/figure-bias.md) showed Easy was 53% USA / 84%
// post-1900 — most of these candidates are already in the pool,
// just in the wrong tier.
//
//   node scripts/promoteEuropeanEasy.mjs            # writes to DB
//   node scripts/promoteEuropeanEasy.mjs --dry-run  # preview only
//
// Each entry is a figure whose portrait is recognisable to an
// average adult across cultures — iconic moustache, the Henry VIII
// portrait, the Louis XIV wig, John Paul II's white robes, Mother
// Teresa's habit, Nietzsche's moustache, etc.

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

// id → reason (kept for the log). Only ids that the bias audit and
// "would a non-expert recognise this portrait?" smell test agree on.
const TO_EASY = [
  ['newton', 'the wig + the Royal Society portrait'],
  ['michelangelo', 'iconic white-beard self-image'],
  ['freud', 'beard + cigar; "Freud" is shorthand for the man himself'],
  ['karl-marx', 'archetypal bushy-beard portrait'],
  ['friedrich-nietzsche', 'massive moustache'],
  ['dickens', 'one of the most reproduced 19th-c portraits'],
  ['jane-austen', 'the watercolour silhouette is on the £10 note'],
  ['henry-viii', "Holbein's portrait may be the most-recognised king portrait of all"],
  ['louis-xiv', 'Rigaud portrait — the wig, the stance, Versailles'],
  ['voltaire', 'the Houdon bust + 18th-c salon portraits'],
  ['frederic-chopin', 'archetypal Romantic-era composer portrait'],
  ['tchaikovsky', 'beard + the canonical seated portrait'],
  ['dostoevsky', 'Perov portrait — the beard, the gaze'],
  ['john-paul-ii', 'most-photographed pope of the 20th c'],
  ['mother-teresa', 'white-and-blue habit is unmistakable'],
  ['chaplin', 'tramp moustache + bowler'],
  ['claude-monet', 'beard + studio portraits well-known'],
  ['caravaggio', 'self-portraits are iconic'],
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

async function fetchExisting(ids) {
  const filter = ids.map((i) => `"${i}"`).join(',');
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/figures?select=id,difficulty&id=in.(${filter})`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!res.ok) throw new Error(`list HTTP ${res.status}`);
  return new Map((await res.json()).map((f) => [f.id, f.difficulty]));
}

async function main() {
  const ids = TO_EASY.map(([id]) => id);
  const existing = await fetchExisting(ids);

  console.log(`${TO_EASY.length} promotion candidates${dryRun ? ' (DRY RUN)' : ''}:\n`);

  let promoted = 0;
  let already = 0;
  let missing = 0;
  let failed = 0;

  for (const [id, reason] of TO_EASY) {
    const cur = existing.get(id);
    const label = id.padEnd(28);
    if (!cur) {
      console.log(`  ${label}  MISSING — not in DB`);
      missing++;
      continue;
    }
    if (cur === 'easy') {
      console.log(`  ${label}  already easy`);
      already++;
      continue;
    }
    if (dryRun) {
      console.log(`  ${label}  ${cur} → easy   (${reason})`);
      promoted++;
      continue;
    }
    try {
      await patchDifficulty(id, 'easy');
      console.log(`  ${label}  ${cur} → easy   (${reason})`);
      promoted++;
    } catch (e) {
      console.log(`  ${label}  FAIL — ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone. promoted=${promoted} already=${already} missing=${missing} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
