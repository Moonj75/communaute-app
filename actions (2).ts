"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";

export type AdminState = { ok?: string; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addMembre(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const { supabase, profil } = await getSessionProfil();
  if (profil?.role !== "admin") return { error: "Action réservée aux administrateurs." };
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const prenom = String(formData.get("prenom") || "").trim();
  const nom = String(formData.get("nom") || "").trim();
  const role = formData.get("role") === "admin" ? "admin" : "joueur";
  if (!EMAIL_RE.test(email)) return { error: "Adresse e-mail invalide." };
  if (!nom) return { error: "Le nom est obligatoire." };
  const { error } = await supabase.from("membres").insert({ email, nom, prenom: prenom || null, role });
  if (error) {
    if (error.code === "23505") return { error: `${email} est déjà dans la liste.` };
    return { error: "Enregistrement impossible : " + error.message };
  }
  revalidatePath("/admin");
  return { ok: `${prenom || nom} peut maintenant se connecter avec ${email}.` };
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
  if (Object.keys(patch).length) await supabase.from("membres").update(patch).eq("email", email);
  revalidatePath("/admin");
}
