import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Anon (publishable) client used for auth flows like sign-up. Server-side, so
// we don't persist sessions.
export const createSupabaseClient = (
  url: string,
  key: string,
): SupabaseClient =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

// Service-role client for admin operations (e.g. listing users). NEVER expose
// the service-role key to the browser.
export const createSupabaseServiceClient = (
  url: string,
  serviceKey: string,
): SupabaseClient =>
  createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
