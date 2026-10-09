import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JoueurLite } from "./club-types";

/** Players visible to the signed-in person (whole club for admins, own family otherwise — RLS). */
export async function chargerJoueurs(supabase: SupabaseClient, email?: string | null): Promise<JoueurLite[]> {
  let q = supabase.from("joueurs").select("notion_id,prenom,nom,email,actif").order("prenom");
  if (email) q = q.eq("email", email.toLowerCase());
  const { data } = await q;
  return ((data || []) as { notion_id: string; prenom: string | null; nom: string; email: string | null; actif: boolean }[]).map((j) => ({
    notionId: j.notion_id,
    nom: [j.prenom, j.nom].filter(Boolean).join(" "),
    email: j.email,
    actif: j.actif,
  }));
}
