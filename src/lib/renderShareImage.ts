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

import type { Difficulty } from '@/types/figure';
import type { HintType } from '@/types/hint';
import type { DailyPlay } from '@/lib/daily';

type ChallengeRoundResult = {
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
// First call to a font family in canvas only blocks on the first
// glyph paint, so we don't need to await document.fonts.
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

function drawBackdrop(ctx: CanvasRenderingContext2D) {
  // Cream base, with a paper-tinted top half for editorial contrast.
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, SIZE, SIZE * 0.42);
  // Hairline rule separating the two zones.
  ctx.strokeStyle = HAIRLINE_STRONG;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, SIZE * 0.42);
  ctx.lineTo(SIZE - PAD, SIZE * 0.42);
  ctx.stroke();
}

function drawWordmark(ctx: CanvasRenderingContext2D, eyebrow: string) {
  // Top archival mark.
  ctx.fillStyle = AMBER;
  ctx.font = `500 22px ${FONT_MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(eyebrow.toUpperCase(), PAD, PAD);
  // Brand name on the right.
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

// Draw the 10-square reveal grid centered horizontally at the given y.
// `filledCount` cells get the amber-soft fill; `lossMode` paints all
// cells dark instead.
function drawRevealGrid(
  ctx: CanvasRenderingContext2D,
  y: number,
  filledCount: number,
  lossMode: boolean,
) {
  const cells = 10;
  const cellSize = 56;
  const gap = 10;
  const total = cells * cellSize + (cells - 1) * gap;
  const startX = (SIZE - total) / 2;
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
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.75, y + 0.75, cellSize - 1.5, cellSize - 1.5);
    }
  }
}

// Wrap fillText so a single long string can break across lines if it
// outgrows maxWidth. Simple greedy word-wrap; good enough for the
// short strings we use here.
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(' ');
  let line = '';
  let cursorY = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
  return cursorY + lineHeight;
}

// =========================================================================
// Daily
// =========================================================================

export async function renderDailyShareImage(play: DailyPlay, streak: number): Promise<Blob> {
  const canvas = newCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  const dateLabel = new Date(play.date + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  drawBackdrop(ctx);
  drawWordmark(ctx, `Daily · ${dateLabel}`);

  // Main headline — display serif, mid-upper third.
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const headlineY = 200;
  ctx.font = `400 92px ${FONT_DISPLAY}`;
  const headline = play.won ? `Solved at ${play.reveal}%` : `It was ${play.figureName}`;
  drawWrappedText(ctx, headline, SIZE / 2, headlineY, SIZE - PAD * 2, 100);

  // Sub-line.
  ctx.font = `400 32px ${FONT_DISPLAY}`;
  ctx.fillStyle = BODY;
  const subY = headlineY + 160;
  if (play.won) {
    ctx.fillText(`${play.score} points · Day ${streak} streak`, SIZE / 2, subY);
  } else {
    ctx.fillText(`Gave up. Streak reset.`, SIZE / 2, subY);
  }

  // Reveal grid.
  const filled = play.won
    ? Math.max(1, Math.min(10, Math.round(play.reveal / 10)))
    : 10;
  const gridY = 620;
  drawRevealGrid(ctx, gridY, filled, !play.won);

  // Caption under grid.
  ctx.font = `400 italic 26px ${FONT_DISPLAY}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(
    play.won ? `${filled} of 10 increments shaded` : 'No solve today',
    SIZE / 2,
    gridY + 100,
  );

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

export async function renderChallengeShareImage(run: ChallengeRun): Promise<Blob> {
  const canvas = newCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  const dateLabel = new Date(run.finishedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
  const correct = run.results.filter((r) => r.outcome === 'won').length;

  drawBackdrop(ctx);
  drawWordmark(ctx, `Challenge · ${dateLabel}`);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Score headline — big number.
  ctx.font = `400 156px ${FONT_DISPLAY}`;
  ctx.fillStyle = INK;
  ctx.fillText(String(run.total), SIZE / 2, 175);

  ctx.font = `400 28px ${FONT_DISPLAY}`;
  ctx.fillStyle = AMBER;
  ctx.fillText('POINTS', SIZE / 2, 360);

  ctx.font = `400 36px ${FONT_DISPLAY}`;
  ctx.fillStyle = BODY;
  ctx.fillText(`${correct} of ${run.results.length} correct`, SIZE / 2, 412);

  // Round-outcome grid — one cell per round.
  const cellSize = 60;
  const gap = 12;
  const cells = run.results.length;
  const totalW = cells * cellSize + (cells - 1) * gap;
  const gridY = 580;
  const startX = (SIZE - totalW) / 2;
  for (let i = 0; i < cells; i++) {
    const r = run.results[i];
    const x = startX + i * (cellSize + gap);
    if (r.outcome === 'won') {
      ctx.fillStyle = AMBER_SOFT_2;
      ctx.fillRect(x, gridY, cellSize, cellSize);
    } else {
      ctx.strokeStyle = HAIRLINE_STRONG;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.75, gridY + 0.75, cellSize - 1.5, cellSize - 1.5);
    }
  }

  // Tier letters under each cell.
  ctx.fillStyle = MUTED;
  ctx.font = `500 22px ${FONT_MONO}`;
  ctx.textBaseline = 'top';
  for (let i = 0; i < cells; i++) {
    const r = run.results[i];
    const x = startX + i * (cellSize + gap) + cellSize / 2;
    ctx.fillText(TIER_LETTER[r.difficulty], x, gridY + cellSize + 16);
  }

  drawFooter(ctx);
  return canvasToBlob(canvas);
}
