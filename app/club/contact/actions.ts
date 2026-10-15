"use server";

import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").insert(ligne);
  if (error) return { ok: false, message: "L'envoi n'a pas marché. Réessaie dans un instant." };
  return { ok: true, message: `Merci ${prenom} ! Ton message est bien arrivé : un membre du club te répond très vite.` };
}
