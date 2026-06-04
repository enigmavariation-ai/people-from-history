// Cross-mode "don't show the same figure twice in a row" memory.
// All three game modes (Practice / Challenge / Daily) draw from the
// same Supabase pool, and a player who finishes a 10-figure Challenge
// then starts a Practice round shouldn't see the same faces flash by
// 30 seconds apart.
//
// We keep a small ring buffer in localStorage and the picker filters
// it out as the first preference. If filtering would leave the pool
// empty (e.g. the Easy tier is so small that everyone is in cooldown),
// the picker falls back to ignoring cooldown — so the cap below isn't
// a hard "you've seen them all" wall, just a strong preference for
// freshness.
//
// Daily mode is deterministic by date so it doesn't consult the
// cooldown; it does, however, mark its figure as shown so a later
// Practice session benefits.

import { loadString, saveString } from '@/lib/storage';

const STORAGE_KEY = 'figures:cooldown';

// How many recently-shown figures to remember. ~30% of the smallest
// playable tier (Easy ≈ 137, Hard ≈ 130). Tuning knob — bumping this
// up makes repeats rarer at the cost of more "fallback to ignoring
// cooldown" hits.
export const COOLDOWN_SIZE = 40;

function loadQueue(): string[] {
  const raw = loadString(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

function saveQueue(q: string[]): void {
  saveString(STORAGE_KEY, JSON.stringify(q));
}

// All recently-shown figure ids, as a Set for O(1) membership checks
// inside the picker. Returns a fresh Set on each call; do not retain.
export function getRecentIds(): Set<string> {
  return new Set(loadQueue());
}

// Mark a figure as just shown. Idempotent for same-id back-to-back
// calls (we de-dupe before re-prepending). Trims the queue to
// COOLDOWN_SIZE; oldest entries fall off the end.
export function markShown(figureId: string): void {
  if (!figureId) return;
  const current = loadQueue();
  const without = current.filter((id) => id !== figureId);
  const next = [figureId, ...without].slice(0, COOLDOWN_SIZE);
  saveQueue(next);
}

// Reset the cooldown queue. Used by tests and by a "start fresh"
// flow if we add one.
export function clearCooldown(): void {
  saveString(STORAGE_KEY, '');
}
