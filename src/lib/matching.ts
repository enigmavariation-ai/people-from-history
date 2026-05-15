import { distance } from 'fastest-levenshtein';

const PUNCTUATION_RE = /[.,'-]/g;
const WHITESPACE_RE = /\s+/g;

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(PUNCTUATION_RE, '')
    .replace(WHITESPACE_RE, ' ');
}

export function matches(guess: string, candidates: string[]): boolean {
  const g = normalize(guess);
  if (g.length === 0) return false;

  for (const candidate of candidates) {
    const c = normalize(candidate);
    if (g === c) return true;
    if (g.length >= 4 && distance(g, c) <= 2) return true;
  }
  return false;
}
