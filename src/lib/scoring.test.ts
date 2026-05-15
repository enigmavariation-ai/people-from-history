import { describe, it, expect } from 'vitest';

import { scoreGuess } from '@/lib/scoring';

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
