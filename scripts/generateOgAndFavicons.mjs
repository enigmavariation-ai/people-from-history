// One-shot generator for the OG share card + favicon variants. Run
// when the logo or the OG copy changes; the outputs land in /public
// and are committed alongside the rest.
//
//   node scripts/generateOgAndFavicons.mjs
//
// Favicon source: public/logo.png (square). Sharp resizes it to the
// standard variants. OG image is built from scratch as an SVG
// (cream paper, editorial display serif, amber accents) then
// rasterised to PNG at 1200×630 — Open Graph / Twitter standard.

import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PUBLIC_URL = new URL('../public/', import.meta.url);
const PUBLIC = fileURLToPath(PUBLIC_URL);
mkdirSync(PUBLIC, { recursive: true });

const LOGO_PATH = fileURLToPath(new URL('logo.png', PUBLIC_URL));

function publicPath(name) {
  return fileURLToPath(new URL(name, PUBLIC_URL));
}

// ---- Favicons ----------------------------------------------------------

async function generateFavicons() {
  const sizes = [
    ['favicon-16.png', 16],
    ['favicon-32.png', 32],
    ['favicon-48.png', 48],
    ['favicon-192.png', 192],
    ['favicon-512.png', 512],
    ['apple-touch-icon.png', 180],
  ];
  for (const [name, size] of sizes) {
    await sharp(LOGO_PATH)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(publicPath(name));
    console.log(`  ✓ ${name} (${size}×${size})`);
  }
}

// ---- OG image (1200×630) -----------------------------------------------

// Build an SVG that mirrors the editorial in-app aesthetic: cream
// paper, mono eyebrow in amber, display-serif headline with the key
// noun italicised in amber, body sub-line in muted ink, and the
// canonical domain on a hairline at the bottom. SVG → PNG via sharp
// gives crisp rasterisation at any final size.
function buildOgSvg() {
  const W = 1200;
  const H = 630;
  const CREAM = '#F2E9D2';
  const INK = '#161616';
  const MUTED = '#73726C';
  const AMBER = '#B5822A';
  const HAIRLINE = 'rgba(22,22,22,0.18)';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      .serif { font-family: 'Newsreader', 'Times New Roman', Georgia, serif; }
      .mono  { font-family: 'SF Mono', Menlo, monospace; }
    </style>
  </defs>

  <!-- Paper background -->
  <rect width="${W}" height="${H}" fill="${CREAM}"/>

  <!-- Top eyebrow -->
  <text x="${W / 2}" y="118" text-anchor="middle"
        class="mono"
        fill="${AMBER}"
        font-size="24"
        letter-spacing="6"
        font-weight="500">PEOPLE FROM HISTORY  ·  DAILY GAME</text>

  <!-- Headline -->
  <text x="${W / 2}" y="290" text-anchor="middle"
        class="serif"
        fill="${INK}"
        font-size="92"
        font-weight="500"
        letter-spacing="-1.5">Guess the figure from <tspan font-style="italic" fill="${AMBER}">history</tspan>.</text>

  <!-- Sub-line -->
  <text x="${W / 2}" y="372" text-anchor="middle"
        class="serif"
        fill="${MUTED}"
        font-size="32"
        font-weight="400">650 historical portraits. Tighter crop, higher score.</text>

  <!-- Editorial ornament: rule · amber dot · rule -->
  <line x1="450" y1="448" x2="555" y2="448" stroke="${HAIRLINE}" stroke-width="1"/>
  <circle cx="600" cy="448" r="5" fill="${AMBER}"/>
  <line x1="645" y1="448" x2="750" y2="448" stroke="${HAIRLINE}" stroke-width="1"/>

  <!-- Footer wordmark -->
  <text x="${W / 2}" y="555" text-anchor="middle"
        class="mono"
        fill="${INK}"
        font-size="22"
        font-weight="500"
        letter-spacing="3">peoplefromhistory.com</text>
</svg>`;
}

async function generateOg() {
  const svg = buildOgSvg();
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(publicPath('og-image.png'));
  console.log('  ✓ og-image.png (1200×630)');
}

// ---- Main --------------------------------------------------------------

async function main() {
  console.log('Generating favicons…');
  await generateFavicons();
  console.log('\nGenerating OG image…');
  await generateOg();
  console.log('\nDone. Files in public/.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Suppress unused-var hint for writeFileSync (kept for future
// expansion: webmanifest emit, ico bundling, etc).
void writeFileSync;
