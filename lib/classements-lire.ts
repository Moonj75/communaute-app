import type { SupabaseClient } from "@supabase/supabase-js";
import { LISTES, type LigneClassement } from "./classements-types";

/* Readers of the rankings stored in Supabase. They return empty lists when the table does not exist yet. */

const COLS = "liste,mois,rang,nom,prenom,club,pays,categorie,categorie_suivante,points,evolution,a_defendre,eugies,joueur_id";
const ordre = (a: LigneClassement, b: LigneClassement) => a.rang - b.rang || a.nom.localeCompare(b.nom);

/** Every club line (players, club, teams) of every ranking. */
export async function lireEugies(sb: SupabaseClient): Promise<LigneClassement[]> {
  const { data, error } = await sb.from("classements").select(COLS).eq("eugies", true).order("rang").limit(1000);
  return error ? [] : ((data || []) as LigneClassement[]);
}

/** One full ranking. filtre: « club » (our lines only) or « bel » (Belgians only, world lists). */
export async function lireListe(sb: SupabaseClient, liste: string, filtre?: string): Promise<LigneClassement[]> {
  let q = sb.from("classements").select(COLS).eq("liste", liste);
  if (filtre === "club") q = q.eq("eugies", true);
  if (filtre === "bel") q = q.eq("pays", "BEL");
  const out: LigneClassement[] = [];
  for (let from = 0; from < 5000; from += 1000) {
    const { data, error } = await q.order("rang").range(from, from + 999);
    if (error || !data?.length) break;
    out.push(...(data as LigneClassement[]));
    if (data.length < 1000) break;
  }
  return out.sort(ordre);
}

/** Number of lines per list (for the tabs). */
export async function compterListes(sb: SupabaseClient) {
  const r = await Promise.all(LISTES.map((l) => sb.from("classements").select("rang", { count: "exact", head: true }).eq("liste", l.id)));
  return new Map(LISTES.map((l, i) => [l.id, r[i].count || 0]));
}

/** For one player: each ranking he is in, with two neighbours above and below. */
export async function lireExtraits(sb: SupabaseClient, joueurId: string, autour = 2) {
  const { data, error } = await sb.from("classements").select(COLS).eq("joueur_id", joueurId);
  if (error || !data?.length) return [];
  const siennes = (data as LigneClassement[]).sort((a, b) => LISTES.findIndex((l) => l.id === a.liste) - LISTES.findIndex((l) => l.id === b.liste));
  return Promise.all(
    siennes.map(async (m) => {
      const { data: v } = await sb
        .from("classements")
        .select(COLS)
        .eq("liste", m.liste)
        .gte("rang", Math.max(1, m.rang - autour))
        .lte("rang", m.rang + autour)
        .order("rang")
        .limit(12);
      return { liste: m.liste, lignes: ((v || []) as LigneClassement[]).sort(ordre) };
    }),
  );
}

export async function lireImports(sb: SupabaseClient) {
  const { data, error } = await sb.from("classements_imports").select("source,mois,libelle,importe_le");
  return error ? [] : ((data || []) as { source: string; mois: string; libelle: string; importe_le: string }[]);
}

/** Club rankings to situate the club: the whole Belgian clubs list, and the world team list
 *  (top 10 + three places around each of our teams). */
export async function lireClubs(sb: SupabaseClient): Promise<{ nat: LigneClassement[]; equipes: LigneClassement[] }> {
  const [n, t] = await Promise.all([
    sb.from("classements").select(COLS).eq("liste", "FBFTS-Clubs").order("rang").limit(60),
    sb.from("classements").select(COLS).eq("liste", "WR-Teams").order("rang").limit(400),
  ]);
  if (n.error || t.error) return { nat: [], equipes: [] };
  const toutes = (t.data || []) as LigneClassement[];
  const nous = toutes.filter((e) => e.eugies).map((e) => e.rang);
  const equipes = toutes.filter((e) => e.rang <= 10 || nous.some((r) => Math.abs(e.rang - r) <= 3));
  return { nat: (n.data || []) as LigneClassement[], equipes };
}
