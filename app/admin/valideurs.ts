"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { majRolesNotion } from "@/lib/club";
import { ROLE_VALIDEUR, ROLES_VALIDEUR } from "@/lib/internes";

/** Gives or takes away the « ✅ Valideur » role: written in Notion (« Rôles ») and in the app at once. */
export async function basculerValideur(notionId: string, oui: boolean): Promise<{ ok: boolean; message: string; roles?: string[] }> {
  try {
    const { supabase, profil } = await getSessionProfil();
    if (profil?.role !== "admin") return { ok: false, message: "Réservé aux administrateurs." };
    const { data: j } = await supabase.from("joueurs").select("notion_id,roles").eq("notion_id", notionId).maybeSingle();
    if (!j) return { ok: false, message: "Membre introuvable." };
    const avant = ((j.roles as string[] | null) || []).filter((r) => !ROLES_VALIDEUR.includes(r));
    const roles = oui ? [...avant, ROLE_VALIDEUR] : avant;
    await majRolesNotion(notionId, roles);
    const { error } = await supabase.from("joueurs").update({ roles }).eq("notion_id", notionId);
    if (error) return { ok: false, message: "Enregistré dans Notion ; lance « Synchroniser » (" + error.message + ")." };
    revalidatePath("/admin", "layout");
    revalidatePath("/internes");
    return { ok: true, message: oui ? "✓ Valideur" : "✓ Retiré", roles };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Modification impossible." };
  }
}
