import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ecrireJournalCagnotte, majCagnotteNotion } from "./club";
import { solde, type Bareme, type EvenementLie, type Mouvement } from "./cagnotte";

type J = { notion_id: string; cagnotte_groupe: string | null; cagnotte: number | null };

/** The members sharing a kitty with each given member (himself when he has his own kitty). */
export async function unites(db: SupabaseClient, ids: string[]) {
  const { data } = await db.from("joueurs").select("notion_id,cagnotte_groupe,cagnotte");
  const tous = (data || []) as J[];
  const vus = new Set<string>();
  const out: string[][] = [];
  for (const id of ids) {
    const moi = tous.find((x) => x.notion_id === id);
    if (!moi) continue;
    const membres = moi.cagnotte_groupe ? tous.filter((x) => x.cagnotte_groupe === moi.cagnotte_groupe).map((x) => x.notion_id) : [id];
    const cle = membres.slice().sort().join("|");
    if (vus.has(cle)) continue;
    vus.add(cle);
    out.push(membres);
  }
  return { out, tous };
}

/** Balance of a member's kitty (his own, or the shared one). */
export async function soldeDe(db: SupabaseClient, id: string) {
  const { out } = await unites(db, [id]);
  const membres = out[0] || [id];
  const { data } = await db.from("cag_mouvements").select("sens,montant,statut").in("joueur_id", membres);
  return solde((data || []) as Mouvement[]);
}

/**
 * Recomputes the balances of these members' kitties from their movements and writes them
 * in the app and in Notion (« Cagnotte »), only where the amount changed.
 */
export async function recalculer(db: SupabaseClient, ids: string[]) {
  const { out, tous } = await unites(db, ids);
  for (const membres of out) {
    const { data } = await db.from("cag_mouvements").select("sens,montant,statut").in("joueur_id", membres);
    const s = solde((data || []) as Mouvement[]);
    for (const id of membres) {
      const avant = tous.find((x) => x.notion_id === id)?.cagnotte;
      if (avant != null && Number(avant) === s) continue;
      await db.from("joueurs").update({ cagnotte: s }).eq("notion_id", id);
      try { await majCagnotteNotion(id, s); } catch { /* Notion will catch up at the next change */ }
    }
  }
}

/** Copy of a movement in the Notion « Journal des cagnottes » (best effort: never blocks the app). */
export async function journaliser(db: SupabaseClient, m: Mouvement, groupe: string | null, notionPage: string | null = null) {
  try {
    const page = await ecrireJournalCagnotte({ evenement: m.evenement || null, id: m.id, libelle: m.libelle, date: m.date, joueurId: m.joueur_id, sens: m.sens, categorie: m.categorie, quantite: m.quantite, unite: m.unite, taux: m.taux, montant: Number(m.montant), statut: m.statut, groupe, validePar: m.valide_par }, notionPage);
    if (page && page !== notionPage) await db.from("cag_mouvements").update({ notion_id: page }).eq("id", m.id);
  } catch { /* the journal in Notion is a copy */ }
}

/**
 * Histories for the player's card: for each fiche, the movements of its kitty (its own, or every member
 * of the shared kitty), the scale (icons) and the members' names. null movements = not installed yet.
 */
export async function lireHistoriques(fiches: { id: string; groupe: string | null }[], repli: SupabaseClient) {
  const { clientAdmin } = await import("./supabase/admin");
  const db = clientAdmin() || repli;
  const { data: b } = await db.from("cag_bareme").select("*").order("ordre");
  const bareme = (b || []) as Bareme[];
  const out: { mouvements: Mouvement[] | null; bareme: Bareme[]; noms: Record<string, string> }[] = [];
  for (const f of fiches) {
    let membres: { notion_id: string; prenom: string | null; nom: string }[] = [{ notion_id: f.id, prenom: null, nom: "" }];
    if (f.groupe) {
      const { data } = await db.from("joueurs").select("notion_id,prenom,nom").eq("cagnotte_groupe", f.groupe);
      if (data?.length) membres = data as typeof membres;
    }
    const { data, error } = await db.from("cag_mouvements").select("*").in("joueur_id", membres.map((m) => m.notion_id)).order("date", { ascending: false }).limit(500);
    out.push({ mouvements: error ? null : ((data || []) as Mouvement[]), bareme, noms: Object.fromEntries(membres.map((m) => [m.notion_id, [m.prenom, m.nom].filter(Boolean).join(" ")])) });
  }
  return out;
}

/**
 * Events a gain or an expense can be linked to: the club calendar (one year back, six months ahead)
 * and the club's internal competitions. Best effort: an empty list never blocks anything.
 */
export async function lireEvenementsLies(db: SupabaseClient): Promise<EvenementLie[]> {
  const out: EvenementLie[] = [];
  const auj = new Date();
  const debut = new Date(auj.getTime() - 365 * 864e5).toISOString().slice(0, 10);
  const fin = new Date(auj.getTime() + 183 * 864e5).toISOString().slice(0, 10);
  try {
    const { lireCalendrier } = await import("./club");
    for (const e of await lireCalendrier()) if (e.date && e.date >= debut && e.date <= fin) out.push({ id: e.id, nom: e.nom, date: e.date });
  } catch { /* calendar unavailable */ }
  try {
    const { data } = await db.from("ci_competitions").select("id,nom,statut,cree_le").neq("statut", "preparation").order("cree_le", { ascending: false }).limit(10);
    for (const c of (data || []) as { id: string; nom: string; cree_le: string }[]) out.push({ id: `ci:${c.id}`, nom: `🏆 ${c.nom}`, date: null });
  } catch { /* competitions not installed */ }
  return out.sort((a, b) => (b.date || "9999").localeCompare(a.date || "9999"));
}
