import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { LISTES, resserrer, type LigneClassement } from "./classements-types";
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase/env";
import { clientAdmin } from "./supabase/admin";

/* Readers of the rankings stored in Supabase. They return empty lists when the table does not exist yet.
 *
 * The rankings only change once a month (automatic import on the 1st, or a manual import by the staff).
 * So they are kept in the server's memory (cache « classements ») and read from Supabase again only
 * when an import empties that cache (see enregistrerLot) — or after 7 days at most, for safety.
 * Rankings are public: they are read with the public key, without the visitor's session. */
export const TAG_CLASSEMENTS = "classements";
const GARDE = 60 * 60 * 24 * 7;
let publicDb: SupabaseClient | null = null;
const pub = () => (publicDb ||= createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }));
const enCache = <A extends unknown[], R>(nom: string, f: (...a: A) => Promise<R>) =>
  unstable_cache(f, ["classements", nom], { tags: [TAG_CLASSEMENTS], revalidate: GARDE });

const COLS = "liste,mois,rang,nom,prenom,club,pays,categorie,categorie_suivante,points,evolution,a_defendre,eugies,joueur_id";
const ordre = (a: LigneClassement, b: LigneClassement) => a.rang - b.rang || a.nom.localeCompare(b.nom);

/** Every club line (players, club, teams) of every ranking. */
async function _lireEugies(): Promise<LigneClassement[]> {
  const { data, error } = await pub().from("classements").select(COLS).eq("eugies", true).order("rang").limit(1000);
  if (error) throw error; // a failure is never kept in the cache
  return (data || []) as LigneClassement[];
}

/** One full ranking. filtre: « club » (our lines only) or « bel » (Belgians only, world lists). */
async function _lireListe(liste: string, filtre?: string): Promise<LigneClassement[]> {
  let q = pub().from("classements").select(COLS).eq("liste", liste);
  if (filtre === "club") q = q.eq("eugies", true);
  if (filtre === "bel") q = q.eq("pays", "BEL");
  const out: LigneClassement[] = [];
  for (let from = 0; from < 5000; from += 1000) {
    const { data, error } = await q.order("rang").range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...(data as LigneClassement[]));
    if (data.length < 1000) break;
  }
  return out.sort(ordre);
}

/** Number of lines per list (for the tabs). */
async function _compterListes() {
  const r = await Promise.all(LISTES.map((l) => pub().from("classements").select("rang", { count: "exact", head: true }).eq("liste", l.id)));
  // Plain pairs: the cache keeps JSON, not Map objects.
  return LISTES.map((l, i) => [l.id, r[i].count || 0] as [string, number]);
}

/** For one player: each ranking he is in, with two neighbours above and below. */
async function _lireExtraits(joueurId: string, autour = 2) {
  const { data, error } = await pub().from("classements").select(COLS).eq("joueur_id", joueurId);
  if (error) throw error;
  if (!data?.length) return [];
  const siennes = (data as LigneClassement[]).sort((a, b) => LISTES.findIndex((l) => l.id === a.liste) - LISTES.findIndex((l) => l.id === b.liste));
  return Promise.all(
    siennes.map(async (m) => {
      const [{ data: v }, { data: haut }] = await Promise.all([
        pub().from("classements").select(COLS).eq("liste", m.liste).gte("rang", Math.max(1, m.rang - Math.max(autour, 5))).lte("rang", m.rang + Math.max(autour, 5)).order("rang").limit(20),
        pub().from("classements").select(COLS).eq("liste", m.liste).lte("rang", 3).order("rang").limit(6),
      ]);
      const vues = new Map<string, LigneClassement>();
      for (const l of [...((haut || []) as LigneClassement[]), ...((v || []) as LigneClassement[])]) vues.set(`${l.rang}|${l.nom}|${l.prenom}`, l);
      const lignes = resserrer([...vues.values()].sort(ordre), (l) => l.joueur_id === joueurId);
      return { liste: m.liste, lignes };
    }),
  );
}

async function _lireImports() {
  const { data, error } = await pub().from("classements_imports").select("source,mois,libelle,importe_le");
  if (error) throw error;
  return (data || []) as { source: string; mois: string; libelle: string; importe_le: string }[];
}

/** Club rankings to situate the club: the whole Belgian clubs list, and the world team list
 *  (summaries are cut down on display, see resserrer). */
async function _lireClubs(): Promise<{ nat: LigneClassement[]; equipes: LigneClassement[] }> {
  const [n, t] = await Promise.all([
    pub().from("classements").select(COLS).eq("liste", "FBFTS-Clubs").order("rang").limit(60),
    pub().from("classements").select(COLS).eq("liste", "WR-Teams").order("rang").limit(400),
  ]);
  if (n.error || t.error) throw n.error || t.error;
  const toutes = (t.data || []) as LigneClassement[];
  return { nat: (n.data || []) as LigneClassement[], equipes: toutes };
}

/* Archived members (former players): their lines stay in the rankings, but no longer as « ours ». */
export const TAG_ARCHIVES = "archives";
const _archives = unstable_cache(async () => {
  const db = clientAdmin();
  if (!db) return [] as string[];
  const { data, error } = await db.from("joueurs").select("notion_id").eq("archive", true);
  if (error) return [] as string[];
  return ((data || []) as { notion_id: string }[]).map((j) => j.notion_id);
}, ["archives-joueurs"], { tags: [TAG_ARCHIVES], revalidate: 3600 });
async function sansArchives(lignes: LigneClassement[], garderAutres = true) {
  const a = new Set(await _archives().catch(() => [] as string[]));
  if (!a.size) return lignes;
  const out = lignes.map((l) => (l.joueur_id && a.has(l.joueur_id) ? { ...l, eugies: false, joueur_id: null } : l));
  return garderAutres ? out : out.filter((l) => l.eugies);
}

export const lireEugiesCache = enCache("lireEugies", _lireEugies);
export function lireEugies(_sb: SupabaseClient) {
  return lireEugiesCache().then((l) => sansArchives(l, false)).catch(() => [] as LigneClassement[]);
}

export const lireListeCache = enCache("lireListe", _lireListe);
export function lireListe(_sb: SupabaseClient, liste: string, filtre?: string) {
  // « club » filter: our lines only, so an archived member's line leaves the list.
  return lireListeCache(liste, filtre).then((l) => sansArchives(l, filtre !== "club")).catch(() => [] as LigneClassement[]);
}

export const compterListesCache = enCache("compterListes", _compterListes);
export async function compterListes(_sb: SupabaseClient) {
  return new Map(await compterListesCache().catch(() => [] as [string, number][]));
}

export const lireExtraitsCache = enCache("lireExtraits", _lireExtraits);
export function lireExtraits(_sb: SupabaseClient, joueurId: string, autour = 2) {
  return lireExtraitsCache(joueurId, autour).catch(() => [] as Awaited<ReturnType<typeof _lireExtraits>>);
}

export const lireImportsCache = enCache("lireImports", _lireImports);
export function lireImports(_sb: SupabaseClient) {
  return lireImportsCache().catch(() => [] as Awaited<ReturnType<typeof _lireImports>>);
}

export const lireClubsCache = enCache("lireClubs", _lireClubs);
export function lireClubs(_sb: SupabaseClient) {
  return lireClubsCache().catch(() => ({ nat: [] as LigneClassement[], equipes: [] as LigneClassement[] }));
}
