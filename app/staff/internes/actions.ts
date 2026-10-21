"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionProfil } from "@/lib/profil";
import { avancerVainqueur, creerEtape, lireCompet, suite } from "@/lib/internes-db";
import { erreurDates, type Brouillon, type EtapeConfig, type JoueurCompet, type Match, type TypeCompet } from "@/lib/internes";

export type Retour = { ok: boolean; message: string };

async function staff() {
  const { supabase, profil } = await getSessionProfil();
  if (profil?.role !== "admin") throw new Error("Réservé aux administrateurs.");
  return supabase;
}
const expliquer = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return /ci_competitions|ci_groupes|ci_matchs|does not exist|schema cache/.test(m) ? "Lance d'abord le script Supabase « etape13 »." : m;
};
const rafraichir = (id?: string) => {
  revalidatePath("/internes");
  revalidatePath("/staff/internes");
  if (id) revalidatePath(`/staff/internes/${id}`);
};

const date = (d: unknown) => (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
const entier = (x: unknown, min: number, max: number, defaut: number) => Math.max(min, Math.min(max, Math.round(Number(x)) || (Number(x) === 0 ? 0 : defaut)));

/** Clean list of stages (from a form): limits, last stage, play-off rules. Error text when it cannot be. */
function nettoyerEtapes(brut: EtapeConfig[]): { etapes: EtapeConfig[]; erreur: string | null } {
  const all = brut.slice(0, 8);
  const etapes: EtapeConfig[] = all.map((e, i) => {
    const format = e.format === "elimination" ? "elimination" : e.format === "barrage" ? "barrage" : "poules";
    return {
      nom: (String(e.nom || "").trim() || `Étape ${i + 1}`).slice(0, 80),
      debut: date(e.debut),
      fin: date(e.fin),
      format,
      groupes: entier(e.groupes, 1, 8, 1),
      nomsGroupes: (e.nomsGroupes || []).map((n) => String(n).slice(0, 40)).filter(Boolean),
      passage: format === "barrage" ? "niveaux" : i === all.length - 1 || format === "elimination" ? "fin" : e.passage === "qualifies" ? "qualifies" : "niveaux",
      qualifies: entier(e.qualifies, 1, 16, 2),
      // Leagues (mini-groups of N players) only for a stage after the first one.
      taille: format === "poules" && i > 0 && e.taille ? entier(e.taille, 2, 12, 4) : null,
      haut: format === "barrage" ? entier(e.haut, 0, 30, 4) : null,
      bas: format === "barrage" ? entier(e.bas, 0, 30, 4) : null,
    };
  });
  if (!etapes.length) return { etapes, erreur: "Il faut au moins une étape." };
  for (let i = 0; i < etapes.length; i++) {
    if (etapes[i].format !== "barrage") continue;
    if (i === 0) return { etapes, erreur: "Un barrage ne peut pas être la première étape : il se joue après des poules." };
    if (i === etapes.length - 1) return { etapes, erreur: "Un barrage ne peut pas être la dernière étape : il faut une étape après (division du haut / du bas)." };
    if (etapes[i - 1].format !== "poules") return { etapes, erreur: `« ${etapes[i].nom} » : un barrage se joue juste après une étape en poules.` };
    // Everybody goes on after the group stage that leads to the play-off.
    etapes[i - 1].passage = "niveaux";
  }
  return { etapes, erreur: erreurDates(etapes) };
}

/** New competition (its stages are described once, then everything follows by itself). */
export async function creerCompetition(p: { type: TypeCompet; nom: string; saison: string; pts: [number, number, number]; etapes: EtapeConfig[] }): Promise<Retour> {
  let id = "";
  try {
    const db = await staff();
    const nom = p.nom.trim().slice(0, 120);
    if (!nom) return { ok: false, message: "Donne un nom à la compétition." };
    const { etapes, erreur } = nettoyerEtapes(p.etapes || []);
    if (erreur) return { ok: false, message: erreur };
    const [v, n, d] = p.pts.map((x) => Math.max(0, Math.min(10, Math.round(Number(x) || 0))));
    const { data, error } = await db
      .from("ci_competitions")
      .insert({ type: p.type === "coupe" ? "coupe" : "championnat", nom, saison: p.saison.trim().slice(0, 20) || null, pts_v: v, pts_n: n, pts_d: d, etapes })
      .select("id")
      .single();
    if (error) return { ok: false, message: expliquer(error) };
    id = data.id;
  } catch (e) {
    return { ok: false, message: expliquer(e) };
  }
  rafraichir(id);
  redirect(`/staff/internes/${id}`);
}

/** Start: the groups of the first stage, made by the staff from the players' list. */
export async function lancer(id: string, groupes: { nom: string; joueurs: JoueurCompet[] }[]): Promise<Retour> {
  try {
    const db = await staff();
    const d = await lireCompet(db, id);
    if (!d) return { ok: false, message: "Compétition introuvable." };
    if (d.c.statut !== "preparation") return { ok: false, message: "Elle a déjà commencé." };
    const propres = groupes
      .map((g) => ({ nom: g.nom.slice(0, 40) || "Poule", joueurs: g.joueurs.filter((j) => j.id && j.nom).map((j) => ({ id: String(j.id), nom: String(j.nom).slice(0, 80) })) }))
      .filter((g) => g.joueurs.length);
    const total = propres.reduce((s, g) => s + g.joueurs.length, 0);
    if (total < 2) return { ok: false, message: "Choisis au moins 2 joueurs." };
    if (d.c.etapes[0].format === "poules" && propres.some((g) => g.joueurs.length < 2)) return { ok: false, message: "Chaque poule doit avoir au moins 2 joueurs." };
    await creerEtape(db, d.c, 0, propres);
    await db.from("ci_competitions").update({ statut: "en_cours", etape: 0, brouillon: null }).eq("id", id);
    rafraichir(id);
    return { ok: true, message: "C'est parti ! Les poules et tous les matchs de la première étape sont créés." };
  } catch (e) {
    return { ok: false, message: expliquer(e) };
  }
}

/** A score typed in the table. The standings follow; a finished stage opens the next one by itself. */
export async function saisirScore(matchId: string, butsA: number | null, butsB: number | null, vainqueur: string | null = null): Promise<Retour> {
  try {
    const db = await staff();
    const { data: m } = await db.from("ci_matchs").select("*").eq("id", matchId).maybeSingle();
    if (!m) return { ok: false, message: "Match introuvable." };
    const match = m as Match;
    const { data: c } = await db.from("ci_competitions").select("etape,statut").eq("id", match.competition_id).single();
    if (c && c.etape !== match.etape) return { ok: false, message: "Cette étape est terminée : son résultat ne peut plus changer." };
    if (butsA == null || butsB == null) {
      // Erase a score.
      if (match.tour != null) return { ok: false, message: "Dans le tableau final, corrige le score au lieu de l'effacer." };
      await db.from("ci_matchs").update({ buts_a: null, buts_b: null, vainqueur: null, joue: false, prop_a: null, prop_b: null, maj_le: new Date().toISOString() }).eq("id", matchId);
      rafraichir(match.competition_id);
      return { ok: true, message: "Score effacé." };
    }
    const a = Math.max(0, Math.min(99, Math.round(butsA))), b = Math.max(0, Math.min(99, Math.round(butsB)));
    const ko = match.tour != null;
    if (ko && a === b && vainqueur !== match.a && vainqueur !== match.b) return { ok: false, message: "Match nul : choisis qui passe (prolongations ou tirs)." };
    if (ko) {
      // In a knockout, a winner can only change while the next round has not been played.
      let q = db.from("ci_matchs").select("joue").eq("competition_id", match.competition_id).eq("etape", match.etape).eq("tour", match.tour! + 1).eq("place", Math.floor(match.place! / 2));
      if (match.groupe_id) q = q.eq("groupe_id", match.groupe_id);
      const { data: suiv } = await q.maybeSingle();
      if (suiv?.joue) return { ok: false, message: "Le tour suivant est déjà joué : ce score ne peut plus changer." };
    }
    // The staff decides: the players' proposals are cleared.
    const maj = { buts_a: a, buts_b: b, vainqueur: ko && a === b ? vainqueur : null, joue: true, prop_a: null, prop_b: null, maj_le: new Date().toISOString() };
    const { error } = await db.from("ci_matchs").update(maj).eq("id", matchId);
    if (error) return { ok: false, message: expliquer(error) };
    if (ko) await avancerVainqueur(db, match.competition_id, match.etape, { ...match, ...maj });
    const info = await suite(db, match.competition_id);
    rafraichir(match.competition_id);
    return { ok: true, message: info || "Score enregistré ✓ Le classement est à jour." };
  } catch (e) {
    return { ok: false, message: expliquer(e) };
  }
}

/** The staff closes the current stage now (unplayed matches stay unplayed). */
export async function cloturerEtape(id: string): Promise<Retour> {
  try {
    const db = await staff();
    const info = await suite(db, id, true);
    rafraichir(id);
    return { ok: Boolean(info), message: info || "Rien à clôturer." };
  } catch (e) {
    return { ok: false, message: expliquer(e) };
  }
}

export async function supprimerCompetition(id: string) {
  const db = await staff();
  await db.from("ci_competitions").delete().eq("id", id);
  rafraichir();
  redirect("/staff/internes");
}

/** Adds a late player to a group of the current stage: he gets a match against every player of that group. */
export async function ajouterJoueur(id: string, groupeId: string, joueur: JoueurCompet): Promise<Retour> {
  try {
    const db = await staff();
    const d = await lireCompet(db, id);
    if (!d) return { ok: false, message: "Compétition introuvable." };
    const { c, groupes } = d;
    if (c.statut !== "en_cours") return { ok: false, message: "La compétition n'est pas en cours." };
    if (c.etapes[c.etape].format !== "poules") return { ok: false, message: "On ne peut pas ajouter un joueur dans un tableau à élimination." };
    const g = groupes.find((x) => x.id === groupeId && x.etape === c.etape);
    if (!g) return { ok: false, message: "Poule introuvable." };
    if (groupes.some((x) => x.etape === c.etape && x.joueurs.some((j) => j.id === joueur.id))) return { ok: false, message: `${joueur.nom} joue déjà cette étape.` };
    const nouveau = { id: String(joueur.id), nom: String(joueur.nom).slice(0, 80) };
    const { error } = await db.from("ci_groupes").update({ joueurs: [...g.joueurs, nouveau] }).eq("id", g.id);
    if (error) return { ok: false, message: expliquer(error) };
    const rows = g.joueurs.map((j) => ({ competition_id: c.id, etape: c.etape, groupe_id: g.id, a: j.id, b: nouveau.id, joue: false }));
    if (rows.length) {
      const r = await db.from("ci_matchs").insert(rows);
      if (r.error) return { ok: false, message: expliquer(r.error) };
    }
    rafraichir(id);
    return { ok: true, message: `✅ ${nouveau.nom} ajouté à « ${g.nom} » avec ${rows.length} match${rows.length > 1 ? "s" : ""} à jouer.` };
  } catch (e) {
    return { ok: false, message: expliquer(e) };
  }
}

/** Saves the starting groups being prepared (nothing is lost when leaving the page). */
export async function enregistrerBrouillon(id: string, b: Brouillon): Promise<Retour> {
  try {
    const db = await staff();
    const propre: Brouillon = {
      nb: Math.max(1, Math.min(8, Math.round(Number(b.nb) || 1))),
      noms: (b.noms || []).slice(0, 8).map((n) => String(n).slice(0, 40)),
      place: Object.fromEntries(Object.entries(b.place || {}).slice(0, 300).map(([k, v]) => [String(k).slice(0, 64), Math.max(-1, Math.min(7, Math.round(Number(v))))])),
      ordre: (b.ordre || []).slice(0, 300).map((x) => String(x).slice(0, 64)),
      le: new Date().toISOString(),
    };
    const { error } = await db.from("ci_competitions").update({ brouillon: propre }).eq("id", id).eq("statut", "preparation");
    if (error) return { ok: false, message: /brouillon/.test(error.message) ? "Lance d'abord le script Supabase « etape13 » (mis à jour)." : expliquer(error) };
    return { ok: true, message: "Enregistré" };
  } catch (e) {
    return { ok: false, message: expliquer(e) };
  }
}

/**
 * Changes a competition: name, season, points, names and dates of the stages, names of the groups already made,
 * and the stages not started yet (format, groups, play-off added or removed…).
 * Stages already started keep their shape: only their name and dates change
 * (and, for the stage in progress, what happens at its end).
 */
export async function modifierCompetition(id: string, p: { nom: string; saison: string; pts: [number, number, number]; etapes: EtapeConfig[]; groupes: { id: string; nom: string }[] }): Promise<Retour> {
  try {
    const db = await staff();
    const d = await lireCompet(db, id);
    if (!d) return { ok: false, message: "Compétition introuvable." };
    const { c } = d;
    const nom = String(p.nom || "").trim().slice(0, 120);
    if (!nom) return { ok: false, message: "Donne un nom à la compétition." };
    // Last stage whose shape is fixed (already made): -1 while in preparation.
    const fixe = c.statut === "preparation" ? -1 : c.statut === "terminee" ? c.etapes.length - 1 : c.etape;
    if ((p.etapes || []).length <= fixe) return { ok: false, message: "Les étapes déjà commencées ne peuvent pas être retirées." };
    const brut: EtapeConfig[] = p.etapes.map((e, i) => {
      if (i > fixe) return e;
      const ancien = c.etapes[i];
      const enCours = c.statut === "en_cours" && i === c.etape;
      return { ...ancien, nom: e.nom, debut: e.debut, fin: e.fin, ...(enCours && ancien.format === "poules" ? { passage: e.passage, qualifies: e.qualifies } : {}) };
    });
    const { etapes, erreur } = nettoyerEtapes(brut);
    if (erreur) return { ok: false, message: erreur };
    // The shape of the stages already made never changes (nettoyerEtapes may only touch their « passage »).
    for (let i = 0; i <= fixe; i++) {
      const a = c.etapes[i], b = etapes[i];
      if (a.format !== b.format) return { ok: false, message: `« ${a.nom} » a déjà commencé : sa forme ne peut plus changer.` };
      b.groupes = a.groupes; b.nomsGroupes = a.nomsGroupes; b.taille = a.taille ?? null; b.haut = a.haut ?? null; b.bas = a.bas ?? null;
      if (!(c.statut === "en_cours" && i === c.etape)) { b.passage = a.passage; b.qualifies = a.qualifies; }
    }
    const [v, n, dd] = (p.pts || [3, 1, 0]).map((x) => entier(x, 0, 10, 0));
    const { error } = await db.from("ci_competitions").update({ nom, saison: String(p.saison || "").trim().slice(0, 20) || null, pts_v: v, pts_n: n, pts_d: dd, etapes }).eq("id", id);
    if (error) return { ok: false, message: expliquer(error) };
    // Names of the groups already made.
    for (const g of (p.groupes || []).slice(0, 100)) {
      const nomG = String(g.nom || "").trim().slice(0, 40);
      if (!nomG || !d.groupes.some((x) => x.id === g.id && x.nom !== nomG)) continue;
      await db.from("ci_groupes").update({ nom: nomG }).eq("id", g.id).eq("competition_id", id);
    }
    rafraichir(id);
    return { ok: true, message: "✅ Modifications enregistrées." };
  } catch (e) {
    return { ok: false, message: expliquer(e) };
  }
}
