"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { creerJoueurNotion } from "@/lib/club";

export type AdminState = { ok?: string; error?: string };

/** The super administrator (table super_admins, Supabase step 14): always admin, never demoted nor removed. */
async function estSuperAdmin(supabase: Awaited<ReturnType<typeof getSessionProfil>>["supabase"], email: string) {
  const { data, error } = await supabase.from("super_admins").select("email").eq("email", email.toLowerCase()).maybeSingle();
  return !error && Boolean(data);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Adds a player to the club: a new fiche in the Notion « Liste des joueurs » (the reference) and its copy
 * in the app, so he appears at once everywhere (competitions, forms…). The e-mail is optional:
 * without it the player is in the lists but has no login; with it he can also log in.
 */
export async function addMembre(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const { supabase, profil } = await getSessionProfil();
  if (profil?.role !== "admin") return { error: "Action réservée aux administrateurs." };
  const email = String(formData.get("email") || "").trim().toLowerCase() || null;
  const prenom = String(formData.get("prenom") || "").trim().slice(0, 80) || null;
  const nom = String(formData.get("nom") || "").trim().slice(0, 120);
  const role = formData.get("role") === "admin" ? "admin" : "joueur";
  const actif = formData.get("actif") === "on";
  if (email && !EMAIL_RE.test(email)) return { error: "Adresse e-mail invalide (ou laisse la case vide)." };
  if (!nom) return { error: "Le nom est obligatoire." };

  // 1. The player in Notion (reference list).
  let notionId: string;
  try {
    notionId = await creerJoueurNotion({ prenom, nom, email, actif, admin: role === "admin" });
  } catch (e) {
    return { error: "Création dans Notion impossible : " + (e instanceof Error ? e.message : "erreur") };
  }
  // 2. His copy in the app, right away (no need to wait for a synchronisation).
  const { error: ej } = await supabase.from("joueurs").insert({ notion_id: notionId, email, nom, prenom, actif, synced_at: new Date().toISOString() });
  if (ej) return { error: "Joueur créé dans Notion ; il apparaîtra après « Synchroniser » (" + ej.message + ")." };
  // 3. A login account only when there is an e-mail.
  if (email) {
    const { error } = await supabase.from("membres").insert({ email, nom, prenom, role, notion_id: notionId });
    if (error && error.code !== "23505") return { error: "Joueur ajouté, mais le compte de connexion n'a pas pu être créé : " + error.message };
  }
  revalidatePath("/admin");
  revalidatePath("/staff/internes", "layout");
  const qui = [prenom, nom].filter(Boolean).join(" ");
  return { ok: email ? `${qui} est ajouté à la liste des joueurs et peut se connecter avec ${email}.` : `${qui} est ajouté à la liste des joueurs (sans compte de connexion). Il est déjà proposé dans les compétitions.` };
}

export async function updateMembre(formData: FormData) {
  const { supabase, profil } = await getSessionProfil();
  if (profil?.role !== "admin") return;
  const email = String(formData.get("email") || "");
  const patch: Record<string, unknown> = {};
  const role = formData.get("role");
  if (role === "admin" || role === "joueur") patch.role = role;
  const actif = formData.get("actif");
  if (actif === "true" || actif === "false") patch.actif = actif === "true";
  if (email === profil.email && (patch.role === "joueur" || patch.actif === false)) return; // never lock yourself out
  if (await estSuperAdmin(supabase, email) && (patch.role === "joueur" || patch.actif === false)) return; // the super administrator always stays
  if (Object.keys(patch).length) await supabase.from("membres").update(patch).eq("email", email);
  revalidatePath("/admin");
}

/** Removes a login account that no Notion fiche uses any more (e.g. an old e-mail address). */
export async function retirerMembre(formData: FormData) {
  const { supabase, profil } = await getSessionProfil();
  if (profil?.role !== "admin") return;
  const email = String(formData.get("email") || "").toLowerCase();
  if (!email || email === profil.email) return;
  if (await estSuperAdmin(supabase, email)) return; // never removed
  const { count } = await supabase.from("joueurs").select("notion_id", { count: "exact", head: true }).eq("email", email);
  if (count) return; // still used by a fiche: change the e-mail in Notion instead
  const { error } = await supabase.from("membres").delete().eq("email", email);
  if (error) await supabase.from("membres").update({ actif: false }).eq("email", email);
  revalidatePath("/admin");
}

/** Quick add from the competition screen: a new player (no e-mail), returned so he can be placed at once. */
export async function ajouterJoueurRapide(prenom: string, nom: string, actif: boolean): Promise<{ ok: boolean; message: string; joueur?: { id: string; nom: string; actif: boolean } }> {
  const { supabase, profil } = await getSessionProfil();
  if (profil?.role !== "admin") return { ok: false, message: "Réservé aux administrateurs." };
  const p = prenom.trim().slice(0, 80) || null, n = nom.trim().slice(0, 120);
  if (!n) return { ok: false, message: "Le nom est obligatoire." };
  try {
    const id = await creerJoueurNotion({ prenom: p, nom: n, email: null, actif, admin: false });
    const { error } = await supabase.from("joueurs").insert({ notion_id: id, email: null, nom: n, prenom: p, actif, synced_at: new Date().toISOString() });
    if (error) return { ok: false, message: error.message };
    revalidatePath("/admin");
    const complet = [p, n].filter(Boolean).join(" ");
    return { ok: true, message: `${complet} est ajouté à la liste des joueurs.`, joueur: { id, nom: complet, actif } };
  } catch (e) {
    return { ok: false, message: "Création dans Notion impossible : " + (e instanceof Error ? e.message : "erreur") };
  }
}
