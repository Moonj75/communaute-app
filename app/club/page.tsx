import Header from "@/components/Header";
import VuePublique from "@/components/club/VuePublique";
import { essayer, lireCalendrier, lireClassementsClub, lireInfosPubliques, lireSeances } from "@/lib/club";
import { createClient } from "@/lib/supabase/server";
import { lireEugies } from "@/lib/classements-lire";

export const dynamic = "force-dynamic";
export const metadata = { title: "SC Lions d'Eugies · le club", description: "Le club de Subbuteo d'Eugies : infos, calendrier, entraînements." };

export default async function Club({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: u }, infos, cal, se, cl, eug] = await Promise.all([
    supabase.auth.getUser(),
    essayer(lireInfosPubliques),
    essayer(lireCalendrier),
    essayer(() => lireSeances(4)),
    essayer(lireClassementsClub),
    lireEugies(supabase),
  ]);
  return (
    <>
      <Header subtitle="Le club · saison 2026–2027" />
      <main className="wrap">
        <VuePublique infos={infos.data || []} evs={cal.data || []} seances={se.data || []} classements={cl.data || []} m={sp.m} connecte={Boolean(u.user)} eug={eug} />
      </main>
    </>
  );
}
