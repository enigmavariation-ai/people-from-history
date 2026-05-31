// One-shot: walk every figure in the table and fill `summary` +
// `wikipedia_url` from each figure's Wikipedia summary endpoint. Safe
// to re-run; only updates rows that need it (or all rows with --force).
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (same as
// scripts/seedFigures.mjs).
//
// Run:
//   node scripts/backfillSummaries.mjs
//   node scripts/backfillSummaries.mjs --force        # refresh all
//   node scripts/backfillSummaries.mjs --only=einstein

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

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).toLowerCase() : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}

async function listAllFigures() {
  // Service-role read bypasses RLS so we get image_url=null rows too.
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/figures?select=id,name,summary,wikipedia_url`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Range: '0-9999',
      },
    },
  );
  if (!res.ok) throw new Error(`list figures: HTTP ${res.status}`);
  return res.json();
}

async function fetchWikipediaSummary(title) {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'PFH-backfill/1.0 (https://github.com/anthropics/claude-code; contact: niklas.fip@gmail.com)',
      Accept: 'application/json',
    },
    redirect: 'follow',
  });
  if (!res.ok) return { extract: '', url: null, reason: `HTTP ${res.status}` };
  const data = await res.json();
  if (data.type === 'disambiguation') {
    return { extract: '', url: null, reason: 'disambiguation page' };
  }
  return {
    extract: data.extract ?? '',
    url: data.content_urls?.desktop?.page ?? null,
    reason: null,
  };
}

async function patchFigure(id, summary, wikipediaUrl) {
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
      body: JSON.stringify({ summary, wikipedia_url: wikipediaUrl }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
}

async function main() {
  const all = await listAllFigures();
  const filtered = only ? all.filter((f) => f.id.toLowerCase().includes(only)) : all;
  const todo = force ? filtered : filtered.filter((f) => !f.summary || f.summary.length === 0);
  console.log(
    `${all.length} total, ${todo.length} to update` +
      (force ? ' (--force)' : ' (skip already-filled)') +
      (only ? ` (filter: ${only})` : ''),
  );

  let ok = 0;
  let noExtract = 0;
  let failed = 0;

  for (let i = 0; i < todo.length; i++) {
    const fig = todo[i];
    let extract = '';
    let url = null;
    let reason = null;
    try {
      const r = await fetchWikipediaSummary(fig.name);
      extract = r.extract;
      url = r.url;
      reason = r.reason;
    } catch (e) {
      reason = `fetch error: ${e.message}`;
    }

    try {
      await patchFigure(fig.id, extract, url);
      if (extract) {
        ok++;
        console.log(`[${String(i + 1).padStart(3, '0')}/${todo.length}] OK ${fig.id}`);
      } else {
        noExtract++;
        console.log(
          `[${String(i + 1).padStart(3, '0')}/${todo.length}] EMPTY ${fig.id}` +
            (reason ? `  — ${reason}` : ''),
        );
      }
    } catch (e) {
      failed++;
      console.log(
        `[${String(i + 1).padStart(3, '0')}/${todo.length}] FAIL ${fig.id}  — ${e.message}`,
      );
    }

    await sleep(120);
  }

  console.log(`\nDone. ok=${ok}  empty=${noExtract}  failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
