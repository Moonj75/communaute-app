"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { clientAdmin } from "@/lib/supabase/admin";
import { emailValide } from "@/lib/changement-email";

export type RetourEmail = { ok: boolean; message: string };
const expliquer = (m: string) => (/demandes_email|does not exist|schema cache/.test(m) ? "Le changement d'adresse n'est pas encore installé : un administrateur doit lancer le script « etape19-changement-email »." : m);

/** The member asks to change the e-mail of his account: waits for an administrator. */
export async function demanderChangementEmail(nouvel: string): Promise<RetourEmail> {
  try {
    const { user, profil } = await getSessionProfil();
    if (!user?.email) return { ok: false, message: "Reconnecte-toi." };
    const a = user.email.toLowerCase();
    const n = String(nouvel || "").trim().toLowerCase();
    if (!emailValide(n)) return { ok: false, message: "Adresse e-mail invalide." };
    if (n === a) return { ok: false, message: "C'est déjà ton adresse actuelle." };
    const db = clientAdmin();
    if (!db) return { ok: false, message: "Impossible pour l'instant (clé serveur absente)." };
    const { data: pris } = await db.from("membres").select("email").eq("email", n).maybeSingle();
    if (pris) return { ok: false, message: "Cette adresse est déjà utilisée par un autre compte du club." };
    // One request at a time: a previous waiting one is replaced.
    const { error: e0 } = await db.from("demandes_email").update({ statut: "annule", traite_le: new Date().toISOString(), motif: "Remplacée par une nouvelle demande" }).eq("ancien_email", a).eq("statut", "en_attente");
    if (e0) return { ok: false, message: expliquer(e0.message) };
    const nom = [profil?.prenom, profil?.nom].filter(Boolean).join(" ") || null;
    const { error } = await db.from("demandes_email").insert({ ancien_email: a, nouvel_email: n, nom });
    if (error) return { ok: false, message: expliquer(error.message) };
    revalidatePath("/profil");
    revalidatePath("/admin", "layout");
    return { ok: true, message: "⏳ Demande envoyée. Un administrateur va la valider ; tu recevras alors un mail à ta nouvelle adresse." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? expliquer(e.message) : "Demande impossible." };
  }
}

/** The member cancels his waiting request. */
export async function annulerDemandeEmail(id: string): Promise<RetourEmail> {
  const { user } = await getSessionProfil();
  if (!user?.email) return { ok: false, message: "Reconnecte-toi." };
  const db = clientAdmin();
  if (!db) return { ok: false, message: "Impossible pour l'instant." };
  await db.from("demandes_email").update({ statut: "annule", traite_le: new Date().toISOString(), motif: "Annulée par le membre" }).eq("id", id).eq("ancien_email", user.email.toLowerCase()).eq("statut", "en_attente");
  revalidatePath("/profil");
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Demande annulée." };
}
