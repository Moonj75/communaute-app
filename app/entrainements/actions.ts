"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getVue } from "@/lib/profil";
import { TAGS, lireMembresRoles, creerSeance, enregistrerExercice, lireExercices, lireSeance, lireSeancesPeriode, majPoste, majProgramme, majStatutSeance, majValidation, publierSeance } from "@/lib/club";
import { ROLES, limitePassee, phase, prochainCode, vendredis, type RoleSeance } from "@/lib/entrainements-types";
import { clientAdmin } from "@/lib/supabase/admin";
import { pousser, pushPret, type Abonnement } from "@/lib/push";
import { deposer } from "@/lib/courrier";

export type Retour = { ok: boolean; message: string };
type Fiche = { notion_id: string; prenom: string | null; nom: string; email: string | null; roles: string[] | null; actif: boolean; archive?: boolean };

/** The signed-in person: admin or not, and his own fiches with their club roles. */
async function qui() {
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) return null;
  const email = (user.email || "").toLowerCase();
  // Roles straight from Notion (a role just added there counts at once); the app copy if Notion does not answer.
  let fiches: Fiche[];
  try {
    fiches = (await lireMembresRoles()).filter((f) => f.email === email && !f.archive);
  } catch {
    const { data } = await supabase.from("joueurs").select("*").eq("email", email);
    fiches = ((data || []) as Fiche[]).filter((f) => !f.archive);
  }
  return { supabase, admin: profil?.role === "admin" && !apercu, apercu: Boolean(apercu), fiches };
}
/** Everybody with roles (Notion first, app copy otherwise). */
async function membres(q: { supabase: Awaited<ReturnType<typeof getVue>>["supabase"] }): Promise<Fiche[]> {
  try { return await lireMembresRoles(); } catch {
    const { data } = await (clientAdmin() || q.supabase).from("joueurs").select("*");
    return (data || []) as Fiche[];
  }
}
const aLeRole = (f: Fiche, role: RoleSeance) => (f.roles || []).includes(ROLES.find((r) => r.id === role)!.tag);
const estSuppleant = (f: Fiche, role: RoleSeance) => (f.roles || []).includes(ROLES.find((r) => r.id === role)!.supp);
const fini = () => { revalidateTag(TAGS.entrainements); revalidatePath("/entrainements"); };

/** A member puts himself on (or takes himself off) a role of a session; staff can put anybody. */
export async function choisirPoste(seanceId: string, role: RoleSeance, joueurId: string | null, valider = false): Promise<Retour> {
  const q = await qui();
  if (!q) return { ok: false, message: "Reconnecte-toi." };
  if (q.apercu) return { ok: false, message: "Mode aperçu : rien n'est enregistré." };
  const s = await lireSeance(seanceId);
  const actuel = s.postes[role].ids[0] || null;
  const miens = new Set(q.fiches.map((f) => f.notion_id));
  if (!q.admin) {
    const ph = phase(s.date);
    if (ph === "clos") return { ok: false, message: "La date limite (lundi 21h00) est passée : contacte le staff." };
    const f = joueurId ? q.fiches.find((x) => x.notion_id === joueurId) : null;
    if (joueurId && !f) return { ok: false, message: "Ce joueur ne fait pas partie de ton compte." };
    if (ph === "suppleants" && f && !(actuel && miens.has(actuel))) {
      // After the Friday before: a role not confirmed goes to the first substitute who takes it (confirmed at once).
      if (s.postes[role].ok) return { ok: false, message: "Cette place est déjà confirmée." };
      if (!estSuppleant(f, role) && !aLeRole(f, role)) return { ok: false, message: "Tu n'es pas suppléant pour ce rôle." };
      valider = true;
    } else {
      if (actuel && !miens.has(actuel)) return { ok: false, message: "Cette place est déjà prise." };
      if (f && !aLeRole(f, role)) return { ok: false, message: "Tu n'es pas dans la liste pour ce rôle. Demande au staff de t'y ajouter." };
    }
  }
  await majPoste(seanceId, role, joueurId, valider);
  fini();
  return { ok: true, message: joueurId ? "C'est noté ✓" : "Place libérée." };
}

/** The person on a role confirms (or withdraws his confirmation) before Monday 21:00. */
export async function validerPoste(seanceId: string, role: RoleSeance, ok: boolean): Promise<Retour> {
  const q = await qui();
  if (!q) return { ok: false, message: "Reconnecte-toi." };
  if (q.apercu) return { ok: false, message: "Mode aperçu : rien n'est enregistré." };
  const s = await lireSeance(seanceId);
  const actuel = s.postes[role].ids[0];
  if (!q.admin) {
    if (!actuel || !q.fiches.some((f) => f.notion_id === actuel)) return { ok: false, message: "Ce rôle n'est pas à ton nom." };
    if (limitePassee(s.date)) return { ok: false, message: "La date limite (lundi 21h00) est passée." };
  }
  await majValidation(seanceId, role, ok);
  fini();
  return { ok: true, message: ok ? "Validé ✓" : "Validation retirée." };
}

/* ---------- Staff ---------- */

async function staff() {
  const q = await qui();
  return q && q.admin ? q : null;
}
/** The training crew (trainers, openers, closers, bar, and their substitutes) runs the planning itself; staff can too. */
async function equipe() {
  const q = await qui();
  return q && !q.apercu && (q.admin || q.fiches.some((f) => ROLES.some((r) => aLeRole(f, r.id) || estSuppleant(f, r.id)))) ? q : null;
}
/** Trainers may also write the programme and the exercise sheets. */
async function staffOuEntraineur() {
  const q = await qui();
  return q && (q.admin || q.fiches.some((f) => aLeRole(f, "entraineur"))) && !q.apercu ? q : null;
}

/** Creates the Friday sessions of a month (the missing ones), with the usual hours and place. */
export async function creerMois(mois: string): Promise<Retour> {
  if (!(await equipe())) return { ok: false, message: "Réservé à l'équipe des entraînements." };
  const jours = vendredis(mois);
  const existantes = await lireSeancesPeriode(jours[0], jours[jours.length - 1]);
  const avant = await lireSeancesPeriode(`${Number(mois.slice(0, 4)) - 1}${mois.slice(4)}-01`, `${mois}-01`).catch(() => []);
  const modele = [...avant].reverse().find((s) => s.debut || s.lieu);
  let n = 0;
  for (const j of jours) {
    if (existantes.some((s) => s.date.slice(0, 10) === j)) continue;
    await creerSeance({ date: j, debut: modele?.debut || "18h00", fin: modele?.fin || "22h00", lieu: modele?.lieu || "Eugies" });
    n++;
  }
  fini();
  return { ok: true, message: n ? `${n} vendredi${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""} au planning.` : "Tous les vendredis du mois existent déjà." };
}

/** Fills the empty roles in turn among the volunteers of each list (fewest sessions first). */
export async function completerMois(mois: string): Promise<Retour> {
  const q = await equipe();
  if (!q) return { ok: false, message: "Réservé à l'équipe des entraînements." };
  const jours = vendredis(mois);
  const seances = await lireSeancesPeriode(jours[0], jours[jours.length - 1]);
  const tous = (await membres(q)).filter((f) => f.actif && !f.archive);
  let n = 0;
  for (const r of ROLES) {
    const pool = tous.filter((f) => aLeRole(f, r.id));
    if (!pool.length) continue;
    const compte = new Map(pool.map((f) => [f.notion_id, seances.filter((s) => s.postes[r.id].ids.includes(f.notion_id)).length]));
    for (const s of seances) {
      if (s.postes[r.id].ids.length || s.annule) continue;
      // Not twice the same evening on two roles if it can be avoided.
      const pris = new Set(ROLES.flatMap((x) => s.postes[x.id].ids));
      const choix = [...pool].sort((a, b) => Number(pris.has(a.notion_id)) - Number(pris.has(b.notion_id)) || compte.get(a.notion_id)! - compte.get(b.notion_id)!)[0];
      await majPoste(s.id, r.id, choix.notion_id, false);
      s.postes[r.id].ids = [choix.notion_id];
      compte.set(choix.notion_id, compte.get(choix.notion_id)! + 1);
      n++;
    }
  }
  fini();
  return { ok: true, message: n ? `${n} rôle${n > 1 ? "s" : ""} proposé${n > 1 ? "s" : ""}. Vérifie, puis publie le planning.` : "Rien à compléter (ou aucune liste de volontaires dans Notion → Rôles)." };
}

/** Publishes the month: each person receives his dates (notification + Courrier). */
export async function publierMois(mois: string): Promise<Retour> {
  const q = await equipe();
  if (!q) return { ok: false, message: "Réservé à l'équipe des entraînements." };
  const jours = vendredis(mois);
  const seances = await lireSeancesPeriode(jours[0], jours[jours.length - 1]);
  if (!seances.length) return { ok: false, message: "Aucune séance ce mois-là : crée d'abord les vendredis." };
  const fiches = await membres(q);
  const parEmail = new Map<string, string[]>();
  for (const s of seances) {
    for (const r of ROLES) for (const id of s.postes[r.id].ids) {
      const f = fiches.find((x) => x.notion_id === id);
      if (!f?.email) continue;
      const e = f.email.toLowerCase();
      parEmail.set(e, [...(parEmail.get(e) || []), `${r.ic} ${r.nom} le ${s.date.slice(8, 10)}/${s.date.slice(5, 7)}`]);
    }
    await publierSeance(s.id);
  }
  const nomMois = new Date(`${mois}-15T12:00:00Z`).toLocaleDateString("fr-BE", { month: "long", timeZone: "UTC" });
  const db = clientAdmin() || q.supabase;
  const { data: subs } = pushPret() ? await db.from("push_abonnements").select("endpoint,email,p256dh,auth") : { data: [] };
  for (const [email, lignes] of parEmail) {
    const titre = `📅 Planning des entraînements de ${nomMois}`;
    const texte = `Tes rôles : ${lignes.join(" · ")}. Valide chaque date dans l'appli au plus tard le vendredi d'avant à 21h00 ; ensuite la place est proposée aux suppléants.`;
    await deposer(db, [email], { type: "notification", titre, texte, lien: "/entrainements#bloc-planning" }).catch(() => 0);
    if (subs?.length) await pousser(db, subs as Abonnement[], [email], { title: titre, body: texte, url: "/entrainements#bloc-planning", tag: `ent-planning-${mois}` }).catch(() => null);
  }
  fini();
  return { ok: true, message: `Planning publié ✓ — ${parEmail.size} personne${parEmail.size > 1 ? "s" : ""} prévenue${parEmail.size > 1 ? "s" : ""}.` };
}

/** Trainers (and staff): confirm or cancel by hand (bad weather, room closed…). */
export async function changerStatut(seanceId: string, statut: "Prévu" | "Confirmé" | "Annulé", motif: string): Promise<Retour> {
  if (!(await staffOuEntraineur())) return { ok: false, message: "Réservé aux entraîneurs et au staff." };
  await majStatutSeance(seanceId, statut, statut === "Annulé" ? motif.slice(0, 200) || "Annulé par le staff" : null);
  fini();
  return { ok: true, message: `Séance : ${statut}.` };
}

/** Programme of the day: exercise ids in order. */
export async function enregistrerProgramme(seanceId: string, ids: string[]): Promise<Retour> {
  if (!(await staffOuEntraineur())) return { ok: false, message: "Réservé aux entraîneurs et au staff." };
  const ex = await lireExercices();
  const choisis = ids.map((id) => ex.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => Boolean(e));
  await majProgramme(seanceId, choisis.map((e) => e.code || e.titre), choisis.map((e) => e.id));
  fini();
  return { ok: true, message: "Programme enregistré ✓" };
}

/** New or edited exercise sheet; the code is given automatically (D-04…) when left empty. */
export async function sauverExercice(fd: FormData): Promise<Retour> {
  if (!(await staffOuEntraineur())) return { ok: false, message: "Réservé aux entraîneurs et au staff." };
  const s = (k: string) => String(fd.get(k) || "").trim();
  const n = (k: string) => (s(k) ? Number(s(k).replace(",", ".")) || null : null);
  const titre = s("titre");
  const style = s("style");
  if (!titre || !style) return { ok: false, message: "Donne au moins un nom et une catégorie." };
  const video = s("video");
  if (video && !/^https?:\/\//i.test(video)) return { ok: false, message: "Le lien vidéo doit commencer par https://" };
  const id = s("id") || null;
  let code = s("code").toUpperCase();
  if (!code) code = prochainCode(style, (await lireExercices()).map((e) => e.code));
  await enregistrerExercice({ id, code, titre, style, niveau: s("niveau") || null, duree: n("duree"), description: s("description") || null, materiel: s("materiel") || null, objectif: s("objectif") || null, joueurs: n("joueurs"), video: video || null });
  fini();
  return { ok: true, message: `Fiche ${code} enregistrée ✓` };
}

/** « Mettre à jour depuis Notion »: sessions and roles read again now; the roles are also copied into the app. */
export async function actualiserNotion(): Promise<Retour> {
  const q = await equipe();
  if (!q) return { ok: false, message: "Réservé à l'équipe des entraînements." };
  revalidateTag(TAGS.entrainements);
  let n = 0;
  try {
    const db = clientAdmin();
    const liste = await lireMembresRoles();
    if (db) for (const m of liste) { const { error } = await db.from("joueurs").update({ roles: m.roles }).eq("notion_id", m.notion_id); if (!error) n++; }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Notion ne répond pas." };
  }
  revalidatePath("/entrainements");
  return { ok: true, message: `À jour avec Notion ✓ (${n} fiches).` };
}
