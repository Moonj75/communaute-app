/* Club calendar events (Notion « Calendrier Déplacements »): the fields to fill, the checks, the deadline suggestions.
 * Pure helpers (server and browser). */
import type { Evenement } from "./club-types";

export const TYPES_EV = ["Compétition", "Entraînement", "Extra"] as const;
export const COMPETITIONS_EV = ["Grand Prix", "Major", "Open", "Championnat", "Tournoi national", "Autre"] as const;
export const DEPLACEMENTS = ["🏠 Proximité", "🚗 Étranger en véhicule", "✈️ Étranger en avion"] as const;
export const DECISIONS = ["❔ À décider", "✅ On y va", "❌ On n'y va pas"] as const;
export const PRIORITES_EV = ["Obligatoire", "À faire absolument", "À faire si possible", "Fantaisie"] as const;

/** What the app writes into Notion. */
export type EvSaisie = {
  nom: string;
  type: string;
  competition: string | null;
  date: string;
  fin: string | null;
  lieu: string | null;
  deplacement: string | null;
  decision: string | null;
  priorite: string[];
  ouverture: string | null;
  limite: string | null;
  validation: string | null;
  covoiturage: boolean;
  notes: string | null;
};

/**
 * What is missing for an event to show everywhere in the app (inscriptions, dashboard, logistics, reminders).
 * A competition the club goes to needs its type, kind, travel, place and the three registration dates.
 */
export function manques(e: Evenement, aFiche: boolean): string[] {
  const m: string[] = [];
  if (!e.date) m.push("Date");
  if (!e.type) m.push("Type d'évènement");
  if ((e.type || "").toLowerCase().startsWith("compét")) {
    if (!e.competition) m.push("Compétition (Open, Major…)");
    if (!e.deplacement) m.push("Type de déplacement");
    if (!e.lieu) m.push("Lieu");
    if (!e.decision) m.push("Décision participation");
    if (e.decision === "✅ On y va") {
      if (!e.ouverture) m.push("Ouverture des inscriptions");
      if (!e.limite) m.push("Date limite de réponse");
      if (!e.validation) m.push("Date de validation");
      if (!aFiche) m.push("Fiche logistique");
    }
  }
  return m;
}

const jours = (a: string, b: string) => Math.round((Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / 86400000);
export const plusJours = (d: string, n: number) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const mediane = (l: number[]) => { const s = [...l].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

/** Usual delays before the event (days), learnt from the club's existing events of the same travel type. */
export type Delais = Record<string, { ouverture: number; limite: number; validation: number }>;
export function delaisHabituels(evs: Evenement[]): Delais {
  const defaut = { "🏠 Proximité": { ouverture: 35, limite: 14, validation: 10 }, "🚗 Étranger en véhicule": { ouverture: 60, limite: 30, validation: 25 }, "✈️ Étranger en avion": { ouverture: 120, limite: 75, validation: 70 } } as Delais;
  const out: Delais = { ...defaut };
  for (const d of DEPLACEMENTS) {
    const l = evs.filter((e) => e.deplacement === d && e.date && e.ouverture && e.limite && e.validation);
    const o = mediane(l.map((e) => jours(e.date!, e.ouverture!))), li = mediane(l.map((e) => jours(e.date!, e.limite!))), v = mediane(l.map((e) => jours(e.date!, e.validation!)));
    if (o && li && v && l.length >= 2) out[d] = { ouverture: o, limite: li, validation: v };
  }
  return out;
}
