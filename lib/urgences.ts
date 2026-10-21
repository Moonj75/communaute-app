import type { Evenement, JoueurLite, Participation, Tache } from "./club-types";
import { aujourdhui, concerne, compteARebours, dateCourte, estCompetition, estRetenu, indexReponses, inscriptionsOuvertes, joursEntre, lienReponse, phase } from "./club-types";

/** `quoi` = what it is about (shown large), `detail` = what to do (small line above). */
export type Urgence = { ic: string; txt: string; href: string; niveau: "haut" | "moyen"; quoi?: string; detail?: string };

/**
 * What the player must do now (scrolling band at the top). Nothing already done or in progress:
 * - an open competition still without an answer;
 * - an answer to confirm definitively;
 * - a competition he goes to within 7 days;
 * - staff: tasks late or due today.
 */
export function urgences(evs: Evenement[], parts: Participation[], famille: JoueurLite[], taches: Tache[] | null, today = aujourdhui(), elig?: Map<string, string[]>, nonLus: { id: string; titre: string; type: string; de_nom: string | null }[] = []): Urgence[] {
  const l: Urgence[] = [];
  // Unread mail first (relances, notifications, messages from the staff).
  for (const m of nonLus.slice(0, 3))
    l.push({ ic: m.type === "relance" ? "⏰" : m.type === "notification" ? "🔔" : "📬", txt: m.titre, quoi: m.titre, detail: m.type === "message" ? `Nouveau message${m.de_nom ? ` de ${m.de_nom}` : ""}` : m.type === "relance" ? "Relance du club" : "Notification du club", href: `/notif?m=${m.id}&type=${m.type}&titre=${encodeURIComponent(m.titre)}`, niveau: "haut" });
  if (nonLus.length > 3) l.push({ ic: "📬", txt: `${nonLus.length - 3} autres messages non lus`, quoi: `${nonLus.length - 3} autres messages`, detail: "Courrier non lu", href: "/courrier", niveau: "moyen" });
  const idx = indexReponses(parts, evs, famille);
  const comp = evs.filter((e) => e.date && e.date >= today && estCompetition(e) && estRetenu(e) && !e.jourSpecial);
  for (const e of comp) {
    const rep = famille.filter((j) => concerne(elig, e.id, j.notionId)).map((j) => ({ j, p: idx.get(e.id)?.get(j.notionId) || null }));
    if (!rep.length) continue;
    const ph = phase(e, today);
    if (ph === "confirmation" && rep.some((x) => x.p?.statut && x.p.statut !== "En attente" && !x.p.valide)) {
      l.push({ ic: "🔒", txt: `Confirme ta participation à ${e.nom}${e.validation ? ` avant le ${dateCourte(e.validation)}` : ""}`, quoi: e.nom, detail: `Confirme ta participation${e.validation ? ` · avant le ${dateCourte(e.validation)}` : ""}`, href: lienReponse(e), niveau: "haut" });
    } else if (inscriptionsOuvertes(e, today)) {
      const manquent = rep.filter((x) => !x.p?.statut || x.p.statut === "En attente");
      if (manquent.length) {
        const qui = famille.length > 1 ? ` (${manquent.map((x) => x.j.nom.split(" ")[0]).join(", ")})` : "";
        const urgent = e.limite ? joursEntre(today, e.limite) <= 7 : false;
        l.push({ ic: "🏁", txt: `Réponds pour ${e.nom}${qui}${e.limite ? ` avant le ${dateCourte(e.limite)}` : ""}`, quoi: e.nom, detail: `Réponds${qui}${e.limite ? ` · avant le ${dateCourte(e.limite)}` : ""}`, href: lienReponse(e, manquent.length === 1 ? manquent[0].j.notionId : null), niveau: urgent ? "haut" : "moyen" });
      }
    }
    const j = joursEntre(today, e.date!);
    if (j <= 7 && rep.some((x) => x.p?.statut === "Oui")) {
      l.push({ ic: "📍", txt: `${e.nom} : ${compteARebours(e.date, today).toLowerCase()}${e.lieu ? ` · ${e.lieu}` : ""}`, quoi: e.nom, detail: `C'est bientôt : ${compteARebours(e.date, today).toLowerCase()}${e.lieu ? ` · ${e.lieu}` : ""}`, href: `/calendrier?e=${e.id}&m=${e.date!.slice(0, 7)}#bloc-mois`, niveau: j <= 2 ? "haut" : "moyen" });
    }
  }
  for (const t of taches || []) {
    if (t.statut === "Fait" || !t.echeance || t.echeance > today) continue;
    l.push({ ic: "✅", txt: t.echeance < today ? `Tâche en retard : ${t.titre}` : `Tâche du jour : ${t.titre}`, quoi: t.titre, detail: t.echeance < today ? "Tâche en retard" : "Tâche du jour", href: "/staff/planning", niveau: t.echeance < today ? "haut" : "moyen" });
  }
  return l.sort((a, b) => (a.niveau === b.niveau ? 0 : a.niveau === "haut" ? -1 : 1));
}

/**
 * Club competitions: when the end of a stage comes near (7 days or less, or past) and I still have
 * matches to play, it goes in my « À faire » list.
 */
export function urgencesMatchs(sits: import("./internes").MaSituation[], today = aujourdhui(), famille = false): Urgence[] {
  const l: Urgence[] = [];
  for (const s of sits) {
    // A score typed by my opponent, waiting for my confirmation: always in the list, at the top.
    const qui0 = famille ? ` (${s.joueur.nom.split(" ")[0]})` : "";
    for (const m of s.aJouer.filter((x) => x.lui && !x.moi))
      l.push({ ic: "✋", txt: `Confirme le score contre ${m.contre}${qui0}`, quoi: `Score à confirmer${qui0}`, detail: `${s.compet.nom} · contre ${m.contre} : ${m.lui!.m}–${m.lui!.s}`, href: "/internes#bloc-mes-matchs", niveau: "haut" });
    if (!s.aJouer.length || !s.fin) continue;
    const j = joursEntre(today, s.fin);
    if (j > 7) continue;
    const n = s.aJouer.length;
    const qui = famille ? ` (${s.joueur.nom.split(" ")[0]})` : "";
    l.push({
      ic: "⚔️",
      txt: `${n} match${n > 1 ? "s" : ""} à jouer${qui} · ${s.compet.nom}`,
      quoi: `${n} match${n > 1 ? "s" : ""} à jouer${qui}`,
      detail: `${s.compet.nom} · ${s.etapeNom} · ${j < 0 ? "date dépassée !" : j === 0 ? "dernier jour !" : `avant le ${dateCourte(s.fin)}`}`,
      href: "/internes#bloc-mes-matchs",
      niveau: j <= 2 ? "haut" : "moyen",
    });
  }
  return l;
}
