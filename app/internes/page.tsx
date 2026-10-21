import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Blocs from "@/components/Blocs";
import { displayName, getVue } from "@/lib/profil";
import { lireCompet, lireCompetitions } from "@/lib/internes-db";
import { TYPES, type Competition, type TypeCompet } from "@/lib/internes";
import VueCompet from "@/components/internes/VueCompet";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compétitions du club · SC Lions d'Eugies" };

/** Players: the club championship and the club cup — standings, cross tables of matches, knockout table. */
export default async function CompetitionsClub({ searchParams }: { searchParams: Promise<{ c?: string; e?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const email = (user.email || "").toLowerCase();
  const [{ competitions, erreur }, mesFiches] = await Promise.all([lireCompetitions(supabase), supabase.from("joueurs").select("notion_id").eq("email", email)]);
  const moi = ((mesFiches.data || []) as { notion_id: string }[]).map((j) => j.notion_id);
  const visibles = competitions.filter((c) => c.statut !== "preparation");

  // For each type: the one asked for, otherwise the one in progress, otherwise the latest.
  const choisir = (t: TypeCompet): Competition | undefined => {
    const l = visibles.filter((c) => c.type === t);
    return l.find((c) => c.id === sp.c) || l.find((c) => c.statut === "en_cours") || l[0];
  };
  const parts = await Promise.all(
    (["championnat", "coupe"] as const).map(async (t) => {
      const c = choisir(t);
      const d = c ? await lireCompet(supabase, c.id) : null;
      const autres = visibles.filter((x) => x.type === t);
      return {
        id: t,
        titre: t === "coupe" ? "Coupe" : "Championnat",
        ic: TYPES[t].ic,
        badge: c?.statut === "en_cours" ? "●" : null,
        contenu: d ? (
          <>
            {autres.length > 1 ? (
              <nav className="ci-saisons">{autres.map((x) => <Link key={x.id} href={`/internes?c=${x.id}#bloc-${t}`} className={`chip${x.id === d.c.id ? " on" : ""}`}>{x.saison || x.nom}</Link>)}</nav>
            ) : null}
            <h3 className="ci-titre">{d.c.nom}</h3>
            <VueCompet c={d.c} groupes={d.groupes} matchs={d.matchs} etape={sp.c === d.c.id && sp.e != null ? Number(sp.e) : undefined} moi={moi} lien={(k) => `/internes?c=${d.c.id}&e=${k}#bloc-${t}`} />
          </>
        ) : (
          <p className="vide">{erreur ? "Les compétitions du club arrivent bientôt." : `Pas encore de ${t === "coupe" ? "coupe" : "championnat"} cette saison.`}</p>
        ),
      };
    }),
  );

  return (
    <>
      <Header subtitle="Compétitions du club" profil={profil} name={displayName(profil, user.email)} apercu={apercu} />
      <main className="wrap">
        <section className="hello"><span className="kicker">Au club</span><h2>Compétitions du club</h2><p>Le championnat et la coupe des Lions : classements, matchs et résultats.</p></section>
        <Blocs page="Compétitions du club" blocs={parts} />
      </main>
    </>
  );
}
