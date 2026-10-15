import type { Evenement, JoueurLite, Participation } from "./club-types";
import { concerne, indexReponses } from "./club-types";

/** Login e-mails that have at least one active fiche. */
export function comptesActifs(joueurs: JoueurLite[]) {
  return new Set(joueurs.filter((j) => j.actif && j.email).map((j) => j.email!.toLowerCase()));
}

/** Accounts where at least one active person has not answered for this event. */
export function sansReponse(ev: Evenement, evs: Evenement[], parts: Participation[], joueurs: JoueurLite[], elig?: Map<string, string[]>) {
  const idx = indexReponses(parts, evs, joueurs).get(ev.id);
  const out = new Set<string>();
  for (const j of joueurs) {
    if (!j.actif || !j.email || !concerne(elig, ev.id, j.notionId)) continue;
    const s = idx?.get(j.notionId)?.statut;
    if (!s || s === "En attente") out.add(j.email.toLowerCase());
  }
  return out;
}

/** Accounts where somebody answered « Oui » for this event. */
export function inscritsOui(ev: Evenement, evs: Evenement[], parts: Participation[], joueurs: JoueurLite[]) {
  const idx = indexReponses(parts, evs, joueurs).get(ev.id);
  const out = new Set<string>();
  for (const j of joueurs) if (j.email && idx?.get(j.notionId)?.statut === "Oui") out.add(j.email.toLowerCase());
  return out;
}

/** Accounts with at least one active person concerned by this event's form. */
export function comptesConcernes(ev: Evenement, joueurs: JoueurLite[], elig?: Map<string, string[]>) {
  return new Set(joueurs.filter((j) => j.actif && j.email && concerne(elig, ev.id, j.notionId)).map((j) => j.email!.toLowerCase()));
}
