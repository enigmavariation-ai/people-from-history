import { supabase } from '@/lib/supabase';
import type { Figure } from '@/types/figure';

export async function listPlayableFigures(): Promise<Figure[]> {
  const { data, error } = await supabase.from('figures').select('*');
  if (error) throw error;
  return (data ?? []) as Figure[];
}
