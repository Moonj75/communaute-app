import Header from "@/components/Header";
import ClassementsVue from "@/components/club/ClassementsVue";
import { compterListes, lireEugies, lireImports, lireListe } from "@/lib/classements-lire";
import { LISTES, libelleMois, listeDef } from "@/lib/classements-types";
import { displayName, getVue } from "@/lib/profil";
import LogoFistf from "@/components/LogoFistf";

export const dynamic = "force-dynamic";
export const metadata = { title: "Classements · SC Lions d'Eugies", description: "Classements national (FBFTS) et international (FISTF) avec les joueurs du club en évidence." };

/** Public page: full rankings, club rows highlighted, the signed-in player's own rows glowing. */
export default async function Classements({ searchParams }: { searchParams: Promise<{ l?: string; f?: string }> }) {
  const sp = await searchParams;
  const { supabase: sb, user, profil, apercu } = await getVue();
  // Visitors (not signed in) only see the club and our players: club national / international,
  // our players national / international (Open), always filtered on Eugies.
  const visiteur = !user;
  const VISIBLES = ["FBFTS-Clubs", "WR-Teams", "FBFTS", "WR-Open"];
  const def = listeDef(visiteur && !VISIBLES.includes(sp.l || "") ? "FBFTS-Clubs" : sp.l || "FBFTS");
  const filtre = visiteur ? "club" : sp.f === "club" || (sp.f === "bel" && def.source === "fistf") ? sp.f : "";

  const email = (user?.email || "").toLowerCase();
  // The whole list is sent once; the « Eugies » / « Belges » filters are applied in the browser.
  const [eug, lignes, nb, imports, mesFiches] = await Promise.all([
    lireEugies(sb),
    lireListe(sb, def.id, visiteur ? "club" : ""),
    compterListes(sb),
    lireImports(sb),
    email ? sb.from("joueurs").select("notion_id").eq("email", email) : Promise.resolve({ data: [] }),
  ]);
  const moi = ((mesFiches.data || []) as { notion_id: string }[]).map((j) => j.notion_id);
  const imp = (s: string) => imports.find((i) => i.source === s);
  const nosLignes = Object.fromEntries(LISTES.map((x) => [x.id, eug.filter((e) => e.liste === x.id && e.prenom !== null).length]));

  return (
    <>
      <Header subtitle="Classements · saison 2026–2027" profil={profil} name={user ? displayName(profil, user.email) : undefined} apercu={apercu} />
      <main className="wrap">
        <section className="hello">
          <span className="kicker">Classements officiels</span>
          <h2>Classements</h2>
          <p>
            🇧🇪 FBFTS {imp("fbfts") ? `(${libelleMois(imp("fbfts")!.mois, true)})` : ""} · <LogoFistf /> FISTF {imp("fistf") ? `(${libelleMois(imp("fistf")!.mois, true)})` : ""} — mis à jour
            automatiquement le 1<sup>er</sup> de chaque mois.
            
          </p>
        </section>
        {/* The rankings, in the browser: changing list or filter never reloads the page. */}
        <ClassementsVue l={def.id} f={(filtre || "") as "" | "club" | "bel"} lignes={lignes} visiteur={visiteur} moi={moi} compte={Object.fromEntries(nb)} nosLignes={nosLignes} />
      </main>
    </>
  );
}
