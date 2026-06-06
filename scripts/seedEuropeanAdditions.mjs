// Seed: missing European household-name figures. Each row is
// upserted with a Wikipedia-resolved image URL (via the page summary
// endpoint) and default focal coords (0.5, 0.35) so the curation
// tool can refine later. Idempotent — `Prefer: resolution=
// merge-duplicates` makes re-runs safe.
//
//   node scripts/seedEuropeanAdditions.mjs
//   node scripts/seedEuropeanAdditions.mjs --dry-run
//   node scripts/seedEuropeanAdditions.mjs --only=goethe
//
// After this: run scripts/mirrorImages.mjs and
// scripts/backfillSummaries.mjs to mirror to Storage + populate
// the bio. Curate focal points via the in-app audit gallery.

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

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).toLowerCase() : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Roster ------------------------------------------------------------

// `tier` is the difficulty we want this figure at. Easy = average
// adult would recognise the portrait. Medium = recognised by most
// educated adults / well-known nationally but not globally.
//
// `wikipediaTitle` overrides the title used for the image fetch
// when the canonical Wikipedia page title differs from `name`.
const SEED = [
  // --- Universally-recognisable (easy) ---
  { id: 'adolf-hitler',         name: 'Adolf Hitler',         aliases: ['hitler'],                 tier: 'easy',   era: '20th century',                  field: 'Politics',  region: 'Germany' },
  { id: 'benito-mussolini',     name: 'Benito Mussolini',     aliases: ['mussolini', 'il duce'],   tier: 'easy',   era: '20th century',                  field: 'Politics',  region: 'Italy' },
  { id: 'catherine-the-great',  name: 'Catherine the Great',  aliases: ['catherine ii'],           tier: 'easy',   era: '18th century',                  field: 'Royalty',   region: 'Russia' },
  { id: 'peter-the-great',      name: 'Peter the Great',      aliases: ['peter i'],                tier: 'easy',   era: '17th–18th century',             field: 'Royalty',   region: 'Russia' },
  { id: 'hans-christian-andersen', name: 'Hans Christian Andersen', aliases: ['andersen'],         tier: 'easy',   era: '19th century',                  field: 'Literature', region: 'Denmark' },
  { id: 'goethe',               name: 'Johann Wolfgang von Goethe', aliases: ['goethe'],            tier: 'easy',   era: '18th–19th century',             field: 'Literature', region: 'Germany',  wikipediaTitle: 'Johann Wolfgang von Goethe' },
  { id: 'maria-theresa',        name: 'Maria Theresa',        aliases: ['empress maria theresa'],  tier: 'easy',   era: '18th century',                  field: 'Royalty',   region: 'Austria' },
  { id: 'empress-elisabeth',    name: 'Empress Elisabeth of Austria', aliases: ['sisi', 'sissi', 'elisabeth of austria'], tier: 'easy', era: '19th century', field: 'Royalty', region: 'Austria', wikipediaTitle: 'Empress Elisabeth of Austria' },
  { id: 'joseph-haydn',         name: 'Joseph Haydn',         aliases: ['haydn'],                  tier: 'easy',   era: '18th–19th century',             field: 'Music',     region: 'Austria' },
  { id: 'antoni-gaudi',         name: 'Antoni Gaudí',         aliases: ['gaudi'],                  tier: 'easy',   era: '19th–20th century',             field: 'Architecture', region: 'Spain' },
  { id: 'alfred-nobel',         name: 'Alfred Nobel',         aliases: ['nobel'],                  tier: 'easy',   era: '19th century',                  field: 'Invention', region: 'Sweden' },
  { id: 'nicolaus-copernicus',  name: 'Nicolaus Copernicus',  aliases: ['copernicus'],             tier: 'easy',   era: 'Renaissance',                   field: 'Astronomy', region: 'Poland' },

  // --- Strongly recognised in Europe / educated audiences (medium) ---
  { id: 'erasmus-of-rotterdam', name: 'Erasmus of Rotterdam', aliases: ['erasmus'],                tier: 'medium', era: 'Renaissance',                   field: 'Philosophy', region: 'Netherlands', wikipediaTitle: 'Erasmus' },
  { id: 'giuseppe-garibaldi',   name: 'Giuseppe Garibaldi',   aliases: ['garibaldi'],              tier: 'medium', era: '19th century',                  field: 'Military',  region: 'Italy' },
  { id: 'giacomo-puccini',      name: 'Giacomo Puccini',      aliases: ['puccini'],                tier: 'medium', era: '19th–20th century',             field: 'Music',     region: 'Italy' },
  { id: 'marcel-proust',        name: 'Marcel Proust',        aliases: ['proust'],                 tier: 'medium', era: '19th–20th century',             field: 'Literature', region: 'France' },
  { id: 'peter-paul-rubens',    name: 'Peter Paul Rubens',    aliases: ['rubens'],                 tier: 'medium', era: '17th century',                  field: 'Painting',  region: 'Flanders / Belgium' },
  { id: 'konrad-adenauer',      name: 'Konrad Adenauer',      aliases: ['adenauer'],               tier: 'medium', era: '20th century',                  field: 'Politics',  region: 'Germany' },
  { id: 'franz-joseph-i',       name: 'Franz Joseph I',       aliases: ['franz joseph'],           tier: 'medium', era: '19th–20th century',             field: 'Royalty',   region: 'Austria', wikipediaTitle: 'Franz Joseph I of Austria' },
  { id: 'astrid-lindgren',      name: 'Astrid Lindgren',      aliases: ['lindgren'],               tier: 'medium', era: '20th–21st century',             field: 'Literature', region: 'Sweden' },
  { id: 'anton-bruckner',       name: 'Anton Bruckner',       aliases: ['bruckner'],               tier: 'medium', era: '19th century',                  field: 'Music',     region: 'Austria' },
  { id: 'maximilian-i',         name: 'Maximilian I',         aliases: ['emperor maximilian'],     tier: 'medium', era: 'Renaissance',                   field: 'Royalty',   region: 'Austria', wikipediaTitle: 'Maximilian I, Holy Roman Emperor' },
  { id: 'helmut-kohl',          name: 'Helmut Kohl',          aliases: ['kohl'],                   tier: 'medium', era: '20th–21st century',             field: 'Politics',  region: 'Germany' },
  { id: 'boris-yeltsin',        name: 'Boris Yeltsin',        aliases: ['yeltsin'],                tier: 'medium', era: '20th–21st century',             field: 'Politics',  region: 'Russia' },
  { id: 'edith-piaf',           name: 'Édith Piaf',           aliases: ['piaf'],                   tier: 'medium', era: '20th century',                  field: 'Music',     region: 'France' },
  { id: 'edmund-hillary',       name: 'Edmund Hillary',       aliases: ['hillary'],                tier: 'medium', era: '20th–21st century',             field: 'Exploration', region: 'New Zealand', wikipediaTitle: 'Edmund Hillary' },
  { id: 'jean-paul-sartre',     name: 'Jean-Paul Sartre',     aliases: ['sartre'],                 tier: 'medium', era: '20th century',                  field: 'Philosophy', region: 'France' },
  { id: 'simone-de-beauvoir',   name: 'Simone de Beauvoir',   aliases: ['de beauvoir', 'beauvoir'],tier: 'medium', era: '20th century',                  field: 'Philosophy', region: 'France' },
  { id: 'gustav-eiffel',        name: 'Gustave Eiffel',       aliases: ['eiffel'],                 tier: 'medium', era: '19th–20th century',             field: 'Engineering', region: 'France' },
  { id: 'augustin-fresnel',     name: 'Augustin-Jean Fresnel', aliases: ['fresnel'],               tier: 'medium', era: '19th century',                  field: 'Physics',   region: 'France', wikipediaTitle: 'Augustin-Jean Fresnel' },
  { id: 'martin-luther',        name: 'Martin Luther',        aliases: ['luther'],                 tier: 'easy',   era: 'Renaissance',                   field: 'Religion',  region: 'Germany' },
  { id: 'martin-heidegger',     name: 'Martin Heidegger',     aliases: ['heidegger'],              tier: 'medium', era: '20th century',                  field: 'Philosophy', region: 'Germany' },
  { id: 'ludwig-wittgenstein',  name: 'Ludwig Wittgenstein',  aliases: ['wittgenstein'],           tier: 'medium', era: '20th century',                  field: 'Philosophy', region: 'Austria / UK' },
  { id: 'thomas-mann',          name: 'Thomas Mann',          aliases: ['thomas mann'],            tier: 'medium', era: '20th century',                  field: 'Literature', region: 'Germany' },
  { id: 'stefan-zweig',         name: 'Stefan Zweig',         aliases: ['zweig'],                  tier: 'medium', era: '20th century',                  field: 'Literature', region: 'Austria' },
  { id: 'franz-kafka',          name: 'Franz Kafka',          aliases: ['kafka'],                  tier: 'easy',   era: '20th century',                  field: 'Literature', region: 'Austria-Hungary / Czech' },
  { id: 'klemens-von-metternich', name: 'Klemens von Metternich', aliases: ['metternich'],         tier: 'medium', era: '19th century',                  field: 'Politics',  region: 'Austria' },
];

// ---- Wikipedia helpers (same shape as seedNewEasy.mjs) -----------------

const STORAGE_HOST = `${SUPABASE_URL}/storage/v1/object/public/figures/`;

async function fetchWikipediaImageUrl(title) {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'PFH-seed/1.0 (peoplefromhistorygame@gmail.com)',
      Accept: 'application/json',
    },
    redirect: 'follow',
  });
  if (!res.ok) return { url: null, reason: `HTTP ${res.status}` };
  const data = await res.json();
  if (data.type === 'disambiguation') return { url: null, reason: 'disambiguation page' };
  const img = data?.originalimage?.source ?? data?.thumbnail?.source ?? null;
  return { url: img, reason: img ? null : 'no thumbnail' };
}

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
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
}

async function main() {
  const entries = only ? SEED.filter((f) => f.id.toLowerCase().includes(only)) : SEED;
  console.log(`${entries.length} European additions${dryRun ? ' (DRY RUN)' : ''}${only ? ` (filter: ${only})` : ''}\n`);

  let ok = 0;
  let noImage = 0;
  let failed = 0;

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
      difficulty: fig.tier,
      era: fig.era,
      field: fig.field,
      region: fig.region,
      first_letter: fig.name[0].toUpperCase(),
      enabled: true,
    };

    const label = `[${String(i + 1).padStart(2, '0')}/${entries.length}] ${fig.id.padEnd(28)} ${fig.tier}`;

    if (dryRun) {
      console.log(`${label}  ${imageUrl ? 'OK' : 'NO-IMG'}` + (reason ? `  — ${reason}` : ''));
      if (imageUrl) ok++; else noImage++;
      await sleep(120);
      continue;
    }

    try {
      await upsertFigure(row);
      if (imageUrl) {
        ok++;
        console.log(`${label}  OK`);
      } else {
        noImage++;
        console.log(`${label}  NO-IMG` + (reason ? `  — ${reason}` : ''));
      }
    } catch (e) {
      failed++;
      console.log(`${label}  FAIL — ${e.message}`);
    }
    await sleep(150);
  }

  console.log(`\nDone. ok=${ok} no-image=${noImage} failed=${failed}`);
  if (ok > 0) {
    console.log('\nNext steps:');
    console.log('  node scripts/mirrorImages.mjs           # mirror to Supabase Storage');
    console.log('  node scripts/backfillSummaries.mjs      # populate Wikipedia summaries');
    console.log('  In-app /audit                           # curate focal points');
  }
}

// Suppress unused-var hint for storage host (kept for future
// expansion / storage-URL filtering).
void STORAGE_HOST;

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
