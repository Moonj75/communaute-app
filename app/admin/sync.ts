"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { lireJoueurs } from "@/lib/notion";

export type SyncState = {
  ok?: boolean;
  error?: string;
  importes?: number;
  inactifs?: number;
  sansEmail?: string[];
  doublons?: string[];
  at?: string;
};

/** Copies the Notion « Liste des joueurs » into the members table (admin only). */
export async function synchroniserNotion(): Promise<SyncState> {
  const { supabase, profil } = await getSessionProfil();
  if (profil?.role !== "admin") return { error: "Action réservée aux administrateurs." };

  let joueurs;
  try {
    joueurs = await lireJoueurs();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Lecture de Notion impossible." };
  }

  const sansEmail = joueurs.filter((j) => !j.email).map((j) => j.nomComplet);
  const seen = new Map<string, string>();
  const doublons: string[] = [];
  const now = new Date().toISOString();
  const rows = [];
  for (const j of joueurs) {
    if (!j.email) continue;
    if (seen.has(j.email)) {
      doublons.push(`${j.nomComplet} (même e-mail que ${seen.get(j.email)})`);
      continue;
    }
    seen.set(j.email, j.nomComplet);
    // Never lock out the admin who runs the sync, even if Notion still says « Joueur ».
    const isMe = j.email === profil.email;
    rows.push({
      email: j.email,
      nom: j.nom,
      prenom: j.prenom,
      role: j.admin || isMe ? "admin" : "joueur",
      actif: j.actif || isMe,
      notion_id: j.notionId,
      roles: j.roles,
      cagnotte: j.cagnotte,
      telephone: j.telephone,
      vehicule: j.vehicule,
      categorie: j.categorie,
      serie: j.serie,
      synced_at: now,
    });
  }

  if (rows.length) {
    const { error } = await supabase.from("membres").upsert(rows, { onConflict: "email" });
    if (error) return { error: "Enregistrement impossible : " + error.message };
  }
  revalidatePath("/admin");
  revalidatePath("/fiche");
  return {
    ok: true,
    importes: rows.length,
    inactifs: rows.filter((r) => !r.actif).length,
    sansEmail,
    doublons,
    at: now,
  };
}
