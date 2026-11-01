import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client using the secret key (bypasses RLS; every table has RLS on
// and no policies, so this is the only way in). Never import this from a client component:
// the `server-only` import above makes the build fail if that happens.

let client: SupabaseClient | null = null;

/** Returns the shared client, or null when the database isn't configured (e.g. local sample work). */
export function getDb(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
