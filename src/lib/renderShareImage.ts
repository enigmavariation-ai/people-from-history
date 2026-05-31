// Canvas-rendered share images for daily + challenge results. Returns
// a 1080×1080 PNG Blob suitable for Web Share API / Instagram / Twitter.
//
// Why canvas, not a server-rendered OG image? No backend. Canvas lets
// us produce a real screenshot-quality PNG entirely client-side, then
// pass it directly to navigator.share({ files: [...] }).
//
// Type-safety note: we keep the input shapes local to this module so
// the caller doesn't have to reshape its data — just pass the existing
// DailyPlay / LastRun object.

import type { Difficulty, Figure } from '@/types/figure';
import type { HintType } from '@/types/hint';
import type { DailyPlay } from '@/lib/daily';

type ChallengeRoundResult = {
  figureId: string;
  figureName: string;
  difficulty: Difficulty;
  outcome: 'won' | 'lost';
  reveal: number;
  hintsUsed: HintType[];
  finalScore: number;
};

type ChallengeRun = {
  results: ChallengeRoundResult[];
  total: number;
  finishedAt: string;
};

// Editorial palette — keep aligned with index.css and the in-app cards.
const CREAM = '#F2E9D2';
const PAPER = '#F8F1DE';
const INK = '#161616';
const BODY = '#3D3D3A';
const MUTED = '#73726C';
const AMBER = '#B5822A';
const AMBER_SOFT_2 = '#E8CF9A';
const HAIRLINE_STRONG = 'rgba(22,22,22,0.18)';

// Square 1080 is the modern social default (Instagram); Twitter / OG
// will downscale or crop edges, which is fine for an editorial layout.
const SIZE = 1080;
const PAD = 72;

// `Newsreader` is loaded by the app and should be available by the
// time the user can press Share. Fall back to system serif if not.
const FONT_DISPLAY = '"Newsreader", "Times New Roman", serif';
const FONT_MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

function newCanvas() {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  return c;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null'))),
      'image/png',
    );
  });
}

// Load an image with crossOrigin=anonymous so the resulting canvas
// stays untainted and toBlob() can read pixels. If the host doesn't
// send CORS headers, the load rejects and the caller falls back to
// the text-only layout.
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image load failed: ${url}`));
    img.src = url;
  });
}

// Make sure custom fonts are actually painted on the canvas — canvas
// won't trigger a font load by itself, so we ask for the family
// explicitly before drawing.
async function ensureFontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await Promise.all([
      document.fonts.load('500 92px "Newsreader"'),
      document.fonts.load('400 italic 92px "Newsreader"'),
      document.fonts.load('400 28px "Newsreader"'),
    ]);
  } catch {
    // Fall through; system serif fallback will be used.
  }
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawBackdrop(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function drawWordmark(
  ctx: CanvasRenderingContext2D,
  eyebrow: string,
) {
  ctx.fillStyle = AMBER;
  ctx.font = `500 22px ${FONT_MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(eyebrow.toUpperCase(), PAD, PAD);

  ctx.fillStyle = INK;
  ctx.font = `500 22px ${FONT_MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText('PEOPLE FROM HISTORY', SIZE - PAD, PAD);
}

function drawFooter(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = MUTED;
  ctx.font = `400 22px ${FONT_MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('peoplefromhistory.app', SIZE / 2, SIZE - PAD);
}

// Draw an image into a rounded rectangle frame as `object-fit: cover`
// with focal-point-aware positioning — same math as CSS
// `object-position: {focal_x*100}% {focal_y*100}%`. Means the face
// stays in frame even when the image is much wider or taller.
function drawFocalImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  focalX: number,
  focalY: number,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
  radius: number,
) {
  ctx.save();
  roundedRectPath(ctx, frameX, frameY, frameW, frameH, radius);
  ctx.clip();

  const scale = Math.max(frameW / img.width, frameH / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  // CSS-equivalent object-position: when the scaled image overflows
  // the frame, focal_x decides how much overflow falls off the left.
  const drawX = frameX + (frameW - drawW) * focalX;
  const drawY = frameY + (frameH - drawH) * focalY;

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
}

// Bottom-anchored gradient scrim inside a rounded portrait frame so
// the figure name + meta caption stays legible over any image.
function drawPortraitScrim(
  ctx: CanvasRenderingContext2D,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
  radius: number,
  scrimH: number,
) {
  ctx.save();
  roundedRectPath(ctx, frameX, frameY, frameW, frameH, radius);
  ctx.clip();
  const g = ctx.createLinearGradient(
    0,
    frameY + frameH - scrimH,
    0,
    frameY + frameH,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.35, 'rgba(0,0,0,0.30)');
  g.addColorStop(1, 'rgba(0,0,0,0.78)');
  ctx.fillStyle = g;
  ctx.fillRect(frameX, frameY + frameH - scrimH, frameW, scrimH);
  ctx.restore();
}

function drawPortraitFallback(
  ctx: CanvasRenderingContext2D,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
  radius: number,
  figureName: string,
) {
  ctx.save();
  roundedRectPath(ctx, frameX, frameY, frameW, frameH, radius);
  ctx.clip();
  ctx.fillStyle = PAPER;
  ctx.fillRect(frameX, frameY, frameW, frameH);
  ctx.fillStyle = MUTED;
  ctx.font = `400 italic 36px ${FONT_DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(figureName, frameX + frameW / 2, frameY + frameH / 2);
  ctx.restore();
}

function drawPortraitCaption(
  ctx: CanvasRenderingContext2D,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
  name: string,
  meta: string,
) {
  // Truncate the name if it would overflow at our chosen size; keep
  // a max width so the layout never breaks across two lines on a
  // very long name.
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.font = `500 50px ${FONT_DISPLAY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const maxNameW = frameW - 56;
  const display = truncateToWidth(ctx, name, maxNameW);
  ctx.fillText(display, frameX + 28, frameY + frameH - 36);

  if (meta) {
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = `500 14px ${FONT_MONO}`;
    const metaText = meta.toUpperCase();
    ctx.fillText(
      truncateToWidth(ctx, metaText, maxNameW),
      frameX + 28,
      frameY + frameH - 84,
    );
  }
}

function truncateToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = '…';
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    const candidate = text.slice(0, mid).trimEnd() + ellipsis;
    if (ctx.measureText(candidate).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + ellipsis;
}

// Compact reveal grid below the result. Centered horizontally; cells
// stay small so the portrait remains the visual hero.
function drawRevealGrid(
  ctx: CanvasRenderingContext2D,
  y: number,
  filledCount: number,
  lossMode: boolean,
) {
  const cells = 10;
  const cellSize = 30;
  const gap = 8;
  const totalW = cells * cellSize + (cells - 1) * gap;
  const startX = (SIZE - totalW) / 2;
  for (let i = 0; i < cells; i++) {
    const x = startX + i * (cellSize + gap);
    if (lossMode) {
      ctx.fillStyle = INK;
      ctx.fillRect(x, y, cellSize, cellSize);
    } else if (i < filledCount) {
      ctx.fillStyle = AMBER_SOFT_2;
      ctx.fillRect(x, y, cellSize, cellSize);
    } else {
      ctx.strokeStyle = HAIRLINE_STRONG;
      ctx.lineWidth = 1.25;
      ctx.strokeRect(x + 0.625, y + 0.625, cellSize - 1.25, cellSize - 1.25);
    }
  }
}

// =========================================================================
// Daily
// =========================================================================

// Layout (1080×1080):
//   y = 72:        eyebrow row (wordmark)
//   y = 128..680:  portrait frame 936×552 with scrim + name caption
//   y = 712:       result eyebrow (SOLVED / STUMPED)
//   y = 850:       big headline (alphabetic baseline) — reveal % / "Gave up."
//   y = 898:       caption line (points + streak)
//   y = 946:       compact 10-cell reveal grid
//   y = 1008:      footer wordmark (alphabetic baseline)
export async function renderDailyShareImage(
  play: DailyPlay,
  streak: number,
  figure: Figure | null,
): Promise<Blob> {
  const canvas = newCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  await ensureFontsReady();

  const dateLabel = new Date(play.date + 'T00:00:00Z').toLocaleDateString(
    'en-US',
    { month: 'long', day: 'numeric' },
  );

  drawBackdrop(ctx);
  drawWordmark(ctx, `Daily · ${dateLabel}`);

  // Portrait frame
  const frameX = PAD;
  const frameY = 128;
  const frameW = SIZE - PAD * 2;
  const frameH = 552;
  const frameR = 16;

  if (figure?.image_url) {
    try {
      const img = await loadImage(figure.image_url);
      drawFocalImage(
        ctx,
        img,
        figure.focal_x,
        figure.focal_y,
        frameX,
        frameY,
        frameW,
        frameH,
        frameR,
      );
    } catch {
      drawPortraitFallback(
        ctx,
        frameX,
        frameY,
        frameW,
        frameH,
        frameR,
        figure.name,
      );
    }
  } else {
    drawPortraitFallback(
      ctx,
      frameX,
      frameY,
      frameW,
      frameH,
      frameR,
      play.figureName,
    );
  }

  // Scrim + caption
  drawPortraitScrim(ctx, frameX, frameY, frameW, frameH, frameR, 220);
  const meta = figure
    ? [figure.era, figure.field, figure.region].filter(Boolean).join(' · ')
    : '';
  drawPortraitCaption(
    ctx,
    frameX,
    frameY,
    frameW,
    frameH,
    figure?.name ?? play.figureName,
    meta,
  );

  // Result eyebrow
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = play.won ? AMBER : MUTED;
  ctx.font = `500 18px ${FONT_MONO}`;
  ctx.fillText(play.won ? 'SOLVED' : 'STUMPED', SIZE / 2, 712);

  // Big headline — alphabetic baseline keeps the visual weight
  // anchored consistently across won/lost states.
  ctx.textBaseline = 'alphabetic';
  if (play.won) {
    ctx.fillStyle = AMBER;
    ctx.font = `400 italic 110px ${FONT_DISPLAY}`;
    ctx.fillText(`${play.reveal}%`, SIZE / 2, 850);
  } else {
    ctx.fillStyle = INK;
    ctx.font = `400 italic 78px ${FONT_DISPLAY}`;
    ctx.fillText('Gave up.', SIZE / 2, 840);
  }

  // Caption line
  ctx.fillStyle = BODY;
  ctx.font = `400 26px ${FONT_DISPLAY}`;
  ctx.textBaseline = 'top';
  const caption = play.won
    ? `+${play.score} points · Day ${streak} streak`
    : 'Streak reset';
  ctx.fillText(caption, SIZE / 2, 898);

  // Compact reveal grid
  const filled = play.won
    ? Math.max(1, Math.min(10, Math.round(play.reveal / 10)))
    : 10;
  drawRevealGrid(ctx, 946, filled, !play.won);

  drawFooter(ctx);
  return canvasToBlob(canvas);
}

// =========================================================================
// Challenge
// =========================================================================

const TIER_LETTER: Record<Difficulty, string> = {
  easy: 'E',
  medium: 'M',
  hard: 'H',
};

// Layout (1080×1080), hero variant:
//   y = 72:         eyebrow row (wordmark)
//   y = 128..608:   portrait frame 936×480 (best-round figure) with
//                   scrim + "Best round · {name}" caption
//   y = 640:        eyebrow "FINAL SCORE"
//   y = 808:        big total (alphabetic baseline, 168px)
//   y = 842:        accuracy sub-line
//   y = 892..922:   compact 10-cell W/L grid
//   y = 944:        tier letters under the grid
//   y = 1008:       footer wordmark
//
// Fallback variant (no won round → no portrait): the grid + score
// occupy the upper half of the canvas with the same scaffolding.
export async function renderChallengeShareImage(
  run: ChallengeRun,
  bestRound: ChallengeRoundResult | null,
  bestRoundFigure: { image_url: string | null; name: string; focal_x: number; focal_y: number } | null,
): Promise<Blob> {
  const canvas = newCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  await ensureFontsReady();

  const dateLabel = new Date(run.finishedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
  const correct = run.results.filter((r) => r.outcome === 'won').length;
  const accuracy = run.results.length
    ? Math.round((correct / run.results.length) * 100)
    : 0;

  drawBackdrop(ctx);
  drawWordmark(ctx, `Challenge · ${dateLabel}`);

  // Portrait frame (best round) — try to load the image; fall back
  // to a paper card with the figure name if it fails or no figure
  // is available.
  const frameX = PAD;
  const frameY = 128;
  const frameW = SIZE - PAD * 2;
  const frameH = 480;
  const frameR = 16;

  let portraitDrawn = false;
  if (bestRound && bestRoundFigure?.image_url) {
    try {
      const img = await loadImage(bestRoundFigure.image_url);
      drawFocalImage(
        ctx,
        img,
        bestRoundFigure.focal_x,
        bestRoundFigure.focal_y,
        frameX,
        frameY,
        frameW,
        frameH,
        frameR,
      );
      portraitDrawn = true;
    } catch {
      // Fall through to the paper fallback below.
    }
  }
  if (!portraitDrawn) {
    drawPortraitFallback(
      ctx,
      frameX,
      frameY,
      frameW,
      frameH,
      frameR,
      bestRound?.figureName ?? 'No solve this run',
    );
  }

  // Scrim + caption — only when we have a best round to credit.
  if (bestRound) {
    drawPortraitScrim(ctx, frameX, frameY, frameW, frameH, frameR, 200);
    // Custom caption with the "Best round" eyebrow + figure name + meta.
    ctx.save();
    roundedRectPath(ctx, frameX, frameY, frameW, frameH, frameR);
    ctx.clip();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.font = `500 14px ${FONT_MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(
      `BEST ROUND · +${bestRound.finalScore} POINTS`,
      frameX + 28,
      frameY + frameH - 84,
    );

    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.font = `500 44px ${FONT_DISPLAY}`;
    const maxNameW = frameW - 56;
    ctx.fillText(
      truncateToWidth(ctx, bestRound.figureName, maxNameW),
      frameX + 28,
      frameY + frameH - 36,
    );
    ctx.restore();
  }

  // Final-score eyebrow
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = AMBER;
  ctx.font = `500 18px ${FONT_MONO}`;
  ctx.fillText('FINAL SCORE', SIZE / 2, 640);

  // Big total
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.font = `400 168px ${FONT_DISPLAY}`;
  ctx.fillText(String(run.total), SIZE / 2, 808);

  // Sub-line — accuracy + correct ratio
  ctx.textBaseline = 'top';
  ctx.fillStyle = BODY;
  ctx.font = `400 26px ${FONT_DISPLAY}`;
  ctx.fillText(
    `${correct} of ${run.results.length} correct · ${accuracy}% accuracy`,
    SIZE / 2,
    828,
  );

  // 10-cell W/L grid (compact)
  const cellSize = 30;
  const cellGap = 8;
  const cells = run.results.length;
  const totalCellsW = cells * cellSize + (cells - 1) * cellGap;
  const gridY = 892;
  const gridStartX = (SIZE - totalCellsW) / 2;
  for (let i = 0; i < cells; i++) {
    const r = run.results[i];
    const x = gridStartX + i * (cellSize + cellGap);
    if (r.outcome === 'won') {
      ctx.fillStyle = AMBER_SOFT_2;
      ctx.fillRect(x, gridY, cellSize, cellSize);
    } else {
      ctx.strokeStyle = HAIRLINE_STRONG;
      ctx.lineWidth = 1.25;
      ctx.strokeRect(x + 0.625, gridY + 0.625, cellSize - 1.25, cellSize - 1.25);
    }
  }

  // Tier letters under each cell
  ctx.fillStyle = MUTED;
  ctx.font = `500 14px ${FONT_MONO}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  for (let i = 0; i < cells; i++) {
    const r = run.results[i];
    const x = gridStartX + i * (cellSize + cellGap) + cellSize / 2;
    ctx.fillText(TIER_LETTER[r.difficulty], x, gridY + cellSize + 10);
  }

  drawFooter(ctx);
  return canvasToBlob(canvas);
}

