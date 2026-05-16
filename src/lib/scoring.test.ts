import { describe, it, expect } from 'vitest';

import { scoreChallengeRound, scoreGuess } from '@/lib/scoring';

describe('scoreGuess', () => {
  it('returns 90 for a tight reveal with no hints', () => {
    expect(scoreGuess(10, [])).toBe(90);
  });

  it('returns the floor (5) for a full reveal with no hints', () => {
    expect(scoreGuess(100, [])).toBe(5);
  });

  it('rounds revealPct before subtracting from 100', () => {
    expect(scoreGuess(42.4, [])).toBe(58);
    expect(scoreGuess(42.6, [])).toBe(57);
  });

  it('applies per-hint penalties', () => {
    expect(scoreGuess(10, ['era'])).toBe(85);
    expect(scoreGuess(10, ['field'])).toBe(80);
    expect(scoreGuess(10, ['region'])).toBe(80);
    expect(scoreGuess(10, ['letter'])).toBe(75);
  });

  it('sums multiple hint penalties', () => {
    expect(scoreGuess(10, ['era', 'field', 'region', 'letter'])).toBe(50);
  });

  it('never returns less than 5 even when penalties exceed base', () => {
    expect(scoreGuess(95, ['era', 'field', 'region', 'letter'])).toBe(5);
  });
});

describe('scoreChallengeRound', () => {
  it('matches scoreGuess for easy difficulty (multiplier x1)', () => {
    expect(scoreChallengeRound(10, [], 'easy')).toBe(scoreGuess(10, []));
    expect(scoreChallengeRound(50, ['era'], 'easy')).toBe(scoreGuess(50, ['era']));
  });

  it('applies 1.5x multiplier for medium', () => {
    expect(scoreChallengeRound(10, [], 'medium')).toBe(Math.round(90 * 1.5));
    expect(scoreChallengeRound(50, [], 'medium')).toBe(Math.round(50 * 1.5));
  });

  it('applies 2x multiplier for hard', () => {
    expect(scoreChallengeRound(10, [], 'hard')).toBe(180);
    expect(scoreChallengeRound(50, [], 'hard')).toBe(100);
  });

  it('respects the score floor before multiplying (5 x multiplier)', () => {
    expect(scoreChallengeRound(100, ['era', 'field', 'region', 'letter'], 'hard')).toBe(10);
  });
});
