import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { estValideur } from "./internes";

/**
 * May this account validate club competition scores? The administrators, and the members whose fiche
 * (in Notion « Rôles ») has « ✅ Valideur chpt interne ». Returns also the player ids of the account (family).
 */
export async function droitsValideur(supabase: SupabaseClient, email: string | null | undefined, admin: boolean) {
  const e = (email || "").toLowerCase();
  if (!e) return { ok: admin, miens: [] as string[] };
  const { data } = await supabase.from("joueurs").select("notion_id,roles").eq("email", e);
  const fiches = (data || []) as { notion_id: string; roles: string[] | null }[];
  const ok = admin || fiches.some((f) => estValideur(f.roles));
  return { ok, miens: fiches.map((f) => f.notion_id) };
}
