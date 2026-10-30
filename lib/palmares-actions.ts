"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getVue } from "./profil";
import { TAGS, creerResultat, lireCalendrier, lireMembresRoles, lirePalmares, retirerResultat, validerResultatNotion } from "./club";
import { estCompetition } from "./club-types";
import { RANGS, ROLE_PALMARES, saisonDe, sansTirets, titreDe, typeDe, type Rang } from "./palmares-types";
import { clientAdmin } from "./supabase/admin";
import { deposer } from "./courrier";
import { pousser, pushPret, type Abonnement } from "./push";
import historique from "./palmares-historique.json";

export type RetourP = { ok: boolean; message: string; reste?: number };

/** The signed-in person: may he validate (staff or « 🏅 Responsable palmarès »)? and his fiches. */
async function qui() {
  const { user, profil, apercu } = await getVue();
  if (!user?.email) return null;
  const email = user.email.toLowerCase();
  const membres = await lireMembresRoles().catch(() => []);
  const fiches = membres.filter((m) => m.email === email && !m.archive);
  const admin = profil?.role === "admin" && !apercu;
  const responsable = admin || fiches.some((f) => (f.roles || []).includes(ROLE_PALMARES));
  const nom = [profil?.prenom, profil?.nom].filter(Boolean).join(" ") || email;
  return { email, admin, responsable, apercu: Boolean(apercu), fiches, membres, nom };
}

const fini = () => { revalidateTag(TAGS.palmares); revalidatePath("/palmares"); revalidatePath("/fiche"); revalidatePath("/"); };

/** Phone notification + Courrier for some people (never blocking). */
async function prevenir(emails: string[], titre: string, texte: string, lien: string) {
  const db = clientAdmin();
  if (!db || !emails.length) return;
  await deposer(db, emails, { type: "notification", titre, texte, lien }).catch(() => 0);
  if (pushPret()) {
    const { data: subs } = await db.from("push_abonnements").select("endpoint,email,p256dh,auth");
    await pousser(db, (subs || []) as Abonnement[], emails, { title: titre, body: texte, url: lien, tag: `palmares-${Date.now()}` }).catch(() => null);
  }
}

/**
 * A new result from the app. Staff and « Responsable palmarès »: validated at once (the players are told).
 * Any other member: proposed (« À valider »), and the people in charge of the palmarès are told.
 */
export async function ajouterResultat(fd: FormData): Promise<RetourP> {
  const q = await qui();
  if (!q) return { ok: false, message: "Reconnecte-toi." };
  if (q.apercu) return { ok: false, message: "Mode aperçu : rien n'est enregistré." };
  const v = (k: string, n = 200) => String(fd.get(k) || "").replace(/\s+/g, " ").trim().slice(0, n);
  // The competition is one of the club's events (calendar): its name and dates come from there.
  const ev = (await lireCalendrier().catch(() => [])).find((e) => e.id === v("ev", 60));
  if (!ev || !ev.date || !estCompetition(ev) || ev.jourSpecial) return { ok: false, message: "Choisis une compétition dans la liste (un palmarès ne concerne que les compétitions)." };
  const competition = ev.nom.slice(0, 150);
  const rang = v("rang", 40) as Rang;
  const mode = v("mode", 4);
  const joueurs = [...new Set(fd.getAll("joueurs").map((x) => sansTirets(String(x))).filter((x) => /^[0-9a-f]{32}$/i.test(x)))].slice(0, 8);
  const equipe = mode === "eq" && ["Team A", "Team B"].includes(v("equipe")) ? v("equipe") : null;
  const categorie = v("categorie", 30) || null;
  const debut = ev.date.slice(0, 10), fin = (ev.fin || ev.date).slice(0, 10);
  const jour = /^\d{4}-\d{2}-\d{2}$/.test(v("jour")) ? v("jour") : "";
  if (fin > debut && !jour) return { ok: false, message: "Choisis le jour du résultat." };
  const date = jour && jour >= debut && jour <= fin ? jour : debut;
  const lien = /^https?:\/\//i.test(v("lien", 300)) ? v("lien", 300) : null;
  if (!["Huitième de finaliste", "Quart de finaliste", "Demi-finaliste", "Finaliste", "Vainqueur", "Autre place"].includes(rang)) return { ok: false, message: "Choisis le résultat obtenu." };
  const libre = Math.round(Number(v("place", 4)));
  if (rang === "Autre place" && !(libre >= 1 && libre <= 999)) return { ok: false, message: "Indique la place obtenue (ex. 18)." };
  if (mode !== "ind" && mode !== "eq") return { ok: false, message: "Individuel ou par équipe ?" };
  if (mode === "ind" && joueurs.length !== 1) return { ok: false, message: "Un résultat individuel : choisis un seul joueur." };
  if (mode === "eq" && !equipe) return { ok: false, message: "Choisis l'équipe du club (Team A ou Team B)." };
  // A player adds his own results only (they are checked by the responsable palmarès).
  const mesIds = q.fiches.map((f) => sansTirets(f.notion_id));
  if (!q.responsable && !joueurs.some((j) => mesIds.includes(j))) return { ok: false, message: "Tu peux ajouter seulement tes propres résultats (ou ceux de ton équipe, avec toi dedans)." };
  const place = rang === "Autre place" ? libre : RANGS.find((r) => r.id === rang)!.place;
  const saison = saisonDe(date);
  // Final (winner or finalist): its score, seen from the club (« 3-1 »), and the opponent — both optional.
  const finale = rang === "Vainqueur" || rang === "Finaliste";
  const bn = (k: string) => { const x = v(k, 3); return /^\d{1,2}$/.test(x) ? x : ""; };
  const scoreFinale = finale && bn("fNous") && bn("fEux") ? `${bn("fNous")}-${bn("fEux")}` : null;
  const adversaire = finale ? v("fAdv", 80) || null : null;
  const statut = q.responsable ? "Validé" : "À valider";
  const parEquipe = mode === "eq";
  try {
    await creerResultat({ joueurs, equipe, rang, place, competition, categorie, saison, date, type: typeDe(competition), parEquipe, statut, proposePar: q.nom, lien, scoreFinale, adversaire, lieu: ev.lieu || null });
  } catch (e) {
    return { ok: false, message: "Notion : " + (e instanceof Error ? e.message : "erreur") };
  }
  const titre = titreDe({ rang, place, competition, categorie });
  const mails = (ids: string[]) => [...new Set(q.membres.filter((m) => ids.includes(sansTirets(m.notion_id)) && m.email).map((m) => m.email!.toLowerCase()))];
  if (statut === "Validé") {
    await prevenir(mails(joueurs).filter((e) => e !== q.email), "🏅 Nouveau résultat dans ton palmarès", titre, "/fiche");
  } else {
    const resp = q.membres.filter((m) => (m.roles || []).includes(ROLE_PALMARES) && m.email).map((m) => m.email!.toLowerCase());
    let cibles = resp;
    if (!cibles.length) {
      const db = clientAdmin();
      const { data } = db ? await db.from("membres").select("email").eq("role", "admin").eq("actif", true) : { data: [] };
      cibles = ((data || []) as { email: string }[]).map((m) => m.email);
    }
    await prevenir([...new Set(cibles)], "🏅 Résultat à valider", `${q.nom} propose : ${titre}`, "/palmares#bloc-valider");
  }
  fini();
  return { ok: true, message: statut === "Validé" ? `Enregistré ✓ ${titre}` : `Merci ! Ton résultat est envoyé au responsable palmarès pour validation.` };
}

/** Responsable / staff: validates (ok) or refuses (removed) a proposed result. */
export async function traiterProposition(id: string, ok: boolean): Promise<RetourP> {
  const q = await qui();
  if (!q?.responsable || q.apercu) return { ok: false, message: "Réservé au responsable palmarès et au staff." };
  const r = (await lirePalmares()).find((x) => x.id === id);
  if (!r) return { ok: false, message: "Résultat introuvable." };
  try {
    if (ok) await validerResultatNotion(id);
    else await retirerResultat(id);
  } catch (e) {
    return { ok: false, message: "Notion : " + (e instanceof Error ? e.message : "erreur") };
  }
  if (ok) {
    const mails = [...new Set(q.membres.filter((m) => r.joueurs.includes(sansTirets(m.notion_id)) && m.email).map((m) => m.email!.toLowerCase()))];
    await prevenir(mails, "🏅 Résultat validé", r.titre, "/fiche");
  }
  fini();
  return { ok: true, message: ok ? "Validé ✓" : "Retiré." };
}

/** Staff: removes a validated result (mistake). */
export async function supprimerResultat(id: string): Promise<RetourP> {
  const q = await qui();
  if (!q?.responsable || q.apercu) return { ok: false, message: "Réservé au responsable palmarès et au staff." };
  await retirerResultat(id).catch(() => null);
  fini();
  return { ok: true, message: "Retiré." };
}

type Hist = { j: string | null; e: string | null; r: Rang; p: number | null; c: string; k: string | null; s: string | null; t: "Belgique" | "International" | "Interne"; q: boolean; o: string };

/**
 * Staff, once: copies the club's history (the palmarès document, 519 results) into Notion,
 * 35 results per tap (Notion takes its time); results already there are skipped, so it can be started again safely.
 */
export async function importerHistorique(): Promise<RetourP> {
  const q = await qui();
  if (!q?.admin) return { ok: false, message: "Réservé aux administrateurs." };
  // The same sentence can belong to two players (e.g. « Vainqueur coupe du monde par équipe »): player + sentence.
  const existants = new Set((await lirePalmares(true)).map((r) => `${r.joueurs[0] || r.equipe || ""}|${(r.origine || "").trim()}`));
  const liste = (historique as Hist[]).filter((h) => !existants.has(`${h.j || h.e || ""}|${h.o.trim()}`));
  const lot = liste.slice(0, 35);
  for (const h of lot) {
    await creerResultat({ joueurs: h.j ? [h.j] : [], equipe: h.e, rang: h.r, place: h.p, competition: h.c, categorie: h.k, saison: h.s, date: null, type: h.t, parEquipe: h.q, statut: "Validé", proposePar: "Import du palmarès historique", lien: null, origine: h.o });
  }
  fini();
  const reste = liste.length - lot.length;
  return { ok: true, message: reste ? `${lot.length} résultats importés, encore ${reste}…` : "Historique complet ✓", reste };
}

/** « Mettre à jour depuis Notion »: after a change made directly in Notion (otherwise read again every hour). */
export async function rafraichirPalmares(): Promise<RetourP> {
  const q = await qui();
  if (!q?.responsable) return { ok: false, message: "Réservé au responsable palmarès et au staff." };
  fini();
  return { ok: true, message: "À jour avec Notion ✓" };
}
