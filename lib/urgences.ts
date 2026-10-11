import type { Evenement, JoueurLite, Participation, Tache } from "./club-types";
import { aujourdhui, compteARebours, dateCourte, estCompetition, estRetenu, indexReponses, inscriptionsOuvertes, joursEntre, lienReponse, phase } from "./club-types";

export type Urgence = { ic: string; txt: string; href: string; niveau: "haut" | "moyen" };

/**
 * What the player must do now (scrolling band at the top). Nothing already done or in progress:
 * - an open competition still without an answer;
 * - an answer to confirm definitively;
 * - a competition he goes to within 7 days;
 * - staff: tasks late or due today.
 */
export function urgences(evs: Evenement[], parts: Participation[], famille: JoueurLite[], taches: Tache[] | null, today = aujourdhui()): Urgence[] {
  const l: Urgence[] = [];
  const idx = indexReponses(parts, evs, famille);
  const comp = evs.filter((e) => e.date && e.date >= today && estCompetition(e) && estRetenu(e) && !e.jourSpecial);
  for (const e of comp) {
    const rep = famille.map((j) => ({ j, p: idx.get(e.id)?.get(j.notionId) || null }));
    const ph = phase(e, today);
    if (ph === "confirmation" && rep.some((x) => x.p?.statut && x.p.statut !== "En attente" && !x.p.valide)) {
      l.push({ ic: "🔒", txt: `Confirme ta participation à ${e.nom}${e.validation ? ` avant le ${dateCourte(e.validation)}` : ""}`, href: lienReponse(e), niveau: "haut" });
    } else if (inscriptionsOuvertes(e, today)) {
      const manquent = rep.filter((x) => !x.p?.statut || x.p.statut === "En attente");
      if (manquent.length) {
        const qui = famille.length > 1 ? ` (${manquent.map((x) => x.j.nom.split(" ")[0]).join(", ")})` : "";
        const urgent = e.limite ? joursEntre(today, e.limite) <= 7 : false;
        l.push({ ic: "🏁", txt: `Réponds pour ${e.nom}${qui}${e.limite ? ` avant le ${dateCourte(e.limite)}` : ""}`, href: lienReponse(e, manquent.length === 1 ? manquent[0].j.notionId : null), niveau: urgent ? "haut" : "moyen" });
      }
    }
    const j = joursEntre(today, e.date!);
    if (j <= 7 && rep.some((x) => x.p?.statut === "Oui")) {
      l.push({ ic: "📍", txt: `${e.nom} : ${compteARebours(e.date, today).toLowerCase()}${e.lieu ? ` · ${e.lieu}` : ""}`, href: `/calendrier?e=${e.id}&m=${e.date!.slice(0, 7)}#bloc-mois`, niveau: j <= 2 ? "haut" : "moyen" });
    }
  }
  for (const t of taches || []) {
    if (t.statut === "Fait" || !t.echeance || t.echeance > today) continue;
    l.push({ ic: "✅", txt: t.echeance < today ? `Tâche en retard : ${t.titre}` : `Tâche du jour : ${t.titre}`, href: "/staff/planning", niveau: t.echeance < today ? "haut" : "moyen" });
  }
  return l.sort((a, b) => (a.niveau === b.niveau ? 0 : a.niveau === "haut" ? -1 : 1));
}
