"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { envoyerPhotoNotion, retirerPhotoNotion } from "@/lib/notion";

export type RetourPhoto = { ok: boolean; message?: string };

const ID = /^[0-9a-f-]{32,36}$/i;

function expliquer(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("bucket not found") || m.includes("photo_path") || m.includes("definir_photo"))
    return "Les photos ne sont pas encore activées : un administrateur doit lancer le script « etape5-photos.sql » dans Supabase.";
  if (m.includes("photo_interdite") || m.includes("row-level security") || m.includes("unauthorized"))
    return "Tu ne peux changer que les photos de ta famille.";
  return "La photo n'a pas pu être enregistrée. Réessaie dans un instant.";
}

export async function envoyerPhoto(notionId: string, ancien: string | null, fd: FormData): Promise<RetourPhoto> {
  const { supabase, user } = await getSessionProfil();
  if (!user) return { ok: false, message: "Reconnecte-toi." };
  if (!ID.test(notionId)) return { ok: false, message: "Fiche inconnue." };
  const file = fd.get("photo");
  if (!(file instanceof File) || !file.size) return { ok: false, message: "Choisis une image." };
  if (file.size > 2 * 1024 * 1024) return { ok: false, message: "Image trop lourde (2 Mo maximum)." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { ok: false, message: "Format accepté : JPG, PNG ou WebP." };

  const path = `${notionId}/${Date.now()}.jpg`;
  const up = await supabase.storage.from("photos").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return { ok: false, message: expliquer(up.error.message) };
  const { error } = await supabase.rpc("definir_photo", { p_notion_id: notionId, p_path: path });
  if (error) {
    await supabase.storage.from("photos").remove([path]);
    return { ok: false, message: expliquer(error.message) };
  }
  if (ancien && ancien.startsWith(notionId + "/")) await supabase.storage.from("photos").remove([ancien]);

  // Copy into the Notion « Photo » column (not blocking: the app photo is already saved).
  let message: string | undefined;
  try {
    const nom = path.replace("/", "-");
    await envoyerPhotoNotion(notionId, file, nom);
    await supabase.rpc("definir_photo_notion", { p_notion_id: notionId, p_nom: nom });
  } catch {
    message = "Photo enregistrée ✓ (la copie dans Notion n'a pas pu être faite, elle se fera plus tard).";
  }
  revalidatePath("/fiche");
  return { ok: true, message };
}

export async function retirerPhoto(notionId: string, ancien: string | null): Promise<RetourPhoto> {
  const { supabase, user } = await getSessionProfil();
  if (!user) return { ok: false, message: "Reconnecte-toi." };
  if (!ID.test(notionId)) return { ok: false, message: "Fiche inconnue." };
  const { error } = await supabase.rpc("definir_photo", { p_notion_id: notionId, p_path: null });
  if (error) return { ok: false, message: expliquer(error.message) };
  if (ancien && ancien.startsWith(notionId + "/")) await supabase.storage.from("photos").remove([ancien]);
  try {
    await retirerPhotoNotion(notionId);
    await supabase.rpc("definir_photo_notion", { p_notion_id: notionId, p_nom: null });
  } catch {
    /* Notion will be cleaned at the next sync */
  }
  revalidatePath("/fiche");
  return { ok: true };
}
