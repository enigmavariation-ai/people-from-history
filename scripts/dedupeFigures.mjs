// One-shot: detect duplicate figures (rows with the same canonical
// `name`) and disable the worse copy. Safe + reversible — we set
// enabled=false on the loser, never delete, so a wrong call can be
// undone with a single PATCH.
//
//   node scripts/dedupeFigures.mjs            # writes to DB
//   node scripts/dedupeFigures.mjs --dry-run  # preview only
//
// "Better" copy is picked by:
//   1. lower-numbered difficulty (easy > medium > hard) — the more
//      generous tier is more likely the curator's intent.
//   2. id with more dashes (e.g. `mahatma-gandhi` over `gandhi`) on
//      ties — the longer canonical id is what new seeds produce so
//      it'll match future upserts cleanly.
// Override the auto-pick with KEEP/DROP entries below.

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

// Manual overrides when the auto-pick is wrong. Format: keep -> drop.
// (Add entries here for any group you'd prefer to flip after a dry-run.)
const OVERRIDES = {
  // Auto picked the longer "johannes-kepler-again" (junk slug from
  // a seed-script copy-paste). Real id is just "kepler".
  'kepler': 'johannes-kepler-again',
};

const TIER_RANK = { easy: 0, medium: 1, hard: 2 };

async function listAllFigures() {
  const rows = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const to = from + pageSize - 1;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/figures?select=id,name,difficulty,enabled,image_url,summary`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          Range: `${from}-${to}`,
        },
      },
    );
    if (!res.ok) throw new Error(`list HTTP ${res.status}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function setEnabled(id, enabled) {
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
      body: JSON.stringify({ enabled }),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
}

function pickKeeper(group) {
  // Manual override wins.
  for (const r of group) {
    if (OVERRIDES[r.id]) {
      const winner = group.find((x) => x.id === r.id);
      const loser = group.find((x) => x.id === OVERRIDES[r.id]);
      if (winner && loser) return { winner, loser, reason: 'override' };
    }
  }
  // Auto-pick: lower tier rank first; on tie, longer (more
  // specific) id wins.
  const sorted = [...group].sort((a, b) => {
    const ta = TIER_RANK[a.difficulty] ?? 9;
    const tb = TIER_RANK[b.difficulty] ?? 9;
    if (ta !== tb) return ta - tb;
    return b.id.length - a.id.length;
  });
  return {
    winner: sorted[0],
    loser: sorted[1],
    reason: `tier ${sorted[0].difficulty} ≤ ${sorted[1].difficulty}, length ${sorted[0].id.length} ≥ ${sorted[1].id.length}`,
  };
}

async function main() {
  const all = await listAllFigures();
  const enabled = all.filter((r) => r.enabled !== false);

  const byName = new Map();
  for (const r of enabled) {
    const k = (r.name || '').toLowerCase().trim();
    if (!k) continue;
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(r);
  }

  const groups = [...byName.values()].filter((g) => g.length > 1);
  if (!groups.length) {
    console.log('No duplicate names found.');
    return;
  }

  console.log(`${groups.length} duplicate groups${dryRun ? ' (DRY RUN)' : ''}\n`);

  let kept = 0, disabled = 0, fail = 0;
  for (const g of groups) {
    const { winner, loser, reason } = pickKeeper(g);
    if (!loser) continue;
    const extras = g.filter((r) => r.id !== winner.id);
    console.log(
      `  KEEP ${winner.id} (${winner.difficulty})  —  drop ${extras
        .map((r) => `${r.id} (${r.difficulty})`)
        .join(', ')}   [${reason}]`,
    );
    for (const ex of extras) {
      if (dryRun) {
        disabled++;
        continue;
      }
      try {
        await setEnabled(ex.id, false);
        disabled++;
      } catch (e) {
        console.log(`    FAIL ${ex.id}: ${e.message}`);
        fail++;
      }
    }
    kept++;
  }
  console.log(`\nDone. kept=${kept} disabled=${disabled} failed=${fail}`);
  console.log(
    'Note: disabled rows stay in the DB. Re-enable by PATCH enabled=true on the id.',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
