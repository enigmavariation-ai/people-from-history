export type Difficulty = 'easy' | 'medium' | 'hard';

export type Figure = {
  id: string;
  name: string;
  aliases: string[];
  image_url: string | null;
  focal_x: number;
  focal_y: number;
  start_size: number;
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
