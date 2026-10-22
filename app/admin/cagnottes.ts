"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { majCagnotteNotion } from "@/lib/club";

export type RetourCagnotte = { ok: boolean; message: string; montant?: number | null };

/**
 * The staff types a player's « cagnotte » in the app (« 12,50 », « 12.5 », « 12 € »…):
 * it is written in Notion (the reference) and in the app at once.
 */
export async function enregistrerCagnotte(notionId: string, texte: string): Promise<RetourCagnotte> {
  try {
    const { supabase, profil } = await getSessionProfil();
    if (profil?.role !== "admin") return { ok: false, message: "Réservé aux administrateurs." };
    const brut = String(texte || "").replace(/[€\s]/g, "").replace(",", ".");
    let montant: number | null = null;
    if (brut !== "") {
      const n = Number(brut);
      if (!Number.isFinite(n)) return { ok: false, message: "Montant invalide (ex. 12,50)." };
      if (Math.abs(n) > 100000) return { ok: false, message: "Montant trop grand." };
      montant = Math.round(n * 100) / 100;
    }
    const { data: j } = await supabase.from("joueurs").select("notion_id").eq("notion_id", notionId).maybeSingle();
    if (!j) return { ok: false, message: "Joueur introuvable." };
    // 1. Notion first (the reference); 2. the copy in the app.
    await majCagnotteNotion(notionId, montant);
    const { error } = await supabase.from("joueurs").update({ cagnotte: montant }).eq("notion_id", notionId);
    if (error) return { ok: false, message: "Enregistré dans Notion, mais pas encore dans l'appli (" + error.message + ") : lance « Synchroniser »." };
    revalidatePath("/admin");
    revalidatePath("/fiche");
    revalidatePath("/");
    return { ok: true, message: "✓ Enregistré", montant };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
}
