import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Don't crash the whole app in dev before Supabase is configured —
  // just warn loudly. Fill packages/web/.env from .env.example.
  console.warn(
    '[RoadMate] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill in your Supabase project keys.',
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '');
