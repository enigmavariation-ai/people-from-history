import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url) {
  throw new Error('VITE_SUPABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
}
if (!key) {
  throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY is not set. Copy .env.example to .env.local and fill it in.');
}

export const supabase = createClient(url, key);
