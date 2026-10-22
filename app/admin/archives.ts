"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { majArchiveNotion } from "@/lib/club";

/**
 * Archives a former member (or brings him back): « Archivé » in Notion and in the app.
 * When every fiche of an e-mail is archived, its login account is archived too (no more access).
 */
export async function basculerArchive(notionId: string, oui: boolean): Promise<{ ok: boolean; message: string }> {
  try {
    const { supabase, profil } = await getSessionProfil();
    if (profil?.role !== "admin") return { ok: false, message: "Réservé aux administrateurs." };
    const { data: j } = await supabase.from("joueurs").select("notion_id,email,prenom,nom").eq("notion_id", notionId).maybeSingle();
    if (!j) return { ok: false, message: "Membre introuvable." };
    const email = ((j.email as string | null) || "").toLowerCase();
    if (oui && email) {
      if (email === profil.email) return { ok: false, message: "Tu ne peux pas t'archiver toi-même." };
      const { data: sa } = await supabase.from("super_admins").select("email").eq("email", email).maybeSingle();
      if (sa) return { ok: false, message: "Le super administrateur ne peut pas être archivé." };
    }
    await majArchiveNotion(notionId, oui);
    const { error } = await supabase.from("joueurs").update({ archive: oui }).eq("notion_id", notionId);
    if (error) return { ok: false, message: /archive/.test(error.message) ? "Lance d'abord le script Supabase « etape16-archives »." : error.message };
    // The login account follows: archived only when all the fiches of this e-mail are archived.
    if (email) {
      const { data: fam } = await supabase.from("joueurs").select("archive").eq("email", email);
      const tous = ((fam || []) as { archive: boolean }[]).every((x) => x.archive);
      await supabase.from("membres").update({ archive: tous }).eq("email", email);
    }
    revalidatePath("/admin");
    const qui = [j.prenom, j.nom].filter(Boolean).join(" ");
    return { ok: true, message: oui ? `🗄️ ${qui} est archivé.` : `↩️ ${qui} est de retour dans les listes.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Modification impossible." };
  }
}
