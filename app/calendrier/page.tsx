import { redirect } from "next/navigation";
import Header from "@/components/Header";
import VueCalendrier from "@/components/club/VueCalendrier";
import { displayName, getVue } from "@/lib/profil";
import { essayer, lireCalendrier, lireParticipations } from "@/lib/club";
import { chargerJoueurs } from "@/lib/donnees";

export const dynamic = "force-dynamic";

export default async function CalendrierPage({ searchParams }: { searchParams: Promise<{ m?: string; e?: string }> }) {
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const [cal, parts, famille] = await Promise.all([essayer(lireCalendrier), essayer(lireParticipations), chargerJoueurs(supabase, user.email)]);
  return (
    <>
      <Header subtitle="Calendrier des compétitions" profil={profil} name={displayName(profil, user.email)} apercu={apercu} />
      <main className="wrap">
        <VueCalendrier evs={cal.data || []} parts={parts.data || []} famille={famille} m={sp.m} e={sp.e} erreur={cal.erreur} />
      </main>
    </>
  );
}
