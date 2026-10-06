"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { lireJoueurs, type JoueurNotion } from "@/lib/notion";

export type SyncState = {
  ok?: boolean;
  error?: string;
  personnes?: number;
  comptes?: number;
  familles?: string[];
  inactifs?: number;
  sansEmail?: string[];
  at?: string;
};

/**
 * Copies the Notion « Liste des joueurs » into the app (admin only).
 * - every person becomes a row of `joueurs` (one fiche per person);
 * - people sharing one e-mail form a family account: one row in `membres`,
 *   named after the person ticked « Titulaire du compte » in Notion.
 */
export async function synchroniserNotion(): Promise<SyncState> {
  const { supabase, profil } = await getSessionProfil();
  if (profil?.role !== "admin") return { error: "Action réservée aux administrateurs." };

  let liste: JoueurNotion[];
  try {
    liste = await lireJoueurs();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Lecture de Notion impossible." };
  }
  const now = new Date().toISOString();

  // 1. One fiche per person.
  const fiches = liste.map((j) => ({
    notion_id: j.notionId,
    email: j.email,
    nom: j.nom,
    prenom: j.prenom,
    actif: j.actif,
    titulaire: j.titulaire,
    roles: j.roles,
    cagnotte: j.cagnotte,
    telephone: j.telephone,
    vehicule: j.vehicule,
    categorie: j.categorie,
    serie: j.serie,
    synced_at: now,
  }));
  const { error: e1 } = await supabase.from("joueurs").upsert(fiches, { onConflict: "notion_id" });
  if (e1) return { error: "Enregistrement des fiches impossible : " + e1.message };
  // Fiches removed from Notion disappear from the app too.
  const ids = fiches.map((f) => f.notion_id);
  if (ids.length) {
    await supabase.from("joueurs").delete().not("notion_id", "in", `(${ids.map((i) => `"${i}"`).join(",")})`);
  }

  // 2. One login account per e-mail (family = several fiches).
  const parEmail = new Map<string, JoueurNotion[]>();
  for (const j of liste) if (j.email) parEmail.set(j.email, [...(parEmail.get(j.email) || []), j]);
  const familles: string[] = [];
  const comptes = [...parEmail.entries()].map(([email, gens]) => {
    const titulaire = gens.find((g) => g.titulaire) || gens.find((g) => g.actif) || gens[0];
    if (gens.length > 1) familles.push(`${titulaire.nomComplet} (+ ${gens.filter((g) => g !== titulaire).map((g) => g.prenom || g.nomComplet).join(", ")})`);
    const isMe = email === profil.email;
    return {
      email,
      nom: titulaire.nom,
      prenom: titulaire.prenom,
      role: gens.some((g) => g.admin) || isMe ? "admin" : "joueur",
      actif: gens.some((g) => g.actif) || isMe,
      notion_id: titulaire.notionId,
      synced_at: now,
    };
  });
  if (comptes.length) {
    const { error: e2 } = await supabase.from("membres").upsert(comptes, { onConflict: "email" });
    if (e2) return { error: "Enregistrement des comptes impossible : " + e2.message };
  }

  revalidatePath("/admin");
  revalidatePath("/fiche");
  return {
    ok: true,
    personnes: fiches.length,
    comptes: comptes.length,
    familles,
    inactifs: comptes.filter((c) => !c.actif).length,
    sansEmail: liste.filter((j) => !j.email && j.actif).map((j) => j.nomComplet),
    at: now,
  };
}
