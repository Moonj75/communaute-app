"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getVue } from "@/lib/profil";
import { TAGS, lireMembresRoles, enregistrerExercice, lireExercices, lireSeance, majIndispos, majPoste, majProgramme, majRolesJoueur, majStatutSeance, majValidation } from "@/lib/club";
import { ROLES, limitePassee, phase, prochainCode, statutEffectif, type RoleSeance } from "@/lib/entrainements-types";
import { clientAdmin } from "@/lib/supabase/admin";

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
    if (statutEffectif(s) === "Confirmé") return { ok: false, message: "L'entraînement est confirmé : seul le staff peut encore changer les rôles." };
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
  // Taking a role means being available that evening.
  if (joueurId && s.indispos.includes(joueurId)) await majIndispos(seanceId, s.indispos.filter((x) => x !== joueurId));
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
    if (statutEffectif(s) === "Confirmé") return { ok: false, message: "L'entraînement est confirmé : seul le staff peut encore changer les rôles." };
    if (!actuel || !q.fiches.some((f) => f.notion_id === actuel)) return { ok: false, message: "Ce rôle n'est pas à ton nom." };
    if (limitePassee(s.date)) return { ok: false, message: "La date limite (lundi 21h00) est passée." };
  }
  await majValidation(seanceId, role, ok);
  fini();
  return { ok: true, message: ok ? "Validé ✓" : "Validation retirée." };
}

/**
 * « Pas disponible » for one Friday: no reminders nor substitute calls for that session.
 * A member of the crew for himself (his fiches), staff for anybody. A role held that evening is freed.
 */
export async function changerDispo(seanceId: string, joueurId: string, indispo: boolean): Promise<Retour> {
  const q = await qui();
  if (!q) return { ok: false, message: "Reconnecte-toi." };
  if (q.apercu) return { ok: false, message: "Mode aperçu : rien n'est enregistré." };
  const s = await lireSeance(seanceId);
  if (!q.admin) {
    const f = q.fiches.find((x) => x.notion_id === joueurId);
    if (!f) return { ok: false, message: "Ce joueur ne fait pas partie de ton compte." };
    if (!ROLES.some((r) => aLeRole(f, r.id) || estSuppleant(f, r.id))) return { ok: false, message: "Réservé à l'équipe des entraînements." };
    if (statutEffectif(s) === "Confirmé") return { ok: false, message: "L'entraînement est confirmé : préviens le staff." };
    if (limitePassee(s.date)) return { ok: false, message: "La date limite (lundi 21h00) est passée." };
  }
  const liste = indispo ? [...s.indispos, joueurId] : s.indispos.filter((x) => x !== joueurId);
  await majIndispos(seanceId, liste);
  let libere = 0;
  if (indispo) for (const r of ROLES) if (s.postes[r.id].ids.includes(joueurId)) { await majPoste(seanceId, r.id, null, false); libere++; }
  fini();
  return { ok: true, message: indispo ? `Noté : pas disponible ce vendredi${libere ? " (ta place est libérée)" : ""}. Tu ne recevras pas de rappel pour cette date.` : "Noté : de nouveau disponible ✓" };
}

/* ---------- Staff ---------- */

async function staff() {
  const q = await qui();
  return q && q.admin ? q : null;
}
/** Trainers may also write the programme and the exercise sheets. */
async function staffOuEntraineur() {
  const q = await qui();
  return q && (q.admin || q.fiches.some((f) => aLeRole(f, "entraineur"))) && !q.apercu ? q : null;
}

/** Trainers (and staff): confirm or cancel by hand (bad weather, room closed…). */
export async function changerStatut(seanceId: string, statut: "Prévu" | "Confirmé" | "Annulé", motif: string): Promise<Retour> {
  const q = await staffOuEntraineur();
  if (!q) return { ok: false, message: "Réservé aux entraîneurs et au staff." };
  if (!q.admin && statutEffectif(await lireSeance(seanceId)) === "Confirmé") return { ok: false, message: "L'entraînement est confirmé : seul le staff peut encore le changer." };
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

/** « Mettre à jour depuis Notion » (staff): sessions and roles read again now; the roles are also copied into the app. */
export async function actualiserNotion(): Promise<Retour> {
  const q = await staff();
  if (!q || q.apercu) return { ok: false, message: "Réservé au staff." };
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

/**
 * Staff: the training role of one member, chosen in the app and written into Notion (Rôles).
 * etat: « titulaire » (★ on the role), « suppleant » (🔁) or « aucun ». The other roles of the fiche are kept.
 */
export async function changerRoleMembre(notionId: string, role: RoleSeance, etat: "titulaire" | "suppleant" | "aucun"): Promise<Retour> {
  const q = await staff();
  if (!q || q.apercu) return { ok: false, message: "Réservé au staff." };
  const r = ROLES.find((x) => x.id === role);
  if (!r) return { ok: false, message: "Rôle inconnu." };
  try {
    const m = (await lireMembresRoles()).find((x) => x.notion_id === notionId);
    if (!m) return { ok: false, message: "Membre introuvable dans Notion." };
    const roles = (m.roles || []).filter((x) => x !== r.tag && x !== r.supp);
    if (etat === "titulaire") roles.push(r.tag);
    if (etat === "suppleant") roles.push(r.supp);
    await majRolesJoueur(notionId, roles);
    const db = clientAdmin();
    if (db) await db.from("joueurs").update({ roles }).eq("notion_id", notionId);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Notion ne répond pas." };
  }
  fini();
  return { ok: true, message: "Rôle enregistré ✓" };
}
