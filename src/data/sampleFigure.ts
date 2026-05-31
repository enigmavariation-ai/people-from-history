import type { Figure } from '@/types/figure';

export const sampleFigure: Figure & { image_url: string } = {
  id: 'placeholder',
  name: 'Placeholder Figure',
  aliases: ['placeholder'],
  image_url: '/sample-portrait.svg',
  focal_x: 0.5,
  focal_y: 0.62,
  start_size: 0.15,
  focal_note: 'mustache',
  difficulty: 'easy',
  era: '',
  field: '',
  region: '',
  first_letter: 'P',
  enabled: true,
  created_at: new Date(0).toISOString(),
  summary: '',
  wikipedia_url: null,
};
