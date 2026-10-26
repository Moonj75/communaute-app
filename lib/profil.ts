import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "joueur";
export type Profil = {
  id: string;
  email: string;
  nom: string | null;
  prenom: string | null;
  role: Role;
  /** false = member not active this season: limited « discovery » space. */
  actif?: boolean;
  /** Former member, archived: no access to the app any more. */
  archive?: boolean;
};

/** Signed-in user and their club profile (null when signed out or not yet linked).
 *  Read once per page: the header, the « À faire » band, the mailbox… all share the same answer. */
export const getSessionProfil = cache(async function getSessionProfil() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profil: null as Profil | null };
  let { data, error } = await supabase.from("profils").select("id,email,nom,prenom,role,actif,archive").eq("id", user.id).maybeSingle();
  // Columns « actif » (SQL step 8) and « archive » (step 16): fall back gracefully before that.
  if (error) ({ data, error } = await supabase.from("profils").select("id,email,nom,prenom,role,actif").eq("id", user.id).maybeSingle());
  if (error) ({ data } = await supabase.from("profils").select("id,email,nom,prenom,role").eq("id", user.id).maybeSingle());
  const profil = (data as Profil | null) ?? null;
  // An archived member is treated as signed out (administrators are never archived).
  if (profil?.archive && profil.role !== "admin") return { supabase, user: null, profil: null as Profil | null };
  return { supabase, user, profil };
});

export function displayName(p: Profil | null, fallbackEmail?: string | null) {
  if (p?.prenom) return p.prenom;
  if (p?.nom) return p.nom;
  return (fallbackEmail || "").split("@")[0];
}

export const COOKIE_APERCU = "lions_apercu";

/**
 * Like getSessionProfil, but an administrator can « see as » a member (cookie set from /admin).
 * In preview the returned user e-mail and profile are the member's, with the player role.
 */
export const getVue = cache(async function getVue() {
  const base = await getSessionProfil();
  const none = { ...base, apercu: null as { email: string; nom: string } | null };
  if (!base.user || base.profil?.role !== "admin") return none;
  const { cookies } = await import("next/headers");
  const email = (await cookies()).get(COOKIE_APERCU)?.value;
  if (!email) return none;
  const { data: m } = await base.supabase.from("membres").select("email,nom,prenom,actif").eq("email", email).maybeSingle();
  if (!m) return none;
  const profil: Profil = { id: base.profil.id, email: m.email, nom: m.nom, prenom: m.prenom, role: "joueur", actif: m.actif !== false };
  return {
    supabase: base.supabase,
    user: { ...base.user, email: m.email as string },
    profil,
    apercu: { email: m.email as string, nom: [m.prenom, m.nom].filter(Boolean).join(" ") },
  };
});

/** Signed-in member who is not active this season (admins are never limited). */
export function estInactif(p: Profil | null | undefined) {
  return Boolean(p && p.role !== "admin" && p.actif === false);
}
