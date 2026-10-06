import { redirect } from "next/navigation";
import Header from "@/components/Header";
import VueInscriptions from "@/components/club/VueInscriptions";
import { displayName, getVue } from "@/lib/profil";
import { essayer, lireCalendrier, lireParticipations } from "@/lib/club";
import { chargerJoueurs } from "@/lib/donnees";

export const dynamic = "force-dynamic";

export default async function InscriptionsPage() {
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const [cal, parts, famille] = await Promise.all([essayer(lireCalendrier), essayer(lireParticipations), chargerJoueurs(supabase, user.email)]);
  return (
    <>
      <Header subtitle="Mes inscriptions" profil={profil} name={displayName(profil, user.email)} apercu={apercu} />
      <main className="wrap">
        <VueInscriptions evs={cal.data || []} parts={parts.data || []} famille={famille.filter((j) => j.actif)} erreur={cal.erreur || parts.erreur} />
      </main>
    </>
  );
}
