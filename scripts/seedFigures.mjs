// Seed the `figures` table from `figureSeed.mjs`.
//
// For each entry:
//   1. Resolve the Commons image URL via the Wikipedia REST summary
//      endpoint. The endpoint follows redirects and returns a fresh
//      `originalimage` / `thumbnail` URL we can trust.
//   2. Upsert the row into Supabase using the service role key. Rows
//      where no image is found are still inserted (image_url = null);
//      the RLS policy hides them from gameplay until you backfill.
//
// Requires env vars in `.env.local`:
//   VITE_SUPABASE_URL=https://...
//   SUPABASE_SERVICE_ROLE_KEY=eyJ...   # service role, NOT the anon key
//
// Run:
//   node scripts/seedFigures.mjs
//   node scripts/seedFigures.mjs --dry-run     # don't write to Supabase
//   node scripts/seedFigures.mjs --only=bach   # filter by id substring

import { readFileSync } from 'node:fs';
import SEED from './figureSeed.mjs';

// ---- env loading (no dotenv dep) ----
function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // .env.local optional; env vars may already be set in shell
  }
}
loadEnv();

// ---- args ----
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).toLowerCase() : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!dryRun) {
  if (!SUPABASE_URL) {
    console.error('Missing VITE_SUPABASE_URL in env. Add it to .env.local.');
    process.exit(1);
  }
  if (!SERVICE_KEY) {
    console.error(
      'Missing SUPABASE_SERVICE_ROLE_KEY in env.\n\n' +
      'Get it from: Supabase Dashboard → Project Settings → API → service_role key.\n' +
      'Add it to .env.local as:  SUPABASE_SERVICE_ROLE_KEY=eyJ...\n' +
      '(This key bypasses RLS — never commit it or paste it in chat.)',
    );
    process.exit(1);
  }
}

// Upsert a single row via PostgREST. We hit the REST API directly to
// avoid pulling in @supabase/supabase-js — its realtime client requires
// WebSocket support that Node 20 doesn't have natively.
async function upsertFigure(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/figures`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
}

// ---- Wikipedia URL resolver ----
async function fetchWikipediaImageUrl(title) {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'PFH-seed/1.0 (https://github.com/anthropics/claude-code; contact: niklas.fip@gmail.com)',
      Accept: 'application/json',
    },
    redirect: 'follow',
  });
  if (!res.ok) return { url: null, reason: `HTTP ${res.status}` };
  const data = await res.json();
  if (data.type === 'disambiguation') {
    return { url: null, reason: 'disambiguation page' };
  }
  const img = data?.originalimage?.source ?? data?.thumbnail?.source ?? null;
  return { url: img, reason: img ? null : 'no thumbnail in summary' };
}

// ---- main loop ----
async function main() {
  const entries = only ? SEED.filter((f) => f.id.toLowerCase().includes(only)) : SEED;
  console.log(
    `Seeding ${entries.length} figures` +
      (dryRun ? ' (DRY RUN — no writes)' : '') +
      (only ? ` (filter: ${only})` : ''),
  );

  let ok = 0;
  let noImage = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < entries.length; i++) {
    const fig = entries[i];
    const title = fig.wikipediaTitle ?? fig.name;

    let imageUrl = null;
    let reason = null;
    try {
      const r = await fetchWikipediaImageUrl(title);
      imageUrl = r.url;
      reason = r.reason;
    } catch (e) {
      reason = `fetch error: ${e.message}`;
    }

    const row = {
      id: fig.id,
      name: fig.name,
      aliases: fig.aliases,
      image_url: imageUrl,
      focal_x: 0.5,
      focal_y: 0.35,
      start_size: 0.15,
      focal_note: '',
      difficulty: fig.difficulty,
      era: fig.era,
      field: fig.field,
      region: fig.region,
      first_letter: fig.name[0].toUpperCase(),
      enabled: true,
    };

    if (dryRun) {
      const status = imageUrl ? 'OK ' : 'NO-IMG ';
      console.log(
        `[${String(i + 1).padStart(3, '0')}/${entries.length}] ${status}${fig.id}` +
          (reason ? `  — ${reason}` : ''),
      );
      if (imageUrl) ok++;
      else noImage++;
    } else {
      let upsertError = null;
      try {
        await upsertFigure(row);
      } catch (e) {
        upsertError = e.message;
      }
      if (upsertError) {
        failed++;
        failures.push({ id: fig.id, error: upsertError });
        console.log(
          `[${String(i + 1).padStart(3, '0')}/${entries.length}] FAIL ${fig.id}  — ${upsertError}`,
        );
      } else if (!imageUrl) {
        noImage++;
        console.log(
          `[${String(i + 1).padStart(3, '0')}/${entries.length}] NO-IMG ${fig.id}` +
            (reason ? `  — ${reason}` : ''),
        );
      } else {
        ok++;
        console.log(`[${String(i + 1).padStart(3, '0')}/${entries.length}] OK ${fig.id}`);
      }
    }

    // Pace requests to be polite to Wikipedia (max ~10/sec).
    await sleep(120);
  }

  console.log(
    `\nDone. ok=${ok}  no_image=${noImage}  failed=${failed}` +
      (failed ? `\nFailures:\n  ${failures.map((f) => `${f.id}: ${f.error}`).join('\n  ')}` : ''),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
