import type { SupabaseClient } from "@supabase/supabase-js";

export type TypeMessage = "message" | "relance" | "notification";
export type Message = {
  id: string;
  cree_le: string;
  type: TypeMessage;
  de_email: string | null;
  de_nom: string | null;
  a_email: string | null;
  pour_staff: boolean;
  titre: string;
  texte: string | null;
  lien: string | null;
  parent: string | null;
  lu: boolean;
};
const COLS = "id,cree_le,type,de_email,de_nom,a_email,pour_staff,titre,texte,lien,parent,lu";

/** Unread mail of this account (and, for the staff, unread messages sent to the staff). */
export async function lireNonLus(db: SupabaseClient, email: string, admin: boolean) {
  try {
    const e = email.toLowerCase();
    let q = db.from("messages").select("id,titre,type,de_nom").eq("lu", false).order("cree_le", { ascending: false }).limit(20);
    q = admin ? q.or(`a_email.eq.${e},pour_staff.eq.true`) : q.eq("a_email", e);
    const { data, error } = await q;
    if (error) return [];
    return (data || []) as { id: string; titre: string; type: string; de_nom: string | null }[];
  } catch {
    return [];
  }
}

/** Everything this account may read (RLS), newest first. */
export async function lireCourrier(db: SupabaseClient) {
  const { data, error } = await db.from("messages").select(COLS).order("cree_le", { ascending: false }).limit(200);
  return { messages: (data || []) as Message[], erreur: error ? error.message : null };
}

/** Drops one copy of a club message (relance, notification) into each account's mailbox. */
export async function deposer(db: SupabaseClient, emails: Iterable<string>, m: { type: TypeMessage; titre: string; texte?: string | null; lien?: string | null; de_email?: string | null; de_nom?: string | null }) {
  const lignes = [...new Set([...emails].map((e) => e.toLowerCase()))].map((a) => ({
    type: m.type,
    titre: m.titre.slice(0, 140),
    texte: m.texte ? m.texte.slice(0, 4000) : null,
    lien: m.lien || null,
    a_email: a,
    de_email: m.de_email || null,
    de_nom: m.de_nom || "SC Lions d'Eugies",
  }));
  if (!lignes.length) return 0;
  const { error } = await db.from("messages").insert(lignes);
  return error ? 0 : lignes.length;
}
