import { redirect } from "next/navigation";
import Header from "@/components/Header";
import VueTableauBord from "@/components/club/VueTableauBord";
import Rafraichir from "@/components/club/Rafraichir";
import { displayName, getSessionProfil } from "@/lib/profil";
import { essayer, lireCalendrier, lireFiches, lireParticipations, nomsJoueurs } from "@/lib/club";
import { chargerJoueurs } from "@/lib/donnees";
import { rafraichir } from "../actions";

export const dynamic = "force-dynamic";

export default async function TableauBordPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { supabase, user, profil } = await getSessionProfil();
  if (!user) redirect("/login");
  if (profil?.role !== "admin") redirect("/");
  const sp = await searchParams;
  const [cal, parts, joueurs, fiches, noms] = await Promise.all([essayer(lireCalendrier), essayer(lireParticipations), chargerJoueurs(supabase), essayer(lireFiches), essayer(nomsJoueurs)]);
  return (
    <>
      <Header subtitle="Staff · tableau de bord" profil={profil} name={displayName(profil, user.email)} />
      <main className="wrap">
        <VueTableauBord
          evs={cal.data || []}
          parts={parts.data || []}
          joueurs={joueurs}
          fiches={fiches.data || undefined}
          noms={noms.data || undefined}
          e={sp.e}
          erreur={cal.erreur || parts.erreur}
          rafraichir={<Rafraichir action={rafraichir} />}
        />
      </main>
    </>
  );
}
