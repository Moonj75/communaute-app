"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { clientAdmin } from "@/lib/supabase/admin";
import { appliquerChangement, type DemandeEmail } from "@/lib/changement-email";
import { deposer } from "@/lib/courrier";

export type RetourDemande = { ok: boolean; message: string };

/** An administrator validates (the address changes everywhere, a mail goes to the new address) or refuses. */
export async function traiterDemandeEmail(id: string, accepter: boolean, motif = ""): Promise<RetourDemande> {
  try {
    const { user, profil } = await getSessionProfil();
    if (profil?.role !== "admin" || !user?.email) return { ok: false, message: "Réservé aux administrateurs." };
    const db = clientAdmin();
    if (!db) return { ok: false, message: "Clé serveur Supabase absente." };
    const { data } = await db.from("demandes_email").select("*").eq("id", id).maybeSingle();
    const d = data as DemandeEmail | null;
    if (!d) return { ok: false, message: "Demande introuvable." };
    if (d.statut !== "en_attente") return { ok: false, message: "Cette demande est déjà traitée." };
    const qui = [profil.prenom, profil.nom].filter(Boolean).join(" ") || user.email;
    const fin = (statut: string, m: string | null) => db.from("demandes_email").update({ statut, traite_par: qui, traite_le: new Date().toISOString(), motif: m }).eq("id", id);

    if (!accepter) {
      const m = String(motif || "").trim().slice(0, 200) || null;
      await fin("refuse", m);
      try { await deposer(db, [d.ancien_email], { type: "notification", titre: "❌ Changement d'adresse e-mail refusé", texte: `Ta demande pour passer à ${d.nouvel_email} n'a pas été acceptée.${m ? ` Motif : ${m}` : ""}`, lien: "/profil" }); } catch { /* informative */ }
      revalidatePath("/admin", "layout");
      return { ok: true, message: "Demande refusée : le membre est prévenu." };
    }
    const prenom = (d.nom || "").split(" ")[0] || null;
    const r = await appliquerChangement(d, prenom);
    await fin("valide", null);
    revalidatePath("/admin", "layout");
    revalidatePath("/profil");
    const avert = [!r.mailOk ? "le mail n'a pas pu partir (Brevo)" : null, !r.notionOk ? "Notion n'a pas pu être mis à jour partout" : null].filter(Boolean).join(" ; ");
    return { ok: true, message: `✅ Adresse changée : ${d.ancien_email} → ${d.nouvel_email}.${r.mailOk ? " Un mail de connexion est parti à la nouvelle adresse." : ""}${avert ? ` ⚠️ Attention : ${avert}.` : ""}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Traitement impossible." };
  }
}
