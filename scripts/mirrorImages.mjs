// Walk every figure row, download its current `image_url`, push the
// bytes to the `figures` Supabase Storage bucket, then PATCH
// `image_url` to point at the new public Storage URL.
//
// Idempotent and resumable: figures whose `image_url` already points
// at our Storage bucket are skipped. Use `--force` to re-mirror them
// (e.g. after replacing a URL upstream).
//
// Run:
//   node scripts/mirrorImages.mjs
//   node scripts/mirrorImages.mjs --force        # re-mirror everything
//   node scripts/mirrorImages.mjs --only=einstein
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.

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
const force = args.includes('--force');
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).toLowerCase() : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STORAGE_HOST = `${SUPABASE_URL}/storage/v1/object/public/figures/`;

async function listAllFigures() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/figures?select=id,image_url`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Range: '0-9999',
    },
  });
  if (!res.ok) throw new Error(`list figures: HTTP ${res.status}`);
  return res.json();
}

// Download with one retry on 429. Wikimedia throttles bursts; a single
// long pause is usually enough to recover.
async function downloadImage(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'PFH-mirror/1.0 (https://github.com/anthropics/claude-code; contact: niklas.fip@gmail.com)',
      },
      redirect: 'follow',
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type') ?? '';
      const buf = Buffer.from(await res.arrayBuffer());
      return { buf, contentType };
    }
    if (res.status === 429 && attempt === 0) {
      const retryAfter = parseInt(res.headers.get('retry-after') ?? '60', 10);
      const waitMs = Math.max(30_000, Math.min(retryAfter * 1000, 120_000));
      console.log(`    rate-limited; pausing ${Math.round(waitMs / 1000)}s before retry`);
      await sleep(waitMs);
      continue;
    }
    throw new Error(`download HTTP ${res.status}`);
  }
  throw new Error('download retry exhausted');
}

function extFromContentType(ct) {
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  return 'jpg'; // default: jpeg
}

async function uploadToStorage(filename, buf, contentType) {
  // Storage REST: POST /object/figures/{filename} with raw bytes.
  // `x-upsert: true` lets us replace existing objects safely (re-runs).
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/figures/${filename}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'x-upsert': 'true',
    },
    body: buf,
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`upload HTTP ${res.status}: ${body}`);
    err.status = res.status;
    throw err;
  }
}

// Wikimedia URLs come in two shapes:
//   thumb:  /commons/thumb/X/XX/File.jpg/{N}px-File.jpg
//   direct: /commons/X/XX/File.jpg
// Return a thumb-URL variant at the given pixel width for either shape,
// or null if the URL isn't a recognizable Wikimedia commons URL.
function resizedThumbUrl(url, width) {
  // Already a thumb URL — just swap the width.
  const thumb = url.match(
    /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/[^/]+\/[^/]+\/[^/]+\/)(\d+)px-(.+)$/,
  );
  if (thumb) return `${thumb[1]}${width}px-${thumb[3]}`;
  // Direct URL — synthesize a thumb URL.
  const direct = url.match(
    /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([^/]+)\/([^/]+)\/([^/?]+)(\?.*)?$/,
  );
  if (direct) {
    const [, a, b, filename] = direct;
    return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${b}/${filename}/${width}px-${filename}`;
  }
  return null;
}

async function patchImageUrl(id, url) {
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
      body: JSON.stringify({ image_url: url }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PATCH HTTP ${res.status}: ${body}`);
  }
}

async function main() {
  const all = await listAllFigures();
  const candidates = only ? all.filter((f) => f.id.toLowerCase().includes(only)) : all;

  // Skip null images, skip already-mirrored unless --force.
  const todo = candidates.filter((f) => {
    if (!f.image_url) return false;
    if (!force && f.image_url.startsWith(STORAGE_HOST)) return false;
    return true;
  });

  const skipped = candidates.length - todo.length;
  console.log(
    `${all.length} total figures, ${todo.length} to mirror` +
      (skipped ? `  (${skipped} skipped: null or already mirrored)` : '') +
      (force ? '  (--force)' : '') +
      (only ? `  (filter: ${only})` : ''),
  );

  let ok = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < todo.length; i++) {
    const fig = todo[i];
    const label = `[${String(i + 1).padStart(3, '0')}/${todo.length}] ${fig.id}`;
    try {
      let sourceUrl = fig.image_url;
      let buf, contentType;
      for (const tryWidth of [null, 1280, 800]) {
        if (tryWidth !== null) {
          const resized = resizedThumbUrl(fig.image_url, tryWidth);
          if (!resized) {
            // URL isn't a thumb pattern we can rewrite; give up.
            throw new Error('payload too large and URL not resizable');
          }
          sourceUrl = resized;
          console.log(`    retrying at ${tryWidth}px (file too large)`);
        }
        const dl = await downloadImage(sourceUrl);
        buf = dl.buf;
        contentType = dl.contentType;
        const filename = `${fig.id}.${extFromContentType(contentType)}`;
        try {
          await uploadToStorage(filename, buf, contentType);
          const newUrl = STORAGE_HOST + filename;
          await patchImageUrl(fig.id, newUrl);
          ok++;
          console.log(`${label}  OK  (${(buf.length / 1024).toFixed(0)}KB → ${filename})`);
          break;
        } catch (uploadErr) {
          if (uploadErr.status === 400 || uploadErr.status === 413) {
            // Loop continues with a smaller thumb width.
            continue;
          }
          throw uploadErr;
        }
      }
    } catch (e) {
      failed++;
      failures.push({ id: fig.id, error: e.message });
      console.log(`${label}  FAIL  — ${e.message}`);
    }
    // Be polite to Wikimedia; their TOS suggests <10 req/sec/IP.
    // Pacing at ~500ms keeps us well under, and the 429 retry handles
    // any short bursts that still trip throttling.
    await sleep(500);
  }

  console.log(`\nDone. ok=${ok}  failed=${failed}`);
  if (failures.length) {
    console.log('Failures:');
    for (const f of failures) console.log(`  ${f.id}: ${f.error}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
