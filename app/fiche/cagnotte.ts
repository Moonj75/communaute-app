"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { arrondi, euro } from "@/lib/cagnotte";
import { journaliser } from "@/lib/cagnotte-db";
import { clientAdmin } from "@/lib/supabase/admin";
import type { Mouvement } from "@/lib/cagnotte";

/**
 * A player asks to use his kitty (trip, accommodation, entry fee…): the request waits for a validation
 * by the staff (Admin → Cagnottes → À valider). Nothing is taken before.
 */
export async function demanderDepense(p: { joueurId: string; categorie: string; montant: string; libelle: string; date: string; evenement?: { id: string; nom: string } | null }): Promise<{ ok: boolean; message: string }> {
  try {
    const { supabase, user } = await getSessionProfil();
    if (!user?.email) return { ok: false, message: "Reconnecte-toi." };
    const { data: fiche } = await supabase.from("joueurs").select("notion_id,cagnotte_groupe").eq("notion_id", p.joueurId).eq("email", user.email.toLowerCase()).maybeSingle();
    if (!fiche) return { ok: false, message: "Cette fiche ne fait pas partie de ton compte." };
    const n = Number(String(p.montant || "").replace(/[€\s]/g, "").replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || n > 10000) return { ok: false, message: "Indique un montant (ex. 35,00)." };
    const categorie = String(p.categorie || "Autre dépense").slice(0, 60);
    const libelle = String(p.libelle || "").trim().slice(0, 120);
    if (!libelle) return { ok: false, message: "Dis en un mot à quoi ça sert (ex. Open de Paris)." };
    const date = /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.from("cag_mouvements").insert({ joueur_id: p.joueurId, sens: "depense", categorie, montant: arrondi(n), libelle, statut: "en_attente", demande_par: user.email.toLowerCase(), date, ...(p.evenement?.id ? { evenement_id: String(p.evenement.id).slice(0, 80), evenement: String(p.evenement.nom || "").slice(0, 120) } : {}) }).select("*").single();
    if (error) return { ok: false, message: /cag_mouvements|schema cache/.test(error.message) ? "La cagnotte détaillée n'est pas encore installée." : error.message };
    // Copy in the Notion journal (with the server key when available: the player cannot write there).
    const db = clientAdmin();
    if (db) await journaliser(db, data as Mouvement, (fiche.cagnotte_groupe as string | null) || null);
    revalidatePath("/fiche");
    revalidatePath("/admin");
    return { ok: true, message: `⏳ Demande envoyée (${euro.format(arrondi(n))}) : elle sera déduite dès qu'un responsable l'aura validée.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Envoi impossible." };
  }
}
