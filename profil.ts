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
};

/** Signed-in user and their club profile (null when signed out or not yet linked). */
export async function getSessionProfil() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profil: null as Profil | null };
  let { data, error } = await supabase.from("profils").select("id,email,nom,prenom,role,actif").eq("id", user.id).maybeSingle();
  // Column « actif » appears with SQL step 8: fall back gracefully before that.
  if (error) ({ data } = await supabase.from("profils").select("id,email,nom,prenom,role").eq("id", user.id).maybeSingle());
  return { supabase, user, profil: (data as Profil | null) ?? null };
}

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
export async function getVue() {
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
}

/** Signed-in member who is not active this season (admins are never limited). */
export function estInactif(p: Profil | null | undefined) {
  return Boolean(p && p.role !== "admin" && p.actif === false);
}
