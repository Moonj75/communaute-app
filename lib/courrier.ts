import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContenuMail } from "./mail-modele";

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
  /** A club e-mail (Joyeuses fêtes…): shown with the same layout as the e-mail. */
  carte?: ContenuMail | null;
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

/** This account's mail: received, written, and (staff) the messages sent to the staff. Newest first. */
export async function lireCourrier(db: SupabaseClient, email = "", admin = false) {
  const e = email.toLowerCase();
  const lire = (cols: string) => {
    let q = db.from("messages").select(cols).order("cree_le", { ascending: false }).limit(200);
    if (e) q = q.or(`a_email.eq.${e},de_email.eq.${e}${admin ? ",pour_staff.eq.true" : ""}`);
    return q;
  };
  // With the layout of club e-mails (column « carte », step 22); without it if the column does not exist yet.
  let { data, error } = await lire(COLS + ",carte");
  if (error && /carte/.test(error.message)) ({ data, error } = await lire(COLS));
  return { messages: (data || []) as unknown as Message[], erreur: error ? error.message : null };
}

/** Drops one copy of a club message (relance, notification) into each account's mailbox. */
export async function deposer(db: SupabaseClient, emails: Iterable<string>, m: { type: TypeMessage; titre: string; texte?: string | null; lien?: string | null; de_email?: string | null; de_nom?: string | null; carte?: ContenuMail | null }) {
  const lignes = [...new Set([...emails].map((e) => e.toLowerCase()))].map((a) => ({
    type: m.type,
    titre: m.titre.slice(0, 140),
    texte: m.texte ? m.texte.slice(0, 4000) : null,
    lien: m.lien || null,
    a_email: a,
    de_email: m.de_email || null,
    de_nom: m.de_nom || "SC Lions d'Eugies",
    ...(m.carte ? { carte: m.carte } : {}),
  }));
  if (!lignes.length) return 0;
  let { error } = await db.from("messages").insert(lignes);
  // Column « carte » not created yet (step 22): the plain text still arrives.
  if (error && m.carte && /carte/.test(error.message)) ({ error } = await db.from("messages").insert(lignes.map(({ carte: _c, ...l }: Record<string, unknown>) => l)));
  return error ? 0 : lignes.length;
}

/** One sending in the staff's journal: the same message dropped into several mailboxes. */
export type Envoi = { cle: string; ids: string[]; cree_le: string; type: TypeMessage; titre: string; texte: string | null; lien: string | null; de_nom: string | null; pour_staff: boolean; destinataires: { email: string; lu: boolean }[] };

/** Staff journal: every message and notification of the club, grouped by sending (same title, same minute). */
export async function lireJournal(db: SupabaseClient) {
  const { data, error } = await db.from("messages").select(COLS).order("cree_le", { ascending: false }).limit(2000);
  if (error) return { envois: [] as Envoi[], erreur: error.message };
  const groupes = new Map<string, Envoi>();
  for (const m of (data || []) as Message[]) {
    const cle = `${m.type}|${m.titre}|${m.de_email || ""}|${m.pour_staff}|${m.cree_le.slice(0, 16)}`;
    const g = groupes.get(cle) || { cle, ids: [], cree_le: m.cree_le, type: m.type, titre: m.titre, texte: m.texte, lien: m.lien, de_nom: m.de_nom, pour_staff: m.pour_staff, destinataires: [] };
    g.ids.push(m.id);
    g.destinataires.push({ email: m.pour_staff ? "staff" : m.a_email || "?", lu: m.lu });
    groupes.set(cle, g);
  }
  return { envois: [...groupes.values()], erreur: null };
}
