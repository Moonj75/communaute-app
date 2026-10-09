"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { creerTache, modifierTache, TAGS } from "@/lib/club";
import { PRIORITES } from "@/lib/club-types";

export type Retour = { ok: boolean; message?: string };

async function exigerAdmin() {
  const { profil } = await getSessionProfil();
  if (profil?.role !== "admin") throw new Error("Réservé aux administrateurs.");
}

function erreur(e: unknown): Retour {
  return { ok: false, message: e instanceof Error ? e.message : "Erreur inconnue." };
}

export async function rafraichir(): Promise<Retour> {
  try {
    await exigerAdmin();
    Object.values(TAGS).forEach((t) => revalidateTag(t));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return erreur(e);
  }
}

export async function changerStatut(id: string, statut: string): Promise<Retour> {
  try {
    await exigerAdmin();
    await modifierTache(id, { statut });
    revalidateTag(TAGS.taches);
    return { ok: true };
  } catch (e) {
    return erreur(e);
  }
}

export async function changerEcheance(id: string, echeance: string | null): Promise<Retour> {
  try {
    await exigerAdmin();
    if (echeance && !/^\d{4}-\d{2}-\d{2}$/.test(echeance)) return { ok: false, message: "Date invalide." };
    await modifierTache(id, { echeance });
    revalidateTag(TAGS.taches);
    return { ok: true };
  } catch (e) {
    return erreur(e);
  }
}

export async function ajouterTache(_prev: Retour | null, fd: FormData): Promise<Retour> {
  try {
    await exigerAdmin();
    const titre = String(fd.get("titre") || "").trim().slice(0, 200);
    if (!titre) return { ok: false, message: "Donne un titre à la tâche." };
    const echeance = String(fd.get("echeance") || "") || null;
    if (echeance && !/^\d{4}-\d{2}-\d{2}$/.test(echeance)) return { ok: false, message: "Date invalide." };
    const p = String(fd.get("priorite") || "Normal");
    const rappel = fd.get("rappel") === "on";
    const ev = String(fd.get("evenement") || "") || null;
    await creerTache({
      titre,
      echeance,
      priorite: PRIORITES.includes(p) ? p : "Normal",
      type: rappel ? "⏰ Rappel" : null,
      evenementId: ev && /^[0-9a-f-]{32,36}$/i.test(ev) ? ev : null,
    });
    revalidateTag(TAGS.taches);
    return { ok: true, message: rappel ? "Rappel ajouté dans Notion ✓" : "Tâche ajoutée dans Notion ✓" };
  } catch (e) {
    return erreur(e);
  }
}
