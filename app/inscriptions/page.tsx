// 🏁 PAGE MES INSCRIPTIONS : ce fichier va dans le dossier « app/inscriptions » (github.com/Moonj75/communaute-app/upload/main/app/inscriptions).
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import VueInscriptions from "@/components/club/VueInscriptions";
import { displayName, getVue, estInactif } from "@/lib/profil";
import { essayer, lireCalendrier, lireParticipations } from "@/lib/club";
import { chargerJoueurs } from "@/lib/donnees";
import { lireEligibles } from "@/lib/eligibles";
import { competiteur } from "@/lib/club-types";

export const dynamic = "force-dynamic";

export default async function InscriptionsPage() {
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  // Members not active this season only see the discovery space (home page).
  if (estInactif(profil)) redirect("/");
  const [cal, parts, famille, elig] = await Promise.all([essayer(lireCalendrier), essayer(lireParticipations), chargerJoueurs(supabase, user.email), lireEligibles(supabase)]);
  return (
    <>
      <Header subtitle="Mes inscriptions" profil={profil} name={displayName(profil, user.email)} apercu={apercu} />
      <main className="wrap">
        {famille.length && !famille.some(competiteur) ? (
          <div className="notice">Tu ne joues pas de compétition cette saison (statut « sans compétitions officielles » ou fonction au club sans jouer) : tu n&apos;as aucun formulaire de compétition à remplir. Tout le reste de l&apos;appli reste ouvert pour toi.</div>
        ) : (
          <VueInscriptions evs={cal.data || []} parts={parts.data || []} famille={famille.filter(competiteur)} erreur={cal.erreur || parts.erreur} elig={elig} />
        )}
      </main>
    </>
  );
}
