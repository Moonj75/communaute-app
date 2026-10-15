import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Players concerned by each competition's form (event id → player ids).
 * An event that is not in the map is open to every active player (default).
 */
export type Eligibles = Map<string, string[]>;

export async function lireEligibles(db: SupabaseClient): Promise<Eligibles> {
  const m: Eligibles = new Map();
  const { data, error } = await db.from("formulaire_joueurs").select("evenement_id,joueur_id");
  if (error) return m; // table not created yet: everybody is concerned
  for (const r of (data || []) as { evenement_id: string; joueur_id: string }[]) m.set(r.evenement_id, [...(m.get(r.evenement_id) || []), r.joueur_id]);
  return m;
}
