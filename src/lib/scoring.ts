import type { HintType } from '@/types/hint';

const HINT_COSTS: Record<HintType, number> = {
  era: 5,
  field: 10,
  region: 10,
  letter: 15,
};

export function scoreGuess(revealPct: number, hintsUsed: HintType[]): number {
  const base = Math.max(5, Math.round(100 - revealPct));
  const penalty = hintsUsed.reduce((sum, h) => sum + HINT_COSTS[h], 0);
  return Math.max(5, base - penalty);
}
