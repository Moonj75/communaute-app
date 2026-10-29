/* Club competitions (championnat, coupe): types and the engine (standings, matches, next stage).
 * Pure functions: no database here, so they work on the server and in the browser alike. */

export type FormatEtape =
  | "poules"
  | "elimination"
  // Optional stage between two group stages: the first « haut » of each group go up, the last « bas » go down,
  // the ones in between play a play-off match (5th against 6th…): the winner goes up, the loser goes down.
  | "barrage";
/** What happens at the end of a stage. */
export type Passage =
  | "niveaux" // everybody goes on: the best together, the next ones together (strong group / weaker group…)
  | "qualifies" // only the first N of each group go on
  | "fin"; // last stage

export type EtapeConfig = {
  nom: string;
  debut: string | null;
  fin: string | null;
  format: FormatEtape;
  /** Number of groups (poules). Ignored for a knockout stage. */
  groupes: number;
  /** Names of the groups, in order (the first is the strongest when « niveaux »). */
  nomsGroupes: string[];
  passage: Passage;
  /** With « qualifies »: how many of each group go on. */
  qualifies: number;
  /** Leagues: players per mini-group (e.g. 4). The number of groups then follows the number of players. */
  taille?: number | null;
  /** Play-off stage: places per group going straight to the upper / lower division. */
  haut?: number | null;
  bas?: number | null;
};

export type TypeCompet = "championnat" | "coupe";
export type StatutCompet = "preparation" | "en_cours" | "terminee";

export type Competition = {
  id: string;
  type: TypeCompet;
  nom: string;
  saison: string | null;
  pts_v: number;
  pts_n: number;
  pts_d: number;
  statut: StatutCompet;
  /** Index of the current stage (0 = first). */
  etape: number;
  etapes: EtapeConfig[];
  champion: string | null;
  cree_le: string;
  /** Starting groups being prepared (saved as the staff goes along). */
  brouillon?: Brouillon | null;
};

export type Brouillon = { nb: number; noms: string[]; place: Record<string, number>; ordre: string[]; le?: string };

export type JoueurCompet = { id: string; nom: string };

export type Groupe = { id: string; competition_id: string; etape: number; nom: string; ordre: number; joueurs: JoueurCompet[] };

export type Match = {
  id: string;
  competition_id: string;
  etape: number;
  groupe_id: string | null;
  /** Knockout: round (0 = first round) and place in that round. */
  tour: number | null;
  place: number | null;
  a: string | null;
  b: string | null;
  buts_a: number | null;
  buts_b: number | null;
  /** Knockout: who goes on (needed when the score is a draw: extra time / shoot-out). */
  vainqueur: string | null;
  joue: boolean;
  /** Score proposed by player a / player b (in the match's order: a's goals, b's goals). */
  prop_a?: Proposition | null;
  prop_b?: Proposition | null;
  maj_le?: string;
};

/** A score typed by one of the two players. When both typed the same score, the match is validated. */
export type Proposition = { a: number; b: number; v: string | null; le: string };
export const memeScore = (x?: Proposition | null, y?: Proposition | null) => Boolean(x && y && x.a === y.a && x.b === y.b && (x.v || null) === (y.v || null));

/** Where a match stands for the scores typed by the players. */
export function etatSaisie(m: Match): "valide" | "aucun" | "attente_a" | "attente_b" | "desaccord" {
  if (m.joue) return "valide";
  if (m.prop_a && m.prop_b) return memeScore(m.prop_a, m.prop_b) ? "valide" : "desaccord";
  if (m.prop_a) return "attente_b";
  if (m.prop_b) return "attente_a";
  return "aucun";
}

export type Ligne = { id: string; nom: string; rang: number; j: number; g: number; n: number; p: number; bp: number; bc: number; diff: number; pts: number };

export const TYPES: Record<TypeCompet, { nom: string; ic: string }> = {
  championnat: { nom: "Championnat du club", ic: "🏆" },
  coupe: { nom: "Coupe du club", ic: "🥇" },
};

/* ------------------------------------------------------------------ standings */

/** Standings of a group: points, then goal difference, goals for, then the match between the two. */
export function classement(joueurs: JoueurCompet[], matchs: Match[], c: Pick<Competition, "pts_v" | "pts_n" | "pts_d">): Ligne[] {
  const t = new Map<string, Ligne>(joueurs.map((j) => [j.id, { id: j.id, nom: j.nom, rang: 0, j: 0, g: 0, n: 0, p: 0, bp: 0, bc: 0, diff: 0, pts: 0 }]));
  const joues = matchs.filter((m) => m.joue && m.a && m.b && m.buts_a != null && m.buts_b != null);
  for (const m of joues) {
    const A = t.get(m.a!), B = t.get(m.b!);
    if (!A || !B) continue;
    const a = m.buts_a!, b = m.buts_b!;
    A.j++; B.j++;
    A.bp += a; A.bc += b; B.bp += b; B.bc += a;
    if (a > b) { A.g++; B.p++; A.pts += c.pts_v; B.pts += c.pts_d; }
    else if (a < b) { B.g++; A.p++; B.pts += c.pts_v; A.pts += c.pts_d; }
    else { A.n++; B.n++; A.pts += c.pts_n; B.pts += c.pts_n; }
  }
  const lignes = [...t.values()].map((l) => ({ ...l, diff: l.bp - l.bc }));
  const direct = (x: string, y: string) => {
    const m = joues.find((m) => (m.a === x && m.b === y) || (m.a === y && m.b === x));
    if (!m) return 0;
    const bx = m.a === x ? m.buts_a! : m.buts_b!;
    const by = m.a === x ? m.buts_b! : m.buts_a!;
    return by - bx;
  };
  lignes.sort((x, y) => y.pts - x.pts || y.diff - x.diff || y.bp - x.bp || direct(x.id, y.id) || x.nom.localeCompare(y.nom));
  lignes.forEach((l, i) => (l.rang = i + 1));
  return lignes;
}

/**
 * Places gained (+) or lost (−) with the last validated match of the group:
 * standings now compared with the standings just before that match.
 */
export function evolutions(joueurs: JoueurCompet[], matchs: Match[], c: Pick<Competition, "pts_v" | "pts_n" | "pts_d">): Map<string, number> {
  const joues = matchs.filter((m) => m.joue && m.a && m.b).sort((x, y) => (x.maj_le || "").localeCompare(y.maj_le || ""));
  const out = new Map<string, number>();
  if (joues.length < 2) return out;
  const dernier = joues[joues.length - 1];
  const avant = new Map(classement(joueurs, matchs.filter((m) => m.id !== dernier.id), c).map((l) => [l.id, l.rang]));
  for (const l of classement(joueurs, matchs, c)) out.set(l.id, (avant.get(l.id) || l.rang) - l.rang);
  return out;
}

/* ------------------------------------------------------------------ matches */

/** Every pair of a group, once (each one meets each other once during the stage). */
export function paires(joueurs: JoueurCompet[]): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < joueurs.length; i++) for (let j = i + 1; j < joueurs.length; j++) out.push([joueurs[i].id, joueurs[j].id]);
  return out;
}

/** Size of a knockout table (next power of 2). */
export const tailleTableau = (n: number) => Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(2, n))));

/** Seed order of a table of size P: 1 meets P, 2 meets P-1, and the best two can only meet in the final. */
export function ordreTetes(P: number): number[] {
  let o = [1, 2];
  while (o.length < P) {
    const n = o.length * 2 + 1;
    o = o.flatMap((s) => [s, n - s]);
  }
  return o;
}

export function nomTour(tour: number, nbTours: number) {
  const reste = nbTours - tour;
  return reste === 1 ? "Finale" : reste === 2 ? "Demi-finales" : reste === 3 ? "Quarts de finale" : reste === 4 ? "Huitièmes de finale" : `Tour ${tour + 1}`;
}

/** Winner of a played match (knockout: the chosen one when it is a draw). */
export function gagnant(m: Match): string | null {
  if (!m.joue) return null;
  // A bye (nobody in front): marked as played at creation, the one present goes on.
  if (!m.a || !m.b) return m.a || m.b || null;
  if (m.buts_a! > m.buts_b!) return m.a;
  if (m.buts_b! > m.buts_a!) return m.b;
  return m.vainqueur;
}

/** The knockout matches of a stage, empty slots included, from the players in seed order. */
export function tableauInitial(tetes: JoueurCompet[]) {
  const P = tailleTableau(tetes.length);
  const nbTours = Math.log2(P);
  const ordre = ordreTetes(P);
  const lignes: { tour: number; place: number; a: string | null; b: string | null }[] = [];
  for (let p = 0; p < P / 2; p++) {
    const sa = ordre[2 * p], sb = ordre[2 * p + 1];
    lignes.push({ tour: 0, place: p, a: tetes[sa - 1]?.id || null, b: tetes[sb - 1]?.id || null });
  }
  for (let t = 1; t < nbTours; t++) for (let p = 0; p < P / 2 ** (t + 1); p++) lignes.push({ tour: t, place: p, a: null, b: null });
  return { lignes, nbTours };
}

/* ------------------------------------------------------------------ next stage */

/**
 * Everyone of a finished stage, from the best to the last: first the group winners (stronger group first),
 * then the seconds, and so on; between equal places: points, goal difference, goals for.
 * With « niveaux » (strong / weaker groups) the order of the groups matters: a 2nd of the strong group stays above.
 */
export function ordreGeneral(groupes: Groupe[], matchs: Match[], c: Competition, passage: Passage, qualifies: number): JoueurCompet[] {
  const parGroupe = groupes
    .sort((a, b) => a.ordre - b.ordre)
    .map((g, gi) => classement(g.joueurs, matchs.filter((m) => m.groupe_id === g.id), c).map((l) => ({ ...l, gi })));
  const tous = parGroupe.flatMap((ls) => (passage === "qualifies" ? ls.slice(0, Math.max(1, qualifies)) : ls));
  return tous
    .sort((x, y) => x.rang - y.rang || y.pts - x.pts || y.diff - x.diff || y.bp - x.bp || x.gi - y.gi)
    .map((l) => ({ id: l.id, nom: l.nom }));
}

/** Players of the next stage's groups: in blocks (strongest together) or in snake order (balanced groups). */
export function repartir(joueurs: JoueurCompet[], nbGroupes: number, mode: "blocs" | "serpentin"): JoueurCompet[][] {
  const n = Math.max(1, Math.min(nbGroupes, joueurs.length));
  const g: JoueurCompet[][] = Array.from({ length: n }, () => []);
  if (mode === "blocs") {
    const base = Math.floor(joueurs.length / n), plus = joueurs.length % n;
    let i = 0;
    for (let k = 0; k < n; k++) { const t = base + (k < plus ? 1 : 0); g[k] = joueurs.slice(i, i + t); i += t; }
  } else {
    joueurs.forEach((j, i) => { const tour = Math.floor(i / n), pos = i % n; g[tour % 2 === 0 ? pos : n - 1 - pos].push(j); });
  }
  return g;
}

/** Default names of the groups of a stage. */
export function nomsParDefaut(n: number, niveaux: boolean) {
  if (niveaux && n === 2) return ["Poule haute", "Poule basse"];
  if (niveaux && n === 3) return ["Poule haute", "Poule moyenne", "Poule basse"];
  // Mini-groups by level: the strongest first.
  if (niveaux && n > 3) return Array.from({ length: n }, (_, i) => `Niveau ${i + 1}`);
  return Array.from({ length: n }, (_, i) => `Poule ${String.fromCharCode(65 + i)}`);
}

/** Names of the leagues of the final stage, from the strongest: Diamond, Golden, Silver, Bronze, then Fair Play A, B… */
export const LIGUES = ["Diamond League", "Golden League", "Silver League", "Bronze League"];
export function nomsLigues(n: number) {
  return Array.from({ length: n }, (_, i) => LIGUES[i] || `Fair Play League ${String.fromCharCode(65 + i - LIGUES.length)}`);
}
/** Number of leagues for n players: never more than « taille » players in a league (sizes kept as even as possible). */
export const nbLigues = (n: number, taille: number) => Math.max(1, Math.ceil(n / Math.max(2, taille)));

/** Names of the knockout tables of a final stage, from the strongest. */
export function nomsTableaux(n: number) {
  if (n <= 1) return ["Tableau final"];
  return ["Tableau principal", ...Array.from({ length: n - 1 }, (_, i) => `Tableau ${String.fromCharCode(66 + i)}`)];
}

/** A stage is over when every match that can be played was played. */
export function etapeFinie(matchs: Match[]) {
  const reels = matchs.filter((m) => m.a && m.b);
  return reels.length > 0 && reels.every((m) => m.joue);
}

/** Short text describing a stage (for the admin). */
export function decrireEtape(e: EtapeConfig, derniere: boolean, suivante?: EtapeConfig | null) {
  if (e.format === "barrage") {
    const h = e.haut ?? 0, b = e.bas ?? 0;
    return `Barrage : les ${h} premiers de chaque poule montent directement, les ${b} derniers descendent directement, les autres jouent un match de barrage (le ${h + 1}e contre le suivant…) : le gagnant monte, le perdant descend`;
  }
  if (!derniere && suivante?.format === "barrage") {
    return `${e.groupes} poule${e.groupes > 1 ? "s" : ""} · puis barrage (montée directe, barrage, descente directe)`;
  }
  const f = e.format === "elimination"
    ? `Élimination directe${e.groupes > 1 ? ` · ${e.groupes} tableaux (les meilleurs ensemble, les suivants ensemble)` : ""}`
    : e.taille
      ? `Ligues de ${e.taille} joueurs (Diamond, Golden, Silver, Bronze League…) : les meilleurs ensemble, puis les suivants`
      : `${e.groupes} poule${e.groupes > 1 ? "s" : ""}`;
  const p = derniere || e.passage === "fin" ? "dernière étape" : e.passage === "niveaux" ? "puis les forts ensemble, les suivants ensemble" : `puis les ${e.qualifies} premiers de chaque poule passent`;
  return `${f} · ${p}`;
}

/* ------------------------------------------------------------------ play-off (barrage) */

/**
 * Splits the standings of a group for a play-off stage: straight up, play-off, straight down.
 * The play-off players meet best against worst (5th–6th; with four: 5th–8th and 6th–7th).
 */
export function decoupeBarrage(cl: Ligne[], haut: number, bas: number) {
  const n = cl.length;
  const h = Math.max(0, Math.min(haut, n));
  const b = Math.max(0, Math.min(bas, n - h));
  const milieu = cl.slice(h, n - b);
  const duels: [Ligne, Ligne][] = [];
  for (let i = 0; i < Math.floor(milieu.length / 2); i++) duels.push([milieu[i], milieu[milieu.length - 1 - i]]);
  // An odd number: the one left alone (the middle of the play-off zone) goes up.
  const seul = milieu.length % 2 ? milieu[Math.floor(milieu.length / 2)] : null;
  return { haut: cl.slice(0, h), milieu, duels, seul, bas: cl.slice(n - b) };
}

/** The group stage just before a play-off stage, cut group by group (for the screens and the next stage). */
export function vueBarrage(c: Competition, groupes: Groupe[], matchs: Match[], kBarrage: number) {
  const e = c.etapes[kBarrage];
  const avant = groupes.filter((g) => g.etape === kBarrage - 1).sort((a, b) => a.ordre - b.ordre);
  const msB = matchs.filter((m) => m.etape === kBarrage);
  return avant.map((g, gi) => {
    const cl = classement(g.joueurs, matchs.filter((m) => m.groupe_id === g.id), c);
    const d = decoupeBarrage(cl, e?.haut ?? 0, e?.bas ?? 0);
    const duels = d.duels.map(([x, y]) => {
      const m = msB.find((m) => (m.a === x.id && m.b === y.id) || (m.a === y.id && m.b === x.id)) || null;
      const w = m ? gagnant(m) : null;
      return { x, y, match: m, gagnant: w, perdant: w ? (w === x.id ? y.id : x.id) : null };
    });
    return { groupe: g, gi, cl, ...d, duelsJoues: duels };
  });
}

/**
 * End of a play-off stage: who goes up and who goes down, best first.
 * force = the stage is closed although a play-off was not played: the better placed one goes up.
 */
export function issueBarrage(vue: ReturnType<typeof vueBarrage>, force = false): { haut: JoueurCompet[]; bas: JoueurCompet[] } | null {
  type L = Ligne & { gi: number };
  const tri = (l: L[]) => l.sort((x, y) => x.rang - y.rang || y.pts - x.pts || y.diff - x.diff || y.bp - x.bp || x.gi - y.gi).map((l) => ({ id: l.id, nom: l.nom }));
  const directsH: L[] = [], gagnants: L[] = [], perdants: L[] = [], directsB: L[] = [];
  for (const v of vue) {
    v.haut.forEach((l) => directsH.push({ ...l, gi: v.gi }));
    if (v.seul) gagnants.push({ ...v.seul, gi: v.gi });
    for (const d of v.duelsJoues) {
      let w = d.gagnant;
      if (!w) { if (!force) return null; w = d.x.id; }
      const [g, p] = w === d.x.id ? [d.x, d.y] : [d.y, d.x];
      gagnants.push({ ...g, gi: v.gi });
      perdants.push({ ...p, gi: v.gi });
    }
    v.bas.forEach((l) => directsB.push({ ...l, gi: v.gi }));
  }
  return { haut: [...tri(directsH), ...tri(gagnants)], bas: [...tri(perdants), ...tri(directsB)] };
}

/* ------------------------------------------------------------------ dates */

/** The day after a date (YYYY-MM-DD). */
export function lendemain(d: string) {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + 1);
  return x.toISOString().slice(0, 10);
}

/**
 * Keeps the dates in order after a change: a stage never ends before it starts,
 * and the next stage always starts after the end of the previous one (moved to the day after if needed).
 */
export function enchainerDates(etapes: EtapeConfig[], depuis = 0): EtapeConfig[] {
  const out = etapes.map((e) => ({ ...e }));
  // Last known date before the stage (end, or start when the end is not set yet).
  let borne: string | null = null;
  for (let i = 0; i < out.length; i++) {
    const e = out[i];
    if (i >= depuis) {
      if (borne && e.debut && e.debut <= borne) e.debut = lendemain(borne);
      else if (borne && !e.debut && out[i - 1]?.fin) e.debut = lendemain(out[i - 1].fin!);
      if (e.debut && e.fin && e.fin < e.debut) e.fin = e.debut;
    }
    borne = e.fin || e.debut || borne;
  }
  return out;
}

/** Dates in order? (null = all right, otherwise what is wrong) */
export function erreurDates(etapes: EtapeConfig[]): string | null {
  let borne: { d: string; nom: string } | null = null;
  for (const e of etapes) {
    if (e.debut && e.fin && e.fin < e.debut) return `« ${e.nom} » finit avant de commencer.`;
    if (borne && e.debut && e.debut <= borne.d) return `« ${e.nom} » doit commencer après la fin de « ${borne.nom} ».`;
    if (borne && !e.debut && e.fin && e.fin <= borne.d) return `« ${e.nom} » doit finir après « ${borne.nom} ».`;
    const d = e.fin || e.debut;
    if (d) borne = { d, nom: e.nom };
  }
  return null;
}

/* ------------------------------------------------------------------ the player's own view */

/** One of my matches still to play, seen from my side (« moi » = my goals). */
export type AJouer = {
  id: string;
  contre: string;
  contreId: string;
  /** Knockout: a draw needs « who goes on ». */
  ko: boolean;
  moi: { m: number; s: number; v: string | null } | null;
  lui: { m: number; s: number; v: string | null } | null;
};

export type MaSituation = {
  compet: Competition;
  joueur: JoueurCompet;
  etapeNom: string;
  fin: string | null;
  groupe: string | null;
  rang: number | null;
  sur: number | null;
  pts: number | null;
  /** Where the player stands: « Qualifié », « En course », « Éliminé »… */
  statut: { txt: string; ton: "bon" | "moyen" | "neutre" | "fini" };
  aJouer: AJouer[];
  joues: number;
  total: number;
};

/**
 * For each of my players (family): in each competition in progress, my group, my place, whether I am
 * qualified or not, and the matches I still have to play in the current stage (before its end date).
 */
export function situations(competitions: { c: Competition; groupes: Groupe[]; matchs: Match[] }[], miens: string[]): MaSituation[] {
  const out: MaSituation[] = [];
  for (const { c, groupes, matchs } of competitions) {
    if (c.statut !== "en_cours") continue;
    const k = c.etape;
    const e = c.etapes[k];
    const gs = groupes.filter((g) => g.etape === k);
    const ms = matchs.filter((m) => m.etape === k);
    const tous = groupes.flatMap((g) => g.joueurs);
    const vueB = e.format === "barrage" ? vueBarrage(c, groupes, matchs, k) : null;
    const suivante = c.etapes[k + 1];
    const nomHaut = (suivante?.nomsGroupes?.[0]) || "la division du haut";
    const nomBas = (suivante?.nomsGroupes?.[1]) || "la division du bas";
    for (const id of miens) {
      const g = gs.find((x) => x.joueurs.some((j) => j.id === id));
      const joueur = g?.joueurs.find((j) => j.id === id) || tous.find((j) => j.id === id);
      if (!joueur) continue; // not in this competition
      const nom = (x: string | null) => tous.find((j) => j.id === x)?.nom || "?";
      if (!g && vueB) {
        // Play-off stage, without a play-off match: straight up or straight down.
        const v = vueB.find((x) => x.cl.some((l) => l.id === id));
        if (!v) continue;
        const monte = v.haut.some((l) => l.id === id) || v.seul?.id === id;
        out.push({ compet: c, joueur, etapeNom: e.nom, fin: e.fin, groupe: v.groupe.nom, rang: v.cl.find((l) => l.id === id)!.rang, sur: v.cl.length, pts: null, statut: monte ? { txt: `Monte directement en ${nomHaut}`, ton: "bon" } : { txt: `Va en ${nomBas}`, ton: "neutre" }, aJouer: [], joues: 0, total: 0 });
        continue;
      }
      if (!g) {
        out.push({ compet: c, joueur, etapeNom: e.nom, fin: e.fin, groupe: null, rang: null, sur: null, pts: null, statut: { txt: "Éliminé à l'étape précédente", ton: "fini" }, aJouer: [], joues: 0, total: 0 });
        continue;
      }
      const mesMs = ms.filter((m) => m.groupe_id === g.id && (m.a === id || m.b === id) && m.a && m.b);
      const aJouer: AJouer[] = mesMs.filter((m) => !m.joue).map((m) => {
        const jeSuisA = m.a === id;
        const vu = (p?: Proposition | null) => (p ? { m: jeSuisA ? p.a : p.b, s: jeSuisA ? p.b : p.a, v: p.v } : null);
        return { id: m.id, contre: nom(jeSuisA ? m.b : m.a), contreId: (jeSuisA ? m.b : m.a) || "", ko: m.tour != null, moi: vu(jeSuisA ? m.prop_a : m.prop_b), lui: vu(jeSuisA ? m.prop_b : m.prop_a) };
      });
      if (e.format === "barrage") {
        const m = mesMs[0];
        const w = m ? gagnant(m) : null;
        const statut = !m ? { txt: `Monte en ${nomHaut}`, ton: "bon" as const } : w ? (w === id ? { txt: `Barrage gagné : monte en ${nomHaut}`, ton: "bon" as const } : { txt: `Barrage perdu : va en ${nomBas}`, ton: "neutre" as const }) : { txt: `Match de barrage : le gagnant monte en ${nomHaut}`, ton: "moyen" as const };
        out.push({ compet: c, joueur, etapeNom: e.nom, fin: e.fin, groupe: g.nom, rang: null, sur: null, pts: null, statut, aJouer, joues: mesMs.filter((m) => m.joue).length, total: mesMs.length });
        continue;
      }
      if (e.format === "elimination") {
        const perdu = mesMs.some((m) => m.joue && gagnant(m) !== id);
        out.push({ compet: c, joueur, etapeNom: e.nom, fin: e.fin, groupe: g.nom, rang: null, sur: null, pts: null, statut: perdu ? { txt: "Éliminé", ton: "fini" } : { txt: "Toujours en course", ton: "bon" }, aJouer: perdu ? [] : aJouer, joues: mesMs.filter((m) => m.joue).length, total: mesMs.length });
        continue;
      }
      const cl = classement(g.joueurs, ms.filter((m) => m.groupe_id === g.id), c);
      const moi = cl.find((l) => l.id === id)!;
      const derniere = k >= c.etapes.length - 1 || e.passage === "fin";
      let statut: MaSituation["statut"];
      if (derniere) statut = moi.rang === 1 ? { txt: "En tête de la phase finale", ton: "bon" } : { txt: `${moi.rang}e de la phase finale`, ton: "neutre" };
      else if (suivante?.format === "barrage") {
        const h = suivante.haut ?? 0, b = suivante.bas ?? 0, n = cl.length;
        statut = moi.rang <= h ? { txt: "En route pour monter directement", ton: "bon" } : moi.rang > n - b ? { txt: "En route vers la division du bas", ton: "moyen" } : { txt: "En zone de barrage", ton: "moyen" };
      }
      else if (e.passage === "qualifies") statut = moi.rang <= e.qualifies ? { txt: `Qualifié pour l'instant (${e.qualifies} premiers)`, ton: "bon" } : { txt: `Pas encore qualifié (il faut finir dans les ${e.qualifies} premiers)`, ton: "moyen" };
      else {
        const moitie = Math.ceil(g.joueurs.length / 2);
        statut = moi.rang <= moitie ? { txt: "En route vers la poule haute", ton: "bon" } : { txt: "En route vers la poule basse", ton: "moyen" };
      }
      out.push({ compet: c, joueur, etapeNom: e.nom, fin: e.fin, groupe: g.nom, rang: moi.rang, sur: cl.length, pts: moi.pts, statut, aJouer, joues: mesMs.filter((m) => m.joue).length, total: mesMs.length });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ validators */

/** Role given in Notion (« Rôles ») to the members who may validate club competition scores. */
export const ROLE_VALIDEUR = "✅ Valideur chpt interne";
/** Former name of the role (still accepted). */
export const ROLES_VALIDEUR = [ROLE_VALIDEUR, "✅ Valideur"];
export const estValideur = (roles: string[] | null | undefined) => (roles || []).some((r) => ROLES_VALIDEUR.includes(r));

/** A score waiting for a validation (typed by one player, or different between the two). */
export type AValider = {
  match: Match;
  competId: string;
  compet: string;
  etape: string;
  groupe: string;
  a: JoueurCompet;
  b: JoueurCompet;
  ko: boolean;
  desaccord: boolean;
};

/** Every score typed by a player and not validated yet, in the stages in progress. */
export function matchsAValider(competitions: { c: Competition; groupes: Groupe[]; matchs: Match[] }[]): AValider[] {
  const out: AValider[] = [];
  for (const { c, groupes, matchs } of competitions) {
    if (c.statut !== "en_cours") continue;
    const tous = groupes.flatMap((g) => g.joueurs);
    const nom = (id: string) => tous.find((j) => j.id === id) || { id, nom: "?" };
    for (const m of matchs) {
      if (m.etape !== c.etape || m.joue || !m.a || !m.b || (!m.prop_a && !m.prop_b)) continue;
      const g = groupes.find((x) => x.id === m.groupe_id);
      out.push({ match: m, competId: c.id, compet: c.nom, etape: c.etapes[c.etape]?.nom || "", groupe: g?.nom || "", a: nom(m.a), b: nom(m.b), ko: m.tour != null, desaccord: etatSaisie(m) === "desaccord" });
    }
  }
  // The oldest typed first.
  const quand = (x: AValider) => [x.match.prop_a?.le, x.match.prop_b?.le].filter(Boolean).sort()[0] || "";
  return out.sort((x, y) => quand(x).localeCompare(quand(y)));
}

/** Every match of the stages in progress with no score typed yet (validators type the score directly). */
export function matchsSansScore(competitions: { c: Competition; groupes: Groupe[]; matchs: Match[] }[]): AValider[] {
  const out: AValider[] = [];
  for (const { c, groupes, matchs } of competitions) {
    if (c.statut !== "en_cours") continue;
    const tous = groupes.flatMap((g) => g.joueurs);
    const nom = (id: string) => tous.find((j) => j.id === id) || { id, nom: "?" };
    for (const m of matchs) {
      if (m.etape !== c.etape || m.joue || !m.a || !m.b || m.prop_a || m.prop_b) continue;
      const g = groupes.find((x) => x.id === m.groupe_id);
      out.push({ match: m, competId: c.id, compet: c.nom, etape: c.etapes[c.etape]?.nom || "", groupe: g?.nom || "", a: nom(m.a), b: nom(m.b), ko: m.tour != null, desaccord: false });
    }
  }
  return out;
}
