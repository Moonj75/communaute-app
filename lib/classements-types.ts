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
  { id: "WR-Open", source: "fistf", titre: "Classement mondial FISTF · Open", court: "Mondial Open", ic: "🌍", type: "joueurs" },
  { id: "WR-Veterans", source: "fistf", titre: "Classement mondial FISTF · Vétérans", court: "Vétérans", ic: "🌍", type: "joueurs" },
  { id: "WR-Women", source: "fistf", titre: "Classement mondial FISTF · Femmes", court: "Femmes", ic: "🌍", type: "joueurs" },
  { id: "WR-U20", source: "fistf", titre: "Classement mondial FISTF · U20", court: "U20", ic: "🌍", type: "joueurs" },
  { id: "WR-U16", source: "fistf", titre: "Classement mondial FISTF · U16", court: "U16", ic: "🌍", type: "joueurs" },
  { id: "WR-U12", source: "fistf", titre: "Classement mondial FISTF · U12", court: "U12", ic: "🌍", type: "joueurs" },
  { id: "WR-Teams", source: "fistf", titre: "Classement mondial FISTF · Équipes de club", court: "Équipes", ic: "🌍", type: "equipes" },
];

export const SOURCES = {
  fbfts: { nom: "FBFTS (Belgique)", page: "https://www.fbftsbstvb.com/nationalrankings.html" },
  fistf: { nom: "FISTF (mondial)", page: "https://fistf.com/data-centre/rankings/" },
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
