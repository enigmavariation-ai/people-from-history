// Apply any pending SQL files in supabase/migrations/ that aren't yet
// recorded in the `public.applied_migrations` tracking table.
// Connects via the direct postgres URL (SUPABASE_DB_URL in .env.local).
//
// Run:
//   node scripts/applyMigrations.mjs
//   node scripts/applyMigrations.mjs --status   # just list applied / pending

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pkg from 'pg';
const { Client } = pkg;

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

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error(
    'Missing SUPABASE_DB_URL in .env.local.\n' +
    'Get it from Supabase Dashboard → Project Settings → Database → Connection string (URI).',
  );
  process.exit(1);
}

const statusOnly = process.argv.includes('--status');

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const client = new Client({ connectionString: DB_URL });
await client.connect();

await client.query(`
  create table if not exists public.applied_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  );
`);

const applied = new Set(
  (await client.query('select filename from public.applied_migrations')).rows.map(
    (r) => r.filename,
  ),
);

console.log(`Found ${files.length} migrations, ${applied.size} already applied.`);
for (const f of files) {
  console.log(`  ${applied.has(f) ? '✓' : ' '} ${f}`);
}

if (statusOnly) {
  await client.end();
  process.exit(0);
}

const pending = files.filter((f) => !applied.has(f));
if (pending.length === 0) {
  console.log('Nothing to apply.');
  await client.end();
  process.exit(0);
}

console.log(`\nApplying ${pending.length} pending migration(s)…`);
for (const f of pending) {
  const sql = readFileSync(join(migrationsDir, f), 'utf8');
  console.log(`\n--- ${f} ---`);
  try {
    await client.query('begin');
    await client.query(sql);
    await client.query('insert into public.applied_migrations (filename) values ($1)', [f]);
    await client.query('commit');
    console.log(`  applied.`);
  } catch (e) {
    await client.query('rollback');
    console.error(`  FAILED: ${e.message}`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log('\nAll done.');
