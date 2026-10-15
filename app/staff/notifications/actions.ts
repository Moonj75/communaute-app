"use server";

import { getSessionProfil } from "@/lib/profil";
import { pousser, type Abonnement } from "@/lib/push";
import { lireCalendrier, lireParticipations } from "@/lib/club";
import { chargerJoueurs } from "@/lib/donnees";
import { comptesActifs, inscritsOui, sansReponse } from "@/lib/audiences";
import { lireEligibles } from "@/lib/eligibles";
import { deposer } from "@/lib/courrier";
import { pushPret } from "@/lib/push";

export type RetourEnvoi = { ok: boolean; message: string };

export async function envoyerManuel(_prev: RetourEnvoi | null, fd: FormData): Promise<RetourEnvoi> {
  const { supabase, profil } = await getSessionProfil();
  if (profil?.role !== "admin") return { ok: false, message: "Réservé aux administrateurs." };
  const titre = String(fd.get("titre") || "").trim().slice(0, 80);
  const corps = String(fd.get("message") || "").trim().slice(0, 240);
  const cible = String(fd.get("cible") || "tous");
  if (!titre) return { ok: false, message: "Donne un titre à la notification." };

  try {
    const joueurs = await chargerJoueurs(supabase);
    let emails = new Set<string>();
    let url = "/";
    if (cible === "tous") emails = comptesActifs(joueurs);
    else if (cible === "staff") {
      const { data } = await supabase.from("membres").select("email").eq("role", "admin").eq("actif", true);
      emails = new Set(((data || []) as { email: string }[]).map((m) => m.email));
    } else if (cible.startsWith("attente:") || cible.startsWith("oui:")) {
      const id = cible.split(":")[1];
      const [evs, parts] = await Promise.all([lireCalendrier(), lireParticipations()]);
      const ev = evs.find((e) => e.id === id);
      if (!ev) return { ok: false, message: "Évènement introuvable." };
      emails = cible.startsWith("attente:") ? sansReponse(ev, evs, parts, joueurs, await lireEligibles(supabase)) : inscritsOui(ev, evs, parts, joueurs);
      url = cible.startsWith("attente:") ? "/inscriptions" : `/calendrier?e=${ev.id}`;
    }
    if (!emails.size) return { ok: false, message: "Personne ne correspond à ce choix." };
    // Always a copy in each person's Courrier (relance when it targets missing answers).
    const deposes = await deposer(supabase, emails, { type: cible.startsWith("attente:") ? "relance" : "notification", titre, texte: corps, lien: url });
    if (!pushPret()) return { ok: deposes > 0, message: deposes ? `Déposée ✓ dans le courrier de ${deposes} personne(s) (notifications téléphone pas encore configurées).` : "Envoi impossible." };
    const { data: subs } = await supabase.from("push_abonnements").select("endpoint,email,p256dh,auth");
    const r = await pousser(supabase, (subs || []) as Abonnement[], emails, { title: titre, body: corps, url, tag: `manuel-${Date.now()}` });
    const sans = emails.size - r.personnes;
    return {
      ok: r.envoyes > 0 || deposes > 0,
      message:
        r.envoyes > 0
          ? `Envoyée ✓ à ${r.personnes} personne(s) sur ${r.envoyes} appareil(s), et déposée dans le courrier de ${deposes}.${sans > 0 ? ` ${sans} personne(s) la liront dans leur courrier (notifications pas activées).` : ""}`
          : `Déposée ✓ dans le courrier de ${deposes} personne(s). Aucune n'a encore activé les notifications sur son téléphone.`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Envoi impossible." };
  }
}
