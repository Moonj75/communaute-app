import { redirect } from "next/navigation";
import Header from "@/components/Header";
import VueAccueil, { type Gens } from "@/components/club/VueAccueil";
import { displayName, estInactif, getVue } from "@/lib/profil";
import VueDecouverte from "@/components/club/VueDecouverte";
import { prochainesCompetitions } from "@/lib/notion";
import { lireClubs, lireEugies } from "@/lib/classements-lire";
import { lireInfosPubliques } from "@/lib/club";
import { essayer, lireCalendrier, lireClassementsClub, lireResultats, lireSeances, nomsJoueurs } from "@/lib/club";

export const dynamic = "force-dynamic";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("fr-BE", { hour: "numeric", hour12: false, timeZone: "Europe/Brussels" }).format(new Date()));
  return h < 18 && h >= 5 ? "Bonjour" : "Bonsoir";
}

function jours(dateIso: string) {
  const t = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Brussels" }));
  const d = new Date(dateIso.slice(0, 10));
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

export default async function Home({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const name = displayName(profil, user.email);

  const [{ data: fiches }, compets, cl, res, se, cal, noms, eug, clubsComplet] = await Promise.all([
    supabase.from("joueurs").select("notion_id,prenom,cagnotte,roles,actif").eq("email", (user.email || "").toLowerCase()),
    prochainesCompetitions(1),
    essayer(lireClassementsClub),
    essayer(() => lireResultats(6)),
    essayer(() => lireSeances(4)),
    essayer(lireCalendrier),
    essayer(nomsJoueurs),
    lireEugies(supabase),
    lireClubs(supabase),
  ]);
  const next = compets[0];
  const moi = ((fiches || []) as { notion_id: string }[]).map((f) => f.notion_id);

  // Member not active this season: discovery space only.
  if (estInactif(profil)) {
    const [infos, sp] = await Promise.all([essayer(lireInfosPubliques), searchParams]);
    return (
      <>
        <Header subtitle="Espace membres" profil={profil} name={name} apercu={apercu} />
        <main className="wrap">
          <VueDecouverte salut={greeting()} name={name} infos={infos.data || []} evs={cal.data || []} seances={se.data || []} resultats={res.data || []} classements={cl.data || []} eug={eug} clubsComplet={clubsComplet} moi={moi} noms={noms.data || new Map()} m={sp.m} />
        </main>
      </>
    );
  }

  return (
    <>
      <Header subtitle="Espace membres · saison 2026–2027" profil={profil} name={name} valeurs apercu={apercu} />
      <main className="wrap">
        <VueAccueil
          name={name}
          salut={greeting()}
          isAdmin={profil?.role === "admin"}
          lie={Boolean(profil)}
          email={user.email || ""}
          gens={(fiches || []) as Gens}
          prochaine={next ? { nom: next.nom, date: next.date, lieu: next.lieu } : null}
          j={next ? jours(next.date) : null}
          classements={cl.data || []}
          resultats={res.data || []}
          seances={se.data || []}
          evs={cal.data || []}
          noms={noms.data || new Map()}
          eug={eug}
          clubsComplet={clubsComplet}
          moi={((fiches || []) as { notion_id: string }[]).map((f) => f.notion_id)}
        />
      </main>
    </>
  );
}
