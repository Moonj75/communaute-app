"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";

export type InviteState = { ok?: string; error?: string };

/** Sends the club's sign-in e-mail to one member (admin only). */
export async function inviterMembre(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const { supabase, profil } = await getSessionProfil();
  if (profil?.role !== "admin") return { error: "Réservé aux administrateurs." };
  const email = String(formData.get("email") || "").toLowerCase();
  if (!email) return { error: "E-mail manquant." };

  const { data: m } = await supabase.from("membres").select("actif").eq("email", email).maybeSingle();
  if (!m) return { error: "Ce compte n'existe pas." };
  if (!m.actif) return { error: "Compte inactif : activez-le d'abord." };

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") || "https"}://${h.get("x-forwarded-host") || h.get("host")}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (error.status === 429 || msg.includes("rate") || msg.includes("security purposes"))
      return { error: "Trop d'envois rapprochés : réessayez dans une minute." };
    return { error: "Envoi impossible : " + error.message };
  }
  await supabase.from("membres").update({ invite_le: new Date().toISOString() }).eq("email", email);
  revalidatePath("/admin");
  return { ok: "Invitation envoyée ✓" };
}
