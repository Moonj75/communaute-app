import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  classement, decoupeBarrage, etapeFinie, gagnant, issueBarrage, vueBarrage, nbLigues, nomsLigues, nomsParDefaut, nomsTableaux, ordreGeneral, paires, repartir, tableauInitial,
  type Competition, type Groupe, type JoueurCompet, type Match,
} from "./internes";

/* Reading and writing the club competitions in Supabase (tables ci_*, see supabase/etape13). */

export async function lireCompetitions(db: SupabaseClient) {
  const { data, error } = await db.from("ci_competitions").select("*").order("cree_le", { ascending: false });
  return { competitions: (data || []) as Competition[], erreur: error ? error.message : null };
}

export async function lireCompet(db: SupabaseClient, id: string) {
  const [c, g, m] = await Promise.all([
    db.from("ci_competitions").select("*").eq("id", id).maybeSingle(),
    db.from("ci_groupes").select("*").eq("competition_id", id).order("etape").order("ordre"),
    db.from("ci_matchs").select("*").eq("competition_id", id).order("etape").order("tour").order("place"),
  ]);
  if (!c.data) return null;
  return { c: c.data as Competition, groupes: (g.data || []) as Groupe[], matchs: (m.data || []) as Match[] };
}

/** Creates the groups and matches of stage k from the players (groups already made, or one list for a knockout). */
export async function creerEtape(db: SupabaseClient, c: Competition, k: number, groupes: { nom: string; joueurs: JoueurCompet[] }[]) {
  const e = c.etapes[k];
  if (!e) throw new Error("Étape inconnue.");
  if (e.format === "barrage") {
    // One play-off group per group of the stage before; players in their order (best first): best against worst.
    for (let i = 0; i < groupes.length; i++) {
      const js = groupes[i].joueurs;
      if (!js.length) continue;
      const ins = await db.from("ci_groupes").insert({ competition_id: c.id, etape: k, nom: groupes[i].nom, ordre: i, joueurs: js }).select("id").single();
      if (ins.error) throw new Error(ins.error.message);
      const rows = Array.from({ length: Math.floor(js.length / 2) }, (_, p) => ({ competition_id: c.id, etape: k, groupe_id: ins.data.id, tour: 0, place: p, a: js[p].id, b: js[js.length - 1 - p].id, joue: false }));
      if (rows.length) {
        const r = await db.from("ci_matchs").insert(rows);
        if (r.error) throw new Error(r.error.message);
      }
    }
    return;
  }
  if (e.format === "elimination") {
    // One knockout table per level (main table, table B…), players in seed order (best first).
    for (let i = 0; i < groupes.length; i++) {
      const tetes = groupes[i].joueurs;
      if (tetes.length < 2) continue;
      const ins = await db.from("ci_groupes").insert({ competition_id: c.id, etape: k, nom: groupes[i].nom || e.nom || "Tableau final", ordre: i, joueurs: tetes }).select("id").single();
      if (ins.error) throw new Error(ins.error.message);
      const { lignes } = tableauInitial(tetes);
      const rows = lignes.map((l) => ({ competition_id: c.id, etape: k, groupe_id: ins.data.id, tour: l.tour, place: l.place, a: l.a, b: l.b, joue: false }));
      const r = await db.from("ci_matchs").insert(rows).select("*");
      if (r.error) throw new Error(r.error.message);
      // Byes: a player alone in a first-round match goes straight on.
      for (const m of (r.data || []) as Match[]) {
        if (m.tour === 0 && ((m.a && !m.b) || (!m.a && m.b))) {
          await db.from("ci_matchs").update({ joue: true, vainqueur: m.a || m.b }).eq("id", m.id);
          await avancerVainqueur(db, c.id, k, { ...m, joue: true, vainqueur: m.a || m.b });
        }
      }
    }
    return;
  }
  for (let i = 0; i < groupes.length; i++) {
    const g = groupes[i];
    const ins = await db.from("ci_groupes").insert({ competition_id: c.id, etape: k, nom: g.nom, ordre: i, joueurs: g.joueurs }).select("id").single();
    if (ins.error) throw new Error(ins.error.message);
    const rows = paires(g.joueurs).map(([a, b]) => ({ competition_id: c.id, etape: k, groupe_id: ins.data.id, a, b, joue: false }));
    if (rows.length) {
      const r = await db.from("ci_matchs").insert(rows);
      if (r.error) throw new Error(r.error.message);
    }
  }
}

/** Knockout: the winner of a match takes his place in the next round (or wins the competition). */
export async function avancerVainqueur(db: SupabaseClient, competitionId: string, etape: number, m: Match) {
  const w = gagnant(m);
  if (!w || m.tour == null || m.place == null) return;
  let q = db.from("ci_matchs").select("id").eq("competition_id", competitionId).eq("etape", etape).eq("tour", m.tour + 1).eq("place", Math.floor(m.place / 2));
  if (m.groupe_id) q = q.eq("groupe_id", m.groupe_id);
  const { data: suivant } = await q.maybeSingle();
  if (!suivant) return; // it was the final
  await db.from("ci_matchs").update(m.place % 2 === 0 ? { a: w } : { b: w }).eq("id", suivant.id);
}

/**
 * After each score: if the current stage is over, the next one is built by itself
 * (strong / weaker groups, or the qualified players), or the competition ends with its champion.
 * force = the staff closes the stage although some matches were not played.
 */
export async function suite(db: SupabaseClient, id: string, force = false): Promise<string | null> {
  const d = await lireCompet(db, id);
  if (!d || d.c.statut !== "en_cours") return null;
  const { c, groupes, matchs } = d;
  const k = c.etape;
  const e = c.etapes[k];
  const gs = groupes.filter((g) => g.etape === k);
  const ms = matchs.filter((m) => m.etape === k);

  if (e.format === "elimination") {
    // Over when every table has its winner; the champion is the winner of the main table.
    const vainqueurs = gs.sort((a, b) => a.ordre - b.ordre).map((g) => {
      const mg = ms.filter((m) => m.groupe_id === g.id);
      const tours = Math.max(0, ...mg.map((m) => m.tour ?? 0));
      const finale = mg.find((m) => m.tour === tours);
      const w = finale ? gagnant(finale) : null;
      return w ? g.joueurs.find((j) => j.id === w)?.nom || null : null;
    });
    if (!vainqueurs.length || vainqueurs.some((v) => !v)) return null;
    const champion = vainqueurs[0];
    await db.from("ci_competitions").update({ statut: "terminee", champion }).eq("id", id);
    return `🏆 ${champion} remporte la compétition !${vainqueurs.length > 1 ? ` (${gs.slice(1).map((g, i) => `${g.nom} : ${vainqueurs[i + 1]}`).join(" · ")})` : ""}`;
  }

  // Play-off stage over: winners up, losers down, then the next stage.
  let issue: { haut: JoueurCompet[]; bas: JoueurCompet[] } | null = null;
  if (e.format === "barrage") {
    issue = issueBarrage(vueBarrage(c, groupes, matchs, k), force);
    if (!issue) return null;
  } else if (!force && !etapeFinie(ms)) return null;
  const derniere = !issue && (k >= c.etapes.length - 1 || e.passage === "fin");
  if (derniere) {
    const premiers = classement(gs.sort((a, b) => a.ordre - b.ordre)[0]?.joueurs || [], ms.filter((m) => m.groupe_id === gs[0]?.id), c);
    const champion = premiers[0]?.nom || null;
    await db.from("ci_competitions").update({ statut: "terminee", champion }).eq("id", id);
    return `🏆 Étape terminée : ${champion} remporte la compétition !`;
  }
  const suivante = c.etapes[k + 1];
  if (!suivante) return null;
  const ordre = issue ? [...issue.haut, ...issue.bas] : ordreGeneral(gs, ms, c, e.passage, e.qualifies);
  let nouveaux: { nom: string; joueurs: JoueurCompet[] }[];
  if (suivante.format === "barrage") {
    // Play-off: in each group, the ones between the « haut » first and the « bas » last.
    nouveaux = gs.sort((a, b) => a.ordre - b.ordre).map((g) => {
      const d = decoupeBarrage(classement(g.joueurs, ms.filter((m) => m.groupe_id === g.id), c), suivante.haut ?? 0, suivante.bas ?? 0);
      return { nom: `Barrage · ${g.nom}`, joueurs: d.milieu.map((l) => ({ id: l.id, nom: l.nom })) };
    });
  } else if (issue && suivante.format === "poules" && !suivante.taille && suivante.groupes === 2) {
    // After a play-off: the upper division and the lower division, exactly.
    const noms = suivante.nomsGroupes.length >= 2 ? suivante.nomsGroupes : ["Division du haut", "Division du bas"];
    nouveaux = [{ nom: noms[0] || "Division du haut", joueurs: issue.haut }, { nom: noms[1] || "Division du bas", joueurs: issue.bas }];
  } else if (suivante.format === "elimination") {
    // One table, or one per level: the best in the main table, the next ones in table B…
    const blocs = repartir(ordre, Math.max(1, suivante.groupes), "blocs");
    const noms = suivante.nomsGroupes.length >= blocs.length ? suivante.nomsGroupes : nomsTableaux(blocs.length);
    nouveaux = blocs.map((j, i) => ({ nom: noms[i] || `Tableau ${i + 1}`, joueurs: j }));
  } else if (suivante.taille) {
    // Leagues: mini-groups of « taille » players, the best together (Diamond League), then the next ones…
    const blocs = repartir(ordre, nbLigues(ordre.length, suivante.taille), "blocs");
    const defaut = nomsLigues(blocs.length);
    nouveaux = blocs.map((j, i) => ({ nom: suivante.nomsGroupes[i] || defaut[i], joueurs: j }));
  } else {
    const niveaux = Boolean(issue) || e.passage === "niveaux";
    const blocs = repartir(ordre, suivante.groupes, niveaux ? "blocs" : "serpentin");
    const noms = suivante.nomsGroupes.length >= blocs.length ? suivante.nomsGroupes : nomsParDefaut(blocs.length, niveaux);
    nouveaux = blocs.map((j, i) => ({ nom: noms[i] || `Poule ${i + 1}`, joueurs: j }));
  }
  await creerEtape(db, c, k + 1, nouveaux);
  await db.from("ci_competitions").update({ etape: k + 1 }).eq("id", id);
  // A play-off stage without any play-off match (nobody in the middle zone): straight to the next stage.
  if (suivante.format === "barrage" && !nouveaux.some((g) => g.joueurs.length >= 2)) {
    const ensuite = await suite(db, id, true);
    return `✅ « ${e.nom} » est terminée : pas de barrage à jouer.${ensuite ? ` ${ensuite}` : ""}`;
  }
  if (suivante.format === "barrage") return `✅ « ${e.nom} » est terminée : les matchs de barrage sont prêts.`;
  return `✅ « ${e.nom} » est terminée : « ${suivante.nom} » est prête, avec ses poules et ses matchs.`;
}

/** Competitions in progress with their groups and matches (for « Mes matchs » and the « À faire » band). */
export async function lireEnCours(db: SupabaseClient) {
  const { data, error } = await db.from("ci_competitions").select("*").eq("statut", "en_cours");
  if (error || !data?.length) return [];
  return (await Promise.all((data as Competition[]).map((c) => lireCompet(db, c.id)))).filter((x): x is NonNullable<typeof x> => Boolean(x));
}
