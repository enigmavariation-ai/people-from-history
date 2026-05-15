import { describe, it, expect } from 'vitest';

import { matches, normalize } from '@/lib/matching';

describe('normalize', () => {
  it('lowercases', () => {
    expect(normalize('Einstein')).toBe('einstein');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalize('  einstein  ')).toBe('einstein');
  });

  it("strips periods, commas, apostrophes, and hyphens", () => {
    expect(normalize("Marie-Curie")).toBe('mariecurie');
    expect(normalize("d'Arc")).toBe('darc');
    expect(normalize('Dr. King, Jr.')).toBe('dr king jr');
  });

  it('collapses internal whitespace to single spaces', () => {
    expect(normalize('albert   einstein')).toBe('albert einstein');
  });
});

describe('matches', () => {
  it('returns true on exact match after normalization', () => {
    expect(matches('Einstein', ['einstein'])).toBe(true);
  });

  it('matches across multiple candidates', () => {
    expect(matches('Einstein', ['Curie', 'Tesla', 'Einstein'])).toBe(true);
  });

  it('tolerates 1-character typos for guesses 4+ chars', () => {
    expect(matches('Einstien', ['Einstein'])).toBe(true);
  });

  it('tolerates 2-character edit distance', () => {
    expect(matches('nstein', ['Einstein'])).toBe(true);
  });

  it('rejects edit distance of 3 or more', () => {
    expect(matches('Ainstien', ['Einstein'])).toBe(false);
  });

  it('requires exact match for guesses under 4 characters', () => {
    expect(matches('Ali', ['Ali'])).toBe(true);
    expect(matches('Alx', ['Ali'])).toBe(false);
  });

  it('returns false for an empty or whitespace-only guess', () => {
    expect(matches('', ['Einstein'])).toBe(false);
    expect(matches('   ', ['Einstein'])).toBe(false);
  });

  it('returns false when no candidates are given', () => {
    expect(matches('Einstein', [])).toBe(false);
  });

  it('treats punctuation differences as exact matches', () => {
    expect(matches("Joan of Arc", ['joan-of-arc'])).toBe(true);
  });
});
