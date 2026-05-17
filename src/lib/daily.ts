import { loadNumber, loadString, saveNumber, saveString } from '@/lib/storage';
import type { Figure } from '@/types/figure';
import type { HintType } from '@/types/hint';

export type DailyPlay = {
  date: string; // ISO date, UTC, YYYY-MM-DD
  won: boolean;
  score: number;
  reveal: number;
  hintsUsed: HintType[];
  figureId: string;
  figureName: string;
};

// Today's date as ISO YYYY-MM-DD in UTC. UTC keeps the puzzle boundary
// the same for all players regardless of timezone.
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayIsoDate(today: string): string {
  const d = new Date(today + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Deterministic figure picker: same date + same pool order = same figure.
// Uses YYYYMMDD-as-number modulo pool length. Returns null on empty pool.
export function getDailyFigure(date: Date, pool: Figure[]): Figure | null {
  if (pool.length === 0) return null;
  const isoDay = date.toISOString().slice(0, 10).replace(/-/g, '');
  const seed = Number(isoDay);
  // Sort the pool by id for stability so the figure for a given date
  // doesn't change if the DB returns rows in different orders.
  const sorted = [...pool].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return sorted[seed % sorted.length] ?? null;
}

export function loadLastDailyPlay(): DailyPlay | null {
  const raw = loadString('daily:lastPlay');
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'date' in parsed &&
      'won' in parsed &&
      'figureId' in parsed
    ) {
      return parsed as DailyPlay;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLastDailyPlay(play: DailyPlay): void {
  saveString('daily:lastPlay', JSON.stringify(play));
}

export function getDailyStreak(): number {
  return loadNumber('daily:streak', 0);
}

// Update the day-streak counter based on today's outcome and the
// previously-stored play. Returns the new streak value (also writes
// it to localStorage). Pass `previousPlay` snapshotted BEFORE saving
// the new play — once saveLastDailyPlay runs, loadLastDailyPlay will
// return today's play and the math breaks.
export function updateDailyStreak(
  won: boolean,
  today: string,
  previousPlay: DailyPlay | null,
): number {
  if (!won) {
    saveNumber('daily:streak', 0);
    return 0;
  }
  const yesterday = yesterdayIsoDate(today);
  // Continue the streak only if the prior play was yesterday AND was won.
  if (previousPlay && previousPlay.date === yesterday && previousPlay.won) {
    const next = getDailyStreak() + 1;
    saveNumber('daily:streak', next);
    return next;
  }
  saveNumber('daily:streak', 1);
  return 1;
}

export function isPlayedToday(): boolean {
  const last = loadLastDailyPlay();
  if (!last) return false;
  return last.date === todayIsoDate();
}
