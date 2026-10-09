import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Privileged client used ONLY by the daily automatic job (no signed-in user there).
 * Needs SUPABASE_SECRET_KEY in Vercel (Supabase → Project Settings → API Keys → secret key).
 * Never import this from a page or a client component.
 */
export function clientAdmin(): SupabaseClient | null {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
