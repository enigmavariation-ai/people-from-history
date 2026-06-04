import { describe, it, expect } from 'vitest';

import { matches, normalize } from '@/lib/matching';

describe('normalize', () => {
  it('lowercases', () => {
    expect(normalize('Einstein')).toBe('einstein');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalize('  einstein  ')).toBe('einstein');
  });

  it('treats hyphens and periods as word separators', () => {
    expect(normalize('Marie-Curie')).toBe('marie curie');
    expect(normalize('Dr. King, Jr.')).toBe('dr king jr');
    expect(normalize('T. S. Eliot')).toBe('t s eliot');
  });

  it('strips commas and apostrophes', () => {
    expect(normalize("d'Arc")).toBe('darc');
    expect(normalize('Smith, John')).toBe('smith john');
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

  it('matches the last name when guess includes a first name', () => {
    expect(matches('Albert Einstein', ['einstein'])).toBe(true);
    expect(matches('Madame Curie', ['Marie Curie'])).toBe(true);
    expect(matches('Sir Isaac Newton', ['Isaac Newton'])).toBe(true);
  });

  it('matches the last name when the candidate has the full form', () => {
    expect(matches('Einstein', ['Albert Einstein'])).toBe(true);
    expect(matches('Curie', ['Marie Skłodowska Curie'])).toBe(true);
  });

  it('tolerates a single-edit typo on a long last name', () => {
    expect(matches('Einstien', ['Einstein'])).toBe(true);
    expect(matches('Newtin', ['Newton'])).toBe(true);
  });

  it('tolerates a single typo on a short last name', () => {
    expect(matches('Kurt Cobane', ['Kurt Cobain'])).toBe(true);
  });

  it('rejects cross-name confusions where the first letter differs', () => {
    // The reported false positive: "George Darwin" should NOT match
    // "George Carlin" (last names start d/c).
    expect(matches('George Darwin', ['George Carlin'])).toBe(false);
    // "Carlin" vs "Darwin" the other way.
    expect(matches('George Carlin', ['Charles Darwin'])).toBe(false);
  });

  it('rejects edit distance beyond the cap', () => {
    // "Ainstien" vs "Einstein": first letters differ AND distance > 2.
    expect(matches('Ainstien', ['Einstein'])).toBe(false);
    // "Lincoln" vs "Lennon": same first letter but distance 3.
    expect(matches('Lincoln', ['Lennon'])).toBe(false);
  });

  it('requires exact match for last names shorter than 4 chars', () => {
    expect(matches('Ali', ['Muhammad Ali'])).toBe(true);
    expect(matches('Alii', ['Muhammad Ali'])).toBe(false);
    expect(matches('Alx', ['Ali'])).toBe(false);
  });

  it('ignores first-name differences as long as the last name matches', () => {
    // First name wrong but last name right — accept. The player
    // recognised the right person; we don't penalise spelling on
    // first names.
    expect(matches('Sarah Carlin', ['George Carlin'])).toBe(true);
  });

  it('returns false for an empty or whitespace-only guess', () => {
    expect(matches('', ['Einstein'])).toBe(false);
    expect(matches('   ', ['Einstein'])).toBe(false);
  });

  it('returns false when no candidates are given', () => {
    expect(matches('Einstein', [])).toBe(false);
  });

  it('treats punctuation differences as exact matches', () => {
    expect(matches('Joan of Arc', ['joan-of-arc'])).toBe(true);
  });
});
