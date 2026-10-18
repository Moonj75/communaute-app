"use server";

import { createClient } from "@/lib/supabase/server";
import { clientAdmin } from "@/lib/supabase/admin";

export type EtatContact = { ok?: boolean; message?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const net = (v: FormDataEntryValue | null, max: number) => String(v || "").trim().slice(0, max);

/** A visitor's contact request: stored for the staff (Joueurs & accès → Contacts). */
export async function envoyerContact(_p: EtatContact, fd: FormData): Promise<EtatContact> {
  // Hidden field: only robots fill it.
  if (net(fd.get("site"), 100)) return { ok: true, message: "Merci ! Ton message est bien arrivé." };
  const prenom = net(fd.get("prenom"), 80);
  const email = net(fd.get("email"), 160).toLowerCase();
  if (!prenom) return { ok: false, message: "Indique ton prénom." };
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Cette adresse e-mail ne semble pas valide." };
  const ligne = {
    prenom,
    nom: net(fd.get("nom"), 80) || null,
    email,
    telephone: net(fd.get("telephone"), 40) || null,
    decouverte: [net(fd.get("decouverte_choix"), 80), net(fd.get("decouverte"), 900)].filter(Boolean).join(" · ") || null,
    message: net(fd.get("message"), 3000) || null,
  };
  // Against floods of robots: at most 3 requests per address per day, and 20 per hour for the whole site.
  const admin = clientAdmin();
  if (admin) {
    const jour = new Date(Date.now() - 864e5).toISOString();
    const heure = new Date(Date.now() - 36e5).toISOString();
    const [parAdresse, total] = await Promise.all([
      admin.from("contacts").select("id", { count: "exact", head: true }).eq("email", email).gte("cree_le", jour),
      admin.from("contacts").select("id", { count: "exact", head: true }).gte("cree_le", heure),
    ]);
    if ((parAdresse.count || 0) >= 3) return { ok: true, message: `Merci ${prenom} ! Nous avons déjà tes messages : un membre du club te répond très vite.` };
    if ((total.count || 0) >= 20) return { ok: false, message: "Beaucoup de messages en ce moment : réessaie dans une heure." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").insert(ligne);
  if (error) return { ok: false, message: "L'envoi n'a pas marché. Réessaie dans un instant." };
  return { ok: true, message: `Merci ${prenom} ! Ton message est bien arrivé : un membre du club te répond très vite.` };
}
