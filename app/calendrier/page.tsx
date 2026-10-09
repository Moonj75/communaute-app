import { redirect } from "next/navigation";
import Header from "@/components/Header";
import VueCalendrier from "@/components/club/VueCalendrier";
import { displayName, getVue, estInactif } from "@/lib/profil";
import { essayer, lireCalendrier, lireFiches, lireParticipations, nomsJoueurs } from "@/lib/club";
import { chargerJoueurs } from "@/lib/donnees";

export const dynamic = "force-dynamic";

export default async function CalendrierPage({ searchParams }: { searchParams: Promise<{ m?: string; e?: string }> }) {
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  // Members not active this season only see the discovery space (home page).
  if (estInactif(profil)) redirect("/#bloc-calendrier");
  const sp = await searchParams;
  const [cal, parts, famille, fiches, noms] = await Promise.all([essayer(lireCalendrier), essayer(lireParticipations), chargerJoueurs(supabase, user.email), essayer(lireFiches), essayer(nomsJoueurs)]);
  return (
    <>
      <Header subtitle="Calendrier des compétitions" profil={profil} name={displayName(profil, user.email)} apercu={apercu} />
      <main className="wrap">
        <VueCalendrier fiches={fiches.data || undefined} noms={noms.data || undefined} evs={cal.data || []} parts={parts.data || []} famille={famille} m={sp.m} e={sp.e} erreur={cal.erreur} />
      </main>
    </>
  );
}
