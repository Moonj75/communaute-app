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
  /** Kind of competition (Grand Prix, Major, Open, Championnat…). */
  competition?: string | null;
  /** Free note (e.g. FBFTS / FISTF). */
  notes?: string | null;
  /** Car-pooling organised by the club. */
  covoiturage?: boolean;
  /** Club target of players (from the logistics sheet). */
  objectif?: number | null;
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
  /** « Peux-tu être référent principal ? » (Oui / Non). */
  referent: string | null;
  depart: string | null;
  retour: string | null;
  restrictions: string[];
  creeLe: string;
  valide: boolean;
  valideLe: string | null;
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

export type Seance = {
  id: string;
  titre: string;
  date: string;
  debut: string | null;
  fin: string | null;
  lieu: string | null;
  themes: string[];
  annule: boolean;
  motif: string | null;
  entraineurIds: string[];
};

export type Resultat = {
  id: string;
  titre: string;
  date: string | null;
  type: string | null;
  place: number | null;
  sur: number | null;
  categorie: string | null;
  competitionIds: string[];
  joueurIds: string[];
  remarque: string | null;
};

export type ClassementClub = { date: string | null; national: number | null; international: number | null; source: string | null };

export type FicheLogistique = {
  id: string;
  url: string;
  evenementIds: string[];
  statut: string | null;
  adresse: string | null;
  horaires: string | null;
  hebergement: string | null;
  distHebEvenement: number | null;
  distHebCentre: number | null;
  distance: number | null;
  accesHebEvenement: string | null;
  accesAeroport: string | null;
  documents: string[];
  disponibilite: string[];
  contactNom: string | null;
  contactTel: string | null;
  contactMail: string | null;
  couts: { label: string; v: number }[];
  hotelNuit: number | null;
  objectif: number | null;
  vacances: boolean;
  zone: string | null;
  referentPrincipalIds: string[];
  referentComIds: string[];
  /** Fields marked « not useful » in the app (hidden from players). */
  masques: string[];
};

export type InfoPublique = { id: string; titre: string; texte: string | null; icone: string | null; lien: string | null };

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

/** « jeu. 29/10 » : day of the week + day/month, enough everywhere in the app. */
export function dateCourte(d: string | null) {
  if (!d) return "—";
  const x = new Date(d.slice(0, 10) + "T12:00:00Z");
  const dd = String(x.getUTCDate()).padStart(2, "0"), mm = String(x.getUTCMonth() + 1).padStart(2, "0");
  return `${JOURS[x.getUTCDay()]} ${dd}/${mm}`;
}
/** Same short format (kept as a separate name: used in many places). */
export function dateMoyenne(d: string | null) {
  return dateCourte(d);
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

/** Option label used by the Tally form for an event: « Nom — jj/mm/aaaa ». */
export function libelleTally(e: Evenement) {
  if (!e.date) return e.nom;
  const [y, m, d] = e.date.split("-");
  return `${e.nom} — ${d}/${m}/${y}`;
}

/** Link to the Tally form, pre-filled with the event and (optionally) the player. */
export function lienTally(e: Evenement, joueur?: string | null) {
  const p = new URLSearchParams();
  p.set("evenement", libelleTally(e));
  const two = Boolean(e.fin && e.fin !== e.date);
  const loin = Boolean(e.deplacement && !/local|sur place|aucun/i.test(e.deplacement));
  p.set("vehicule_requis", loin ? "Oui" : "Non");
  p.set("restriction_requise", two || loin ? "Oui" : "Non");
  if (joueur) {
    p.set("joueur", joueur);
    p.set("prenom", joueur.split(" ")[0]);
  }
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

/** In-app answer form (replaces the Tally link for signed-in players). */
export function lienReponse(e: Evenement, joueurId?: string | null) {
  return `/inscriptions/repondre?e=${encodeURIComponent(e.id)}${joueurId ? `&j=${encodeURIComponent(joueurId)}` : ""}`;
}

export function estLoin(e: Evenement) {
  return Boolean(e.deplacement && !/local|sur place|aucun/i.test(e.deplacement));
}
export function surDeuxJours(e: Evenement) {
  return Boolean(e.fin && e.fin !== e.date);
}

/**
 * Answer periods of an event:
 * - « avant »        : answers not open yet;
 * - « reponses »     : players answer and can change their mind;
 * - « confirmation » : after the answer deadline, until the validation date — players who answered
 *                      confirm definitively (no more changes afterwards);
 * - « close »        : everything is frozen.
 */
export type Phase = "avant" | "reponses" | "confirmation" | "close";
export function phase(e: Evenement, today = aujourdhui()): Phase {
  if (!e.date || e.date < today || !estRetenu(e)) return "close";
  if (inscriptionsOuvertes(e, today)) return "reponses";
  if (e.ouverture && e.ouverture > today) return "avant";
  if (e.limite && e.limite < today && e.validation && e.validation >= today) return "confirmation";
  if (e.decision === DECISION_OUI && !e.limite && !e.ouverture) return "reponses";
  return "close";
}

/** Can this answer still be changed by the player? */
export function modifiable(e: Evenement, p: Participation | null | undefined, today = aujourdhui()) {
  if (p?.valide) return false;
  const ph = phase(e, today);
  return ph === "reponses" || (ph === "confirmation" && Boolean(p?.statut && p.statut !== "En attente"));
}
