export type Difficulty = 'easy' | 'medium' | 'hard';

// Alternative facial focal point for a figure. Used by the reveal
// picker to vary which feature the round starts cropped on, so the
// same face doesn't always start at the same eye / brow / lip.
export type FocalAlt = {
  x: number;
  y: number;
  start_size: number;
  note?: string;
};

export type Figure = {
  id: string;
  name: string;
  aliases: string[];
  image_url: string | null;
  focal_x: number;
  focal_y: number;
  start_size: number;
  focal_alts: FocalAlt[];
  focal_note: string;
  difficulty: Difficulty;
  era: string;
  field: string;
  region: string;
  first_letter: string;
  enabled: boolean;
  created_at: string;
  // Wikipedia-derived bio shown in the reveal panel. `summary` is the
  // first paragraph; `wikipedia_url` is the canonical article URL.
  summary: string;
  wikipedia_url: string | null;
};
