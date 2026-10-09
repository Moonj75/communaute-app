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
  photos?: number;
  avertissement?: string;
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
  const complets = fiches.map((f, i) => ({
    ...f,
    classement_belge: liste[i].classementBelge,
    classement_international: liste[i].classementInternational,
    palmares: liste[i].palmares,
  }));
  let avertissement: string | undefined;
  let { error: e1 } = await supabase.from("joueurs").upsert(complets, { onConflict: "notion_id" });
  if (e1 && /classement|palmares|column/i.test(e1.message)) {
    avertissement = "Classements et palmarès pas encore copiés : lancez le script « etape6-fiche-notifications.sql » dans Supabase.";
    ({ error: e1 } = await supabase.from("joueurs").upsert(fiches, { onConflict: "notion_id" }));
  }
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

  // 3. Photos added or changed directly in Notion → copied into the app.
  let photos = 0;
  if (!avertissement) {
    const { data: etat } = await supabase.from("joueurs").select("notion_id,photo_path,photo_notion");
    const connus = new Map(((etat || []) as { notion_id: string; photo_path: string | null; photo_notion: string | null }[]).map((r) => [r.notion_id, r]));
    for (const j of liste) {
      if (photos >= 12) break; // keep the sync quick; the rest comes next time
      const r = connus.get(j.notionId);
      if (!r) continue;
      try {
        if (j.photo && j.photo.nom !== r.photo_notion) {
          const img = await fetch(j.photo.url, { cache: "no-store" });
          if (!img.ok) continue;
          const blob = await img.blob();
          if (blob.size > 2 * 1024 * 1024) continue;
          const path = `${j.notionId}/${Date.now()}.jpg`;
          const up = await supabase.storage.from("photos").upload(path, blob, { contentType: blob.type || "image/jpeg" });
          if (up.error) continue;
          await supabase.from("joueurs").update({ photo_path: path, photo_notion: j.photo.nom }).eq("notion_id", j.notionId);
          if (r.photo_path) await supabase.storage.from("photos").remove([r.photo_path]);
          photos++;
        } else if (!j.photo && r.photo_notion) {
          // Photo removed in Notion → removed in the app too.
          await supabase.from("joueurs").update({ photo_path: null, photo_notion: null }).eq("notion_id", j.notionId);
          if (r.photo_path) await supabase.storage.from("photos").remove([r.photo_path]);
          photos++;
        }
      } catch {
        /* one bad picture must not stop the sync */
      }
    }
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
    photos,
    avertissement,
  };
}
