"use server";

import { revalidateTag } from "next/cache";
import { estInactif, getVue } from "@/lib/profil";
import { enregistrerReponse, lireCalendrier, lireParticipations, NotionErreur, TAGS } from "@/lib/club";
import { chargerJoueurs } from "@/lib/donnees";
import { indexReponses, libelleTally, modifiable } from "@/lib/club-types";

export type RetourReponse = { ok: boolean; message?: string; statut?: string; definitif?: boolean };

const CHOIX = {
  statut: ["Oui", "Non", "Peut-être"],
  jours: ["Samedi uniquement", "Dimanche uniquement", "Les deux jours"],
  oui_non: ["Oui", "Non"],
  depart: ["Vendredi matin", "Vendredi après-midi", "Vendredi soir"],
  retour: ["Dimanche soir", "Lundi matin", "Lundi soir"],
};
const parmi = (v: FormDataEntryValue | null, l: string[]) => (typeof v === "string" && l.includes(v) ? v : null);

export async function envoyerReponse(_p: RetourReponse | null, fd: FormData): Promise<RetourReponse> {
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) return { ok: false, message: "Reconnecte-toi." };
  if (estInactif(profil)) return { ok: false, message: "Ton compte n'est pas actif cette saison : contacte le staff pour t'inscrire." };
  if (apercu) return { ok: false, message: "Mode aperçu : la réponse n'est pas envoyée (tu vois la page comme le joueur)." };
  const evId = String(fd.get("e") || "");
  const jId = String(fd.get("j") || "");
  const statut = parmi(fd.get("statut"), CHOIX.statut) as "Oui" | "Non" | "Peut-être" | null;
  if (!statut) return { ok: false, message: "Choisis Oui, Non ou Peut-être." };

  const admin = profil?.role === "admin";
  const famille = await chargerJoueurs(supabase, admin ? null : user.email);
  const joueur = famille.find((j) => j.notionId === jId);
  if (!joueur) return { ok: false, message: "Ce joueur ne fait pas partie de ton compte." };

  try {
    const [evs, parts] = await Promise.all([lireCalendrier(), lireParticipations()]);
    const ev = evs.find((e) => e.id === evId);
    if (!ev) return { ok: false, message: "Évènement introuvable." };
    const existant = indexReponses(parts, evs, famille).get(ev.id)?.get(joueur.notionId);
    if (existant?.valide && !admin) return { ok: false, message: "Ta réponse est déjà validée définitivement : elle ne peut plus être modifiée." };
    if (!modifiable(ev, existant) && !admin) return { ok: false, message: "Les réponses sont closes pour cet évènement." };
    const definitif = fd.get("definitif") === "1";
    if (definitif && statut === "Peut-être") return { ok: false, message: "Pour valider définitivement, choisis Oui ou Non." };
    await enregistrerReponse({
      participationId: existant?.id || null,
      joueurId: joueur.notionId,
      joueurNom: joueur.nom,
      evenementId: ev.id,
      libelleEvenement: libelleTally(ev),
      statut,
      jours: parmi(fd.get("jours"), CHOIX.jours),
      restrictions: parmi(fd.get("restrictions"), CHOIX.oui_non) as "Oui" | "Non" | null,
      depart: parmi(fd.get("depart"), CHOIX.depart),
      retour: parmi(fd.get("retour"), CHOIX.retour),
      vehicule: parmi(fd.get("vehicule"), CHOIX.oui_non) as "Oui" | "Non" | null,
      definitif,
    });
    revalidateTag(TAGS.participations);
    return { ok: true, statut, definitif };
  } catch (e) {
    return { ok: false, message: e instanceof NotionErreur ? e.message : "L'envoi n'a pas fonctionné, réessaie dans un instant." };
  }
}
