import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "joueur";
export type Profil = {
  id: string;
  email: string;
  nom: string | null;
  prenom: string | null;
  role: Role;
};

/** Signed-in user and their club profile (null when signed out or not yet linked). */
export async function getSessionProfil() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profil: null as Profil | null };
  const { data } = await supabase
    .from("profils")
    .select("id,email,nom,prenom,role")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, user, profil: (data as Profil | null) ?? null };
}

export function displayName(p: Profil | null, fallbackEmail?: string | null) {
  if (p?.prenom) return p.prenom;
  if (p?.nom) return p.nom;
  return (fallbackEmail || "").split("@")[0];
}
