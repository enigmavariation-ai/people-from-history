import { distance } from 'fastest-levenshtein';

// Hyphens and periods are word separators, not part of the name.
// "Marie-Curie" → "marie curie", "T. S. Eliot" → "t s eliot".
const SEPARATOR_RE = /[-.]/g;
const PUNCTUATION_RE = /[,']/g;
const WHITESPACE_RE = /\s+/g;

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(SEPARATOR_RE, ' ')
    .replace(PUNCTUATION_RE, '')
    .replace(WHITESPACE_RE, ' ')
    .trim();
}

// A guess matches if its last token (last name) closely matches the
// last token of any candidate alias. We deliberately anchor on the
// last name and ignore differences in the leading tokens, because:
//
//   - Last name is the discriminator. "George Carlin" and "George
//     Darwin" share the first name but are different people, and the
//     old "≤ 2 over the whole string" rule accepted that.
//   - First / middle name slop is common and benign — "Madame Curie",
//     "Sir Newton", "Mrs Roosevelt" — and we don't want to reject
//     correct identifications because of an honorific or wrong middle.
//
// Fuzzy rule on the last name: distance ≤ 2 AND first letter must
// match. The first-letter requirement rejects cross-name confusions
// where two different names happen to be 2 edits apart ("darwin"
// vs "carlin", distance 2 but starts d/c). The distance cap still
// covers the common typo cases ("einstien" → "einstein",
// "cobane" → "cobain"). There remain edge cases (e.g. "newman" vs
// "newton" share an 'n' prefix and are 2 edits apart) — we accept
// that tradeoff for keeping legitimate typos working.
export function matches(guess: string, candidates: string[]): boolean {
  const g = normalize(guess);
  if (g.length === 0) return false;

  for (const candidate of candidates) {
    const c = normalize(candidate);
    if (g === c) return true;
    if (matchesByLastName(g, c)) return true;
  }
  return false;
}

function matchesByLastName(g: string, c: string): boolean {
  if (g.length === 0 || c.length === 0) return false;
  const gLast = lastToken(g);
  const cLast = lastToken(c);
  return tokenFuzzyMatch(gLast, cLast);
}

function lastToken(s: string): string {
  const idx = s.lastIndexOf(' ');
  return idx === -1 ? s : s.slice(idx + 1);
}

function tokenFuzzyMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = Math.min(a.length, b.length);
  // Short tokens: too little signal for fuzzy matching — require exact.
  if (shorter < 4) return false;
  // First letter must match. Single most discriminative position
  // and the cheapest way to reject "darwin" ↔ "carlin".
  if (a[0] !== b[0]) return false;
  return distance(a, b) <= 2;
}
