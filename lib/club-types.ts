/* Shared types and pure helpers (usable on server and client). */

export type Evenement = {
  id: string;
  url: string;
  nom: string;
  date: string | null; // YYYY-MM-DD
  fin: string | null;
  lieu: string | null;
  type: string | null; // Type d'évènement
  deplacement: string | null;
  decision: string | null; // Décision participation
  ouverture: string | null;
  limite: string | null;
  validation: string | null;
  annule: boolean;
  nePasFaire: boolean;
  jourSpecial: string | null;
  priorite: string[];
};

export type Reponse = "Oui" | "Non" | "Peut-être" | "En attente";

export type Participation = {
  id: string;
  joueurIds: string[];
  nomJoueur: string | null;
  evenementIds: string[];
  nomEvenement: string | null;
  statut: Reponse | null;
  jours: string | null;
  vehicule: string | null;
  depart: string | null;
  retour: string | null;
  restrictions: string[];
  creeLe: string;
};

export type Tache = {
  id: string;
  url: string;
  titre: string;
  statut: string;
  priorite: string | null;
  type: string | null;
  echeance: string | null;
  evenementIds: string[];
  responsableIds: string[];
  notes: string | null;
};

export type JoueurLite = { notionId: string; nom: string; email: string | null; actif: boolean };

export const TALLY_URL = "https://tally.so/r/vGkvr4";
export const DECISION_OUI = "✅ On y va";
export const DECISION_NON = "❌ On n'y va pas";
export const STATUTS_TACHE = ["À faire", "En cours", "En attente", "Bloqué", "Fait"];
export const PRIORITES = ["Urgent", "Normal", "Faible"];
export const RAPPEL = "⏰ Rappel";

/** Today in Brussels as YYYY-MM-DD. */
export function aujourdhui(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Brussels" });
}

export function joursEntre(a: string, b: string) {
  return Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86400000);
}

export function ajouterMois(d: string, n: number) {
  const x = new Date(d.slice(0, 10) + "T12:00:00Z");
  x.setUTCMonth(x.getUTCMonth() + n);
  return x.toISOString().slice(0, 10);
}

export function ajouterJours(d: string, n: number) {
  const x = new Date(d.slice(0, 10) + "T12:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOIS_LONG = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

export function dateCourte(d: string | null) {
  if (!d) return "—";
  const x = new Date(d.slice(0, 10) + "T12:00:00Z");
  return `${JOURS[x.getUTCDay()]} ${x.getUTCDate()} ${MOIS[x.getUTCMonth()]}`;
}
export function dateMoyenne(d: string | null) {
  if (!d) return "—";
  const x = new Date(d.slice(0, 10) + "T12:00:00Z");
  return `${x.getUTCDate()} ${MOIS[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}
export function nomMois(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MOIS_LONG[m - 1]} ${y}`;
}
export function moisCourt(d: string) {
  return MOIS[Number(d.slice(5, 7)) - 1].replace(".", "").toUpperCase();
}

/** « J-12 », « Aujourd'hui », « Il y a 3 j ». */
export function compteARebours(d: string | null, today = aujourdhui()) {
  if (!d) return "";
  const j = joursEntre(today, d);
  if (j === 0) return "Aujourd'hui";
  if (j === 1) return "Demain";
  if (j > 0) return `J-${j}`;
  return j === -1 ? "Hier" : `Il y a ${-j} j`;
}

/** Event is still on the club's agenda (not cancelled / dropped). */
export function estRetenu(e: Evenement) {
  return !e.annule && !e.nePasFaire && e.decision !== DECISION_NON;
}
export function estCompetition(e: Evenement) {
  return (e.type || "").toLowerCase().startsWith("compét");
}

/** Response window: is the Tally form relevant for this event right now? */
export function inscriptionsOuvertes(e: Evenement, today = aujourdhui()) {
  if (!e.date || e.date < today || !estRetenu(e)) return false;
  if (e.limite && e.limite < today) return false;
  if (e.ouverture && e.ouverture > today) return false;
  return e.decision === DECISION_OUI || Boolean(e.ouverture);
}

export function lienTally(e: Evenement, joueur?: string) {
  const p = new URLSearchParams();
  p.set("evenement", e.nom);
  const two = Boolean(e.fin && e.fin !== e.date);
  const loin = Boolean(e.deplacement && !/local|sur place|aucun/i.test(e.deplacement));
  p.set("vehicule_requis", loin ? "Oui" : "Non");
  p.set("restriction_requise", two || loin ? "Oui" : "Non");
  if (joueur) p.set("joueur", joueur);
  return `${TALLY_URL}?${p.toString()}`;
}

export type Jalon = { k: "dec" | "open" | "limit" | "valid" | "ev"; label: string; ic: string; date: string | null; fait?: boolean };

export function jalons(e: Evenement): Jalon[] {
  return [
    { k: "dec", label: "Décision", ic: "🗳️", date: e.date ? ajouterMois(e.date, -8) : null, fait: e.decision === DECISION_OUI || e.decision === DECISION_NON },
    { k: "open", label: "Ouverture", ic: "🟢", date: e.ouverture },
    { k: "limit", label: "Limite", ic: "🔒", date: e.limite },
    { k: "valid", label: "Validation", ic: "✅", date: e.validation },
    { k: "ev", label: "Jour J", ic: "🏁", date: e.date },
  ];
}

export function normaliser(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

/** Links each participation to an event id (relation first, then « Nom événement » text). */
export function evenementDe(p: Participation, evs: Evenement[]): string | null {
  const byId = p.evenementIds.find((id) => evs.some((e) => e.id === id));
  if (byId) return byId;
  if (!p.nomEvenement) return null;
  const [nom, dmy] = p.nomEvenement.split(" — ");
  const iso = dmy ? dmy.split("/").reverse().join("-") : null;
  const k = normaliser(nom);
  const cands = evs.filter((e) => normaliser(e.nom) === k || normaliser(e.nom).startsWith(k));
  if (iso) return cands.find((e) => e.date === iso)?.id || null;
  return cands.sort((a, b) => (a.date || "").localeCompare(b.date || ""))[0]?.id || null;
}

/** Links a participation to a player notion id (relation first, then name). */
export function joueurDe(p: Participation, joueurs: JoueurLite[]): string | null {
  const byId = p.joueurIds.find((id) => joueurs.some((j) => j.notionId === id));
  if (byId) return byId;
  if (!p.nomJoueur) return null;
  const k = normaliser(p.nomJoueur);
  return joueurs.find((j) => normaliser(j.nom) === k)?.notionId || null;
}

/** Latest answer per (event, player). */
export function indexReponses(parts: Participation[], evs: Evenement[], joueurs: JoueurLite[]) {
  const idx = new Map<string, Map<string, Participation>>();
  [...parts]
    .sort((a, b) => a.creeLe.localeCompare(b.creeLe))
    .forEach((p) => {
      const e = evenementDe(p, evs);
      const j = joueurDe(p, joueurs);
      if (!e || !j) return;
      if (!idx.has(e)) idx.set(e, new Map());
      idx.get(e)!.set(j, p);
    });
  return idx;
}

export function initiales(nom: string) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
}
