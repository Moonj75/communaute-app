/* Rankings: shared types and helpers (server and client). */

export type LigneClassement = {
  liste: string;
  mois: string;
  rang: number;
  nom: string;
  prenom: string | null;
  club: string | null;
  pays: string | null;
  categorie: string | null;
  categorie_suivante: string | null;
  points: number | null;
  evolution: string | null;
  a_defendre: number | null;
  eugies: boolean;
  joueur_id: string | null;
};

export type ListeDef = {
  id: string;
  source: "fbfts" | "fistf";
  titre: string;
  court: string;
  ic: string;
  type: "joueurs" | "clubs" | "equipes";
};

export const LISTES: ListeDef[] = [
  { id: "FBFTS", source: "fbfts", titre: "Classement national FBFTS", court: "National", ic: "🇧🇪", type: "joueurs" },
  { id: "FBFTS-Clubs", source: "fbfts", titre: "Classement national des clubs", court: "Clubs belges", ic: "🇧🇪", type: "clubs" },
  { id: "WR-Open", source: "fistf", titre: "Classement international FISTF · Open", court: "International Open", ic: "🌍", type: "joueurs" },
  { id: "WR-Veterans", source: "fistf", titre: "Classement international FISTF · Vétérans", court: "Vétérans", ic: "🌍", type: "joueurs" },
  { id: "WR-Women", source: "fistf", titre: "Classement international FISTF · Femmes", court: "Femmes", ic: "🌍", type: "joueurs" },
  { id: "WR-U20", source: "fistf", titre: "Classement international FISTF · U20", court: "U20", ic: "🌍", type: "joueurs" },
  { id: "WR-U16", source: "fistf", titre: "Classement international FISTF · U16", court: "U16", ic: "🌍", type: "joueurs" },
  { id: "WR-U12", source: "fistf", titre: "Classement international FISTF · U12", court: "U12", ic: "🌍", type: "joueurs" },
  { id: "WR-Teams", source: "fistf", titre: "Classement international FISTF · Équipes de club", court: "Équipes", ic: "🌍", type: "equipes" },
];

export const SOURCES = {
  fbfts: { nom: "FBFTS (Belgique)", page: "https://www.fbftsbstvb.com/nationalrankings.html" },
  fistf: { nom: "FISTF (international)", page: "https://fistf.com/data-centre/rankings/" },
};

export const listeDef = (id: string) => LISTES.find((l) => l.id === id) || LISTES[0];

/** Accents and punctuation removed, lower case, single spaces. */
export function simplifier(s: string | null | undefined) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(\d+\)/g, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}
const colle = (s: string) => simplifier(s).replace(/ /g, "");

/** Our club in each file: « eug » (FBFTS code) or « SC Lion's Eugies » (FISTF). */
export function estEugies(club: string | null | undefined) {
  const c = simplifier(club);
  return c === "eug" || c.includes("eugies");
}

function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

export type PersonneClub = { notion_id: string; nom: string; prenom: string | null };

/**
 * Finds the club member behind a ranking line: same family name (spaces and accents ignored,
 * « Derieck » = « De Rieck ») and a first name that is equal or nearly equal (« Konstandinos » ≈ « Kostandinos »).
 */
export function reconnaitre(l: { nom: string; prenom: string | null }, gens: PersonneClub[]): string | null {
  const nom = colle(l.nom);
  const pre = colle(l.prenom || "");
  const memeNom = gens.filter((g) => {
    const n = colle(g.nom);
    return n === nom || colle(`${g.prenom || ""}${g.nom}`) === colle(`${l.prenom || ""}${l.nom}`);
  });
  const exact = memeNom.find((g) => colle(g.prenom || "") === pre);
  if (exact) return exact.notion_id;
  const proche = memeNom.filter((g) => pre && distance(colle(g.prenom || ""), pre) <= 2);
  return proche.length === 1 ? proche[0].notion_id : null;
}

const nf = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 2 });
export const pts = (n: number | null) => (n === null || n === undefined ? "—" : nf.format(Number(n)));

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOIS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export function libelleMois(m: string | null | undefined, long = false) {
  if (!m || !/^\d{4}-\d{2}$/.test(m)) return m || "";
  const [y, mm] = m.split("-").map(Number);
  return `${(long ? MOIS_LONG : MOIS)[mm - 1]} ${y}`;
}

/** « ▲ +3 » (places gagnées, vert), « ▼ −2 » (places perdues, rouge), « = », « Nouveau ». */
export function tendance(e: string | null): { cls: string; txt: string } | null {
  if (e === null || e === undefined || e === "") return null;
  const s = String(e).trim();
  if (s === "=" || s === "0") return { cls: "eq", txt: "=" };
  if (/^new/i.test(s)) return { cls: "new", txt: "Nouveau" };
  const n = Number(s.replace("+", ""));
  if (!Number.isFinite(n)) return null;
  return n > 0 ? { cls: "up", txt: `▲ +${n}` } : { cls: "down", txt: `▼ −${-n}` };
}

export const nomComplet = (l: { nom: string; prenom: string | null }) => [l.prenom, l.nom].filter(Boolean).join(" ");

/**
 * Keeps only the useful part of a ranking: the first places, then the zone around our lines,
 * never more than `max` lines in all. `nous` tells which lines are ours (club, player…).
 */
export function resserrer<T extends { rang: number }>(lignes: T[], nous: (l: T) => boolean, max = 12, tete = 3): T[] {
  const tri = [...lignes].sort((a, b) => a.rang - b.rang);
  if (tri.length <= max) return tri;
  const cibles = tri.map((l, i) => (nous(l) ? i : -1)).filter((i) => i >= 0);
  if (!cibles.length) return tri.slice(0, max);
  const garde = new Set<number>();
  for (let i = 0; i < Math.min(tete, tri.length); i++) garde.add(i);
  // Room left, shared between our lines; each one gets a window centred on it.
  const reste = max - garde.size;
  const parCible = Math.max(1, Math.floor(reste / cibles.length));
  for (const c of cibles) {
    let a = c - Math.floor((parCible - 1) / 2);
    let b = a + parCible - 1;
    if (b >= tri.length) { a -= b - tri.length + 1; b = tri.length - 1; }
    if (a < 0) { b -= a; a = 0; }
    for (let i = a; i <= b && i < tri.length; i++) garde.add(i);
  }
  // Fill up to `max` with the neighbours of our lines if windows overlapped.
  let pas = 1;
  while (garde.size < max && pas < tri.length) {
    for (const c of cibles) {
      if (garde.size >= max) break;
      if (c + pas < tri.length) garde.add(c + pas);
      if (garde.size >= max) break;
      if (c - pas >= 0) garde.add(c - pas);
    }
    pas++;
  }
  const idx = [...garde].sort((x, y) => x - y);
  // Too many (several teams): drop the lines farthest from our lines, never ours nor the top.
  const loin = (i: number) => Math.min(...cibles.map((c) => Math.abs(c - i)));
  while (idx.length > max) {
    let k = -1;
    idx.forEach((i, n) => { if (i >= tete && !cibles.includes(i) && (k < 0 || loin(i) > loin(idx[k]))) k = n; });
    if (k < 0) break;
    idx.splice(k, 1);
  }
  return idx.map((i) => tri[i]);
}
