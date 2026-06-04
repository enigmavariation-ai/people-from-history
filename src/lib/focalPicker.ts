// Round-time focal point picker. A figure has a primary focal
// (focal_x / focal_y / start_size) plus an optional array of
// alternate facial features (focal_alts). When the game starts
// a round, this helper picks one of those — the primary or one of
// the alts — so the same face doesn't always start cropped on the
// same feature.
//
// Pure function. Caller controls "stability per round" by memoising
// on figure.id (random pick) or by passing a deterministic seed
// (Daily mode uses the date so all players see the same crop).

import type { Figure } from '@/types/figure';

export type ActiveFocal = {
  x: number;
  y: number;
  startSize: number;
};

function primaryFocal(figure: Figure): ActiveFocal {
  return {
    x: figure.focal_x,
    y: figure.focal_y,
    startSize: figure.start_size,
  };
}

// Returns the primary focal followed by each alt as an ActiveFocal,
// in declaration order. Empty alts → single-element array.
function focalOptions(figure: Figure): ActiveFocal[] {
  const primary = primaryFocal(figure);
  const alts = (figure.focal_alts ?? []).map((a) => ({
    x: a.x,
    y: a.y,
    startSize: a.start_size,
  }));
  return [primary, ...alts];
}

// Pick one focal for the round.
//
//   - With `seed`: deterministic. seed % count → same input always
//     yields the same focal. Used by Daily so every player sees the
//     same crop.
//   - Without `seed`: random pick at call time. Used by Practice
//     and Challenge so a re-spawn of the same figure (rare with
//     the rotation cooldown, but possible) doesn't reveal from the
//     same spot.
export function pickRoundFocal(figure: Figure, seed?: number): ActiveFocal {
  const options = focalOptions(figure);
  if (options.length === 1) return options[0]!;
  const idx =
    seed !== undefined
      ? Math.abs(Math.floor(seed)) % options.length
      : Math.floor(Math.random() * options.length);
  return options[idx] ?? options[0]!;
}

// Daily uses the date number (YYYYMMDD) as a seed so the crop is
// stable across players, devices, and refreshes within a UTC day.
export function dailyFocalSeed(isoDate: string): number {
  return Number(isoDate.replace(/-/g, '')) || 0;
}
