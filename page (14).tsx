import { redirect } from "next/navigation";
import Header from "@/components/Header";
import VuePlanning from "@/components/club/VuePlanning";
import Rafraichir from "@/components/club/Rafraichir";
import { displayName, getSessionProfil } from "@/lib/profil";
import { essayer, lireCalendrier, lireTaches } from "@/lib/club";
import { chargerJoueurs } from "@/lib/donnees";
import { rafraichir } from "../actions";

export const dynamic = "force-dynamic";

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ m?: string; e?: string }> }) {
  const { supabase, user, profil } = await getSessionProfil();
  if (!user) redirect("/login");
  if (profil?.role !== "admin") redirect("/");
  const sp = await searchParams;
  const [cal, taches, joueurs] = await Promise.all([essayer(lireCalendrier), essayer(lireTaches), chargerJoueurs(supabase)]);
  return (
    <>
      <Header subtitle="Staff · planning" profil={profil} name={displayName(profil, user.email)} />
      <main className="wrap">
        <VuePlanning
          evs={cal.data || []}
          taches={taches.data || []}
          joueurs={joueurs}
          m={sp.m}
          e={sp.e}
          erreur={cal.erreur || taches.erreur}
          rafraichir={<Rafraichir action={rafraichir} />}
        />
      </main>
    </>
  );
}
