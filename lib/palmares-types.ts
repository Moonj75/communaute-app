/* Palmarès du club: types and pure helpers (server and browser). One row = one result of a player or a club team. */

/** Notion role of the person who keeps the palmarès (validates the results proposed by the players). */
export const ROLE_PALMARES = "🏅 Responsable palmarès";

export type Rang = "Vainqueur" | "Finaliste" | "Demi-finaliste" | "Quart de finaliste" | "Huitième de finaliste" | "Seizième de finaliste" | "Participation" | "Autre place";
export type TypeCompet = "Belgique" | "International" | "Interne";

export type ResultatP = {
  id: string;
  titre: string;
  /** Player fiches (Notion ids, without dashes). */
  joueurs: string[];
  equipe: string | null;
  rang: Rang;
  place: number | null;
  competition: string;
  categorie: string | null;
  saison: string | null;
  date: string | null;
  type: TypeCompet;
  parEquipe: boolean;
  statut: "Validé" | "À valider";
  proposePar: string | null;
  lien: string | null;
  origine: string | null;
  /** Final (winner / finalist): score of the final, seen from the club (« 3-1 »), and the opponent. */
  scoreFinale?: string | null;
  adversaire?: string | null;
  /** Where it took place (city / country): gives the flag. */
  lieu?: string | null;
  cree: string;
};

export const RANGS: { id: Rang; court: string; ic: string; place: number | null }[] = [
  { id: "Vainqueur", court: "Vainqueur", ic: "🥇", place: 1 },
  { id: "Finaliste", court: "Finaliste", ic: "🥈", place: 2 },
  { id: "Demi-finaliste", court: "½ finale", ic: "🥉", place: 3 },
  { id: "Quart de finaliste", court: "¼ finale", ic: "🎖️", place: 5 },
  { id: "Huitième de finaliste", court: "1/8 finale", ic: "🎖️", place: 9 },
  { id: "Seizième de finaliste", court: "1/16 finale", ic: "🎖️", place: 17 },
  { id: "Participation", court: "Participation", ic: "🎖️", place: null },
  { id: "Autre place", court: "Autre place", ic: "🎖️", place: null },
];
export const icRang = (r: Rang) => RANGS.find((x) => x.id === r)?.ic || "🎖️";
/** « 9e place » for « Autre place », the rank name otherwise. */
export const libelleRang = (r: ResultatP) => (r.rang === "Autre place" && r.place ? `${r.place}e place` : r.rang);

export const CATEGORIES_P = ["Open", "U12", "U16", "U20", "Féminine", "Vétéran", "Super-vétéran", "A", "B", "C", "D1", "D2", "D3", "D4", "U10", "U15", "U19"];
export const JEUNES = /^U\d+$/;

/** International competitions (FISTF abroad, World / European cups…); the rest is Belgian, « du club » is internal. */
const INTER = /monde|europe|europa|champions league|grand prix de france|gp de france|gillingham|caen|paris|ath[eè]nes|majorque|ludwi|tch[eè]que|ilioupoli|puylaurens|madrid|manchester|dewsb|lisbonne|malte|barcelone|vienne|haverhill|gibraltar|lorraine|issy|wattrelos|rome|elancourt|angleterre|portugal|espagne|allemagne|autriche|gr[eè]ce/i;
export function typeDe(competition: string): TypeCompet {
  if (/\bdu club\b/i.test(competition)) return "Interne";
  return INTER.test(competition) ? "International" : "Belgique";
}

/** Season of a date: from September to August (« 2026/2027 »). */
export function saisonDe(d: string) {
  const a = Number(d.slice(0, 4));
  const m = Number(d.slice(5, 7));
  return m >= 9 ? `${a}/${a + 1}` : `${a - 1}/${a}`;
}
/** Sort key of a season (« 2021/2022 » < « 2022 » < « 2022/2023 »). */
export function cleSaison(s: string | null) {
  if (!s) return 0;
  const m = s.match(/(\d{4})(?:\s*\/\s*(\d{2,4}))?/);
  if (!m) return 0;
  return Number(m[1]) + (m[2] ? 0.5 : 0);
}

export type Medailles = { or: number; argent: number; bronze: number; total: number };
export function compter(liste: ResultatP[]): Medailles {
  const m = { or: 0, argent: 0, bronze: 0, total: liste.length };
  for (const r of liste) {
    if (r.rang === "Vainqueur") m.or++;
    else if (r.rang === "Finaliste") m.argent++;
    else if (r.rang === "Demi-finaliste") m.bronze++;
  }
  return m;
}
/** Best first: gold, then silver, then bronze (Olympic order). */
export const triMedailles = (a: Medailles, b: Medailles) => b.or - a.or || b.argent - a.argent || b.bronze - a.bronze || b.total - a.total;
/** Newest season first, then best rank. */
export function triResultats(a: ResultatP, b: ResultatP) {
  return cleSaison(b.saison) - cleSaison(a.saison) || (b.date || "").localeCompare(a.date || "") || (a.place ?? 99) - (b.place ?? 99);
}
export const sansTirets = (id: string) => id.replace(/-/g, "");

/** Title written in Notion: « 🥇 Vainqueur · Open de Frameries (U16) ». */
export function titreDe(r: { rang: Rang; place: number | null; competition: string; categorie: string | null }) {
  const lib = r.rang === "Autre place" && r.place ? `${r.place}e place` : r.rang;
  return `${icRang(r.rang)} ${lib} · ${r.competition}${r.categorie ? ` (${r.categorie})` : ""}`;
}

/** Rank words: « Victoire » and « Finale » big and shining, the others smaller. */
export const motRang = (place: number | null, court = false) =>
  place === 1 ? "Victoire" : place === 2 ? "Finale" : place === 3 ? (court ? "½ finale" : "Demi-finale") : place === 5 ? (court ? "¼ finale" : "Quart de finale") : place === 9 ? (court ? "8e finale" : "8e de finale") : place === 17 ? "16e de finale" : place ? `${place}e place` : "Participation";
export const classeRang = (place: number | null) => (place === 1 ? "r1" : place === 2 ? "r2" : place === 3 ? "r3" : "rx");
/** Place used for the picture (rank without number → its usual place). */
export const placeDe = (r: Pick<ResultatP, "rang" | "place">) => r.place ?? RANGS.find((x) => x.id === r.rang)?.place ?? null;

/** Highlight order: victories first (newest first), then finals, then semi-finals, then the rest. */
export function triVitrine(a: ResultatP, b: ResultatP) {
  const n = (r: ResultatP) => { const p = placeDe(r); return p === 1 ? 0 : p === 2 ? 1 : p === 3 ? 2 : 3; };
  return n(a) - n(b) || cleSaison(b.saison) - cleSaison(a.saison) || (b.date || "").localeCompare(a.date || "") || b.cree.localeCompare(a.cree);
}
/** One highlight of the showcase / of the card band. */
export type Exploit = { id: string; place: number | null; equipe: boolean; competition: string; categorie: string | null; saison: string | null; date?: string | null; scoreFinale?: string | null; adversaire?: string | null; pays?: string | null; embleme?: string | null; qui: string };

const simple = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\b(19|20)\d{2}\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
/**
 * Results without a day (history, or typed without date): the date of the same competition in the club calendar,
 * in the same season, when it can be found (« Open de Frameries » 2026/2027 → the calendar event of that season).
 */
export function avecDates<T extends Pick<ResultatP, "competition" | "saison" | "date"> & { lieu?: string | null }>(liste: T[], evs: { nom: string; date: string | null; lieu?: string | null }[]): T[] {
  const cal = evs.filter((e) => e.date).map((e) => ({ n: simple(e.nom), d: e.date!.slice(0, 10), s: saisonDe(e.date!.slice(0, 10)), lieu: e.lieu || null }));
  if (!cal.length) return liste;
  return liste.map((r) => {
    if (r.date && r.lieu) return r;
    const c = simple(r.competition);
    if (c.length < 4) return r;
    const meme = (e: (typeof cal)[number]) => e.n === c || e.n.includes(c) || c.includes(e.n);
    // The same competition in the calendar: same season, or — history written with the year only (« 2026 ») — that year.
    const saison = r.date ? saisonDe(r.date.slice(0, 10)) : r.saison;
    const annee = saison && /^\d{4}$/.test(saison) ? saison : null;
    const ev = cal.find((e) => meme(e) && (r.date ? e.d === r.date.slice(0, 10) || e.s === saison : annee ? e.d.startsWith(annee) : e.s === saison));
    if (!ev) return r;
    // Its date, its place (for the flag) and, for a year-only result, the right season (1 September → 31 August).
    return { ...r, date: r.date || ev.d, lieu: r.lieu || ev.lieu, saison: annee ? ev.s : r.saison };
  });
}

/**
 * Archived players stay in Notion but no longer show in the app: their names are taken off the results,
 * and a result with nobody left (no other player, no club team) is not shown.
 */
export function sansArchives<T extends Pick<ResultatP, "joueurs" | "equipe">>(liste: T[], archives: Iterable<string>): T[] {
  const a = new Set([...archives].map(sansTirets));
  if (!a.size) return liste;
  return liste
    .map((r) => (r.joueurs.some((j) => a.has(j)) ? { ...r, joueurs: r.joueurs.filter((j) => !a.has(j)) } : r))
    .filter((r) => r.joueurs.length || r.equipe);
}

/** A season written the club's way: « 2026/2027 » → « 2026-2027 » (1 September → 31 August). */
export const libSaison = (s: string | null | undefined) => (s || "").replace(/\s*\/\s*/, "-");
