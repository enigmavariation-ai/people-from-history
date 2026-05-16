import type { Difficulty } from '@/types/figure';
import type { HintType } from '@/types/hint';

const HINT_COSTS: Record<HintType, number> = {
  era: 5,
  field: 10,
  region: 10,
  letter: 15,
};

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2,
};

export function scoreGuess(revealPct: number, hintsUsed: HintType[]): number {
  const base = Math.max(5, Math.round(100 - revealPct));
  const penalty = hintsUsed.reduce((sum, h) => sum + HINT_COSTS[h], 0);
  return Math.max(5, base - penalty);
}

// Challenge-mode scoring: rewards harder figures with a difficulty multiplier.
// Practice mode uses scoreGuess directly (flat across difficulties).
export function scoreChallengeRound(
  revealPct: number,
  hintsUsed: HintType[],
  difficulty: Difficulty,
): number {
  return Math.round(scoreGuess(revealPct, hintsUsed) * DIFFICULTY_MULTIPLIER[difficulty]);
}
