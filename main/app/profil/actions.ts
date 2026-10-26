"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { clientAdmin } from "@/lib/supabase/admin";
import { majCoordonneesNotion } from "@/lib/club";
import { categorieFinale } from "@/lib/categories";

export type Coordonnees = { telephone: string; naissance: string; adresse: string; codePostal: string; ville: string; nationalite: string };
export type RetourProfil = { ok: boolean; message: string; categorie?: string | null };

const net = (v: unknown, max = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max) || null;

/** A member updates his contact details (or those of a person of his family): written in Notion and in the app. */
export async function enregistrerCoordonnees(notionId: string, c: Coordonnees): Promise<RetourProfil> {
  try {
    const { user, profil } = await getSessionProfil();
    if (!user?.email) return { ok: false, message: "Reconnecte-toi." };
    const db = clientAdmin();
    if (!db) return { ok: false, message: "Enregistrement impossible pour l'instant (clé serveur absente)." };
    const { data: f } = await db.from("joueurs").select("notion_id,email,categorie").eq("notion_id", notionId).maybeSingle();
    if (!f) return { ok: false, message: "Fiche introuvable." };
    if ((f.email || "").toLowerCase() !== user.email.toLowerCase() && profil?.role !== "admin") return { ok: false, message: "Tu ne peux modifier que tes propres coordonnées." };

    const telephone = net(c.telephone, 30);
    if (telephone && !/^[+\d][\d\s./()-]{5,}$/.test(telephone)) return { ok: false, message: "Numéro de téléphone invalide (ex. +32 470 12 34 56)." };
    const naissance = net(c.naissance, 10);
    if (naissance) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(naissance) || naissance < "1900-01-01" || naissance > new Date().toISOString().slice(0, 10)) return { ok: false, message: "Date de naissance invalide." };
    }
    const coord = { telephone, naissance, adresse: net(c.adresse), codePostal: net(c.codePostal, 12), ville: net(c.ville, 80), nationalite: net(c.nationalite, 60) };
    const categorie = categorieFinale(f.categorie as string | null, naissance);

    await majCoordonneesNotion(notionId, { ...coord, categorie: categorie && categorie !== f.categorie ? categorie : null });
    const { error } = await db.from("joueurs").update({ telephone, date_naissance: naissance, adresse: coord.adresse, code_postal: coord.codePostal, ville: coord.ville, nationalite: coord.nationalite, categorie }).eq("notion_id", notionId);
    if (error) {
      return /date_naissance|adresse|code_postal|ville|nationalite/.test(error.message)
        ? { ok: true, message: "✓ Enregistré dans la liste du club. (Un administrateur doit lancer le script « etape18-profil » pour l'afficher ici.)", categorie }
        : { ok: false, message: error.message };
    }
    revalidatePath("/profil");
    revalidatePath("/fiche");
    return { ok: true, message: "✓ Coordonnées enregistrées.", categorie };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
}
