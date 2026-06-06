// One-shot generator for the OG share card + favicon variants. Run
// when the logo or the OG copy changes; the outputs land in /public
// and are committed alongside the rest.
//
//   node scripts/generateOgAndFavicons.mjs
//
// Favicon source: public/logo.png (square). Sharp resizes it to the
// standard variants. OG image is built by compositing Napoleon (the
// landing-page hero portrait, J.-L. David 1812, public domain via
// Wikimedia) on the left with the editorial headline + tagline on
// the right. Mirrors the landing hero's dim + focal-box treatment
// exactly so the share card reads as the same brand artefact.

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
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
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(publicPath(name));
    console.log(`  ✓ ${name} (${size}×${size})`);
  }
}

// ---- OG image (1200×630) -----------------------------------------------

const NAPOLEON_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/The_Emperor_Napoleon_in_His_Study_at_the_Tuileries%2C_by_Jacques-Louis_David_%281812%29_-_National_Gallery_of_Art_%28Samuel_H._Kress_Foundation%29_-_2.jpg/960px-The_Emperor_Napoleon_in_His_Study_at_the_Tuileries%2C_by_Jacques-Louis_David_%281812%29_-_National_Gallery_of_Art_%28Samuel_H._Kress_Foundation%29_-_2.jpg';

// Focal box in container coords — matches HeroPortrait.tsx so the
// share card uses the exact same crop the landing displays.
const FOCAL_X = 0.45;
const FOCAL_Y = 0.3;
const BOX = 0.22;

async function fetchNapoleon() {
  const res = await fetch(NAPOLEON_URL, {
    headers: {
      // Wikimedia returns 403 to unknown user-agents.
      'User-Agent':
        'PFH-OG-Generator/1.0 (peoplefromhistory.com; peoplefromhistorygame@gmail.com)',
    },
  });
  if (!res.ok) throw new Error(`Napoleon fetch HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function buildOgPng(napoleonRaw) {
  const W = 1200;
  const H = 630;
  const IMG_SIZE = 630; // square painted column on the left

  // Cover-crop the painting to a 630×630 square anchored at the
  // top — same `object-position: 50% 0%` the landing uses.
  const napoleonSquare = await sharp(napoleonRaw)
    .resize(IMG_SIZE, IMG_SIZE, { fit: 'cover', position: 'top' })
    .toBuffer();

  // Dimmed layer (30% opacity) covering the full 630×630.
  const dimmed = await sharp(napoleonSquare)
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${IMG_SIZE}" height="${IMG_SIZE}"><rect width="${IMG_SIZE}" height="${IMG_SIZE}" fill="rgba(242,233,210,0.70)"/></svg>`,
        ),
        top: 0,
        left: 0,
      },
    ])
    .toBuffer();

  // Focal cutout — full-opacity copy cropped to the focal rectangle.
  const focalLeft = Math.round((FOCAL_X - BOX / 2) * IMG_SIZE);
  const focalTop = Math.round((FOCAL_Y - BOX / 2) * IMG_SIZE);
  const focalW = Math.round(BOX * IMG_SIZE);
  const focalH = focalW;
  const focalRect = await sharp(napoleonSquare)
    .extract({ left: focalLeft, top: focalTop, width: focalW, height: focalH })
    .toBuffer();

  // SVG overlay: white focal-box border, plate caption, and the
  // entire right-hand text column. Composited on top of the dimmed
  // image so all text is crisp vector.
  const overlay = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      .serif { font-family: 'Newsreader', 'Times New Roman', Georgia, serif; }
      .mono  { font-family: 'SF Mono', Menlo, monospace; }
    </style>
  </defs>

  <!-- White focal box matching the landing's hairline + soft shadow. -->
  <rect x="${focalLeft - 1}" y="${focalTop - 1}"
        width="${focalW + 2}" height="${focalH + 2}"
        rx="2" ry="2"
        fill="none"
        stroke="rgba(255,255,255,0.95)" stroke-width="2.5"/>

  <!-- Plate caption bottom-left of the painting column. -->
  <text x="14" y="612"
        class="mono"
        fill="rgba(255,255,255,0.78)"
        font-size="13"
        letter-spacing="1.8"
        font-weight="500">NAPOLEON · J.-L. DAVID, 1812</text>

  <!-- Right-hand text column (cream paper, x = 660 → 1170). -->

  <!-- Editorial eyebrow. -->
  <text x="660" y="150"
        class="mono"
        fill="#B5822A"
        font-size="22"
        letter-spacing="5"
        font-weight="500">PEOPLE FROM HISTORY</text>

  <!-- Headline — two lines so the italicised noun gets its own visual
       weight without breaking awkwardly. -->
  <text x="660" y="278"
        class="serif"
        fill="#161616"
        font-size="58"
        font-weight="500"
        letter-spacing="-1.4">Like Geoguessr,</text>
  <text x="660" y="346"
        class="serif"
        fill="#161616"
        font-size="58"
        font-weight="500"
        letter-spacing="-1.4">but for <tspan font-style="italic" fill="#B5822A">history</tspan>.</text>

  <!-- Sub-line. -->
  <text x="660" y="410"
        class="serif"
        fill="#73726C"
        font-size="24"
        font-weight="400">650 figures. Tighter crop, higher score.</text>

  <!-- Ornament: rule · amber dot · rule. -->
  <line x1="660" y1="495" x2="755" y2="495"
        stroke="rgba(22,22,22,0.18)" stroke-width="1"/>
  <circle cx="780" cy="495" r="5" fill="#B5822A"/>
  <line x1="805" y1="495" x2="900" y2="495"
        stroke="rgba(22,22,22,0.18)" stroke-width="1"/>

  <!-- Footer wordmark. -->
  <text x="660" y="585"
        class="mono"
        fill="#161616"
        font-size="20"
        font-weight="500"
        letter-spacing="3">peoplefromhistory.com</text>
</svg>`);

  // Stack: cream background → dimmed painting on the left half →
  // focal rect at full opacity over the dimmed area → SVG overlay
  // with border + text on top.
  return sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 242, g: 233, b: 210, alpha: 1 },
    },
  })
    .composite([
      { input: dimmed, top: 0, left: 0 },
      { input: focalRect, top: focalTop, left: focalLeft },
      { input: overlay, top: 0, left: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(publicPath('og-image.png'));
}

async function generateOg() {
  console.log('  → fetching Napoleon (Wikimedia)…');
  const napoleonRaw = await fetchNapoleon();
  await buildOgPng(napoleonRaw);
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
