"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { creerFiche, enregistrerFiche, lireCalendrier, NotionErreur, TAGS } from "@/lib/club";
import { avancement, CHAMPS, type Valeur } from "@/lib/logistique";

export type RetourFiche = { ok: boolean; message: string; statut?: string };

async function estAdmin() {
  const { profil } = await getSessionProfil();
  return profil?.role === "admin";
}

/** Creates the sheet of an event and opens it. */
export async function nouvelleFiche(fd: FormData) {
  if (!(await estAdmin())) redirect("/");
  const evId = String(fd.get("e") || "");
  const ev = (await lireCalendrier()).find((e) => e.id === evId);
  if (!ev) redirect("/staff/logistique");
  const id = await creerFiche(ev.id, ev.nom);
  revalidateTag(TAGS.calendrier);
  redirect(`/staff/logistique/${id}`);
}

/** Saves the sheet; « publier » only works when every field is filled or marked « not useful ». */
export async function sauverFiche(id: string, valeurs: Record<string, Valeur>, masques: string[], action: "brouillon" | "publier" | "depublier"): Promise<RetourFiche> {
  if (!(await estAdmin())) return { ok: false, message: "Réservé aux administrateurs." };
  const propres: Record<string, Valeur> = {};
  for (const c of CHAMPS) propres[c.cle] = valeurs[c.cle] ?? null;
  const m = masques.filter((x) => CHAMPS.some((c) => c.cle === x));
  const av = avancement(propres, m);
  if (action === "publier" && !av.complet) return { ok: false, message: `Il reste ${av.total - av.prets} champ(s) à remplir ou à marquer « Pas utile ».` };
  try {
    await enregistrerFiche(id, propres, m, action === "publier" ? "Prête" : action === "depublier" ? "Brouillon" : undefined);
    revalidateTag(TAGS.calendrier);
    revalidatePath("/staff/logistique");
    return {
      ok: true,
      statut: action === "publier" ? "Prête" : action === "depublier" ? "Brouillon" : undefined,
      message: action === "publier" ? "🚀 Fiche publiée : les joueurs la voient dans le calendrier." : action === "depublier" ? "Fiche repassée en brouillon (cachée aux joueurs)." : "💾 Enregistré dans Notion.",
    };
  } catch (e) {
    return { ok: false, message: e instanceof NotionErreur ? e.message : "Enregistrement impossible, réessaie." };
  }
}
