import Link from "next/link";
import Header from "@/components/Header";
import Blocs from "@/components/Blocs";
import { TableClassement } from "@/components/club/Classements";
import AllerLigne from "@/components/club/AllerLigne";
import { compterListes, lireEugies, lireImports, lireListe } from "@/lib/classements-lire";
import { LISTES, SOURCES, libelleMois, listeDef } from "@/lib/classements-types";
import { displayName, getVue } from "@/lib/profil";
import LogoFistf from "@/components/LogoFistf";

export const dynamic = "force-dynamic";
export const metadata = { title: "Classements · SC Lions d'Eugies", description: "Classements national (FBFTS) et international (FISTF) avec les joueurs du club en évidence." };

const FILTRES = [
  { id: "", txt: "Tout le classement" },
  { id: "club", txt: "🦁 Eugies seulement" },
  { id: "bel", txt: "🇧🇪 Belges", fistf: true },
];

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
  const [eug, lignes, nb, imports, mesFiches] = await Promise.all([
    lireEugies(sb),
    lireListe(sb, def.id, filtre),
    compterListes(sb),
    lireImports(sb),
    email ? sb.from("joueurs").select("notion_id").eq("email", email) : Promise.resolve({ data: [] }),
  ]);
  const moi = ((mesFiches.data || []) as { notion_id: string }[]).map((j) => j.notion_id);
  const lien = (l: string, f = filtre) => `/club/classements?l=${l}${f ? `&f=${f}` : ""}#bloc-complet`;
  const imp = (s: string) => imports.find((i) => i.source === s);
  // Three pages in the section: national (players), national (clubs), international (with its own small tabs).
  const groupe = def.id === "FBFTS" ? "nat" : def.id === "FBFTS-Clubs" ? "clubs" : "int";
  const INTER = LISTES.filter((l) => l.source === "fistf");
  const court = (l: (typeof LISTES)[number]) => l.court.replace(/^International\s+/, "");
  const natFiltre = filtre === "bel" ? "" : filtre;

  const complet = (
    <>
      <div className="bande-fixe cl-bande">
      {/* International: small tabs for its lists (Open, Vétérans, Femmes, U20…). The national pages have none. */}
      {groupe === "int" && !visiteur ? (
        <nav className="cl-tabs cl-petits" aria-label="Classements internationaux">
          {INTER.map((l) => (
            <Link key={l.id} href={lien(l.id)} className={l.id === def.id ? "on" : undefined} aria-current={l.id === def.id ? "page" : undefined}>
              {court(l)}
              {eug.some((e) => e.liste === l.id) ? <span className="cl-n">{eug.filter((e) => e.liste === l.id && e.prenom !== null).length || "🦁"}</span> : null}
            </Link>
          ))}
        </nav>
      ) : null}
      {!visiteur ? (
      <div className="cl-filtres">
        {FILTRES.filter((f) => !f.fistf || def.source === "fistf").map((f) => (
          <Link key={f.id} href={lien(def.id, f.id)} className={`chip${filtre === f.id ? " on" : ""}`}>
            {f.txt}
          </Link>
        ))}
      </div>
      ) : null}
      </div>
      <section className="panel">
        <div className="hd cl-hd">
          <div className="cl-hd-t">
            <h2>{def.titre}</h2>
            <span className="muted small">
              {lignes[0] ? libelleMois(lignes[0].mois, true) : ""} · {nb.get(def.id) || 0} classés · <a href={SOURCES[def.source].page} target="_blank" rel="noopener">source ↗</a>
            </span>
          </div>
          {/* Fixed with the table's title: one tap brings our line to the middle of the table. */}
          {lignes.some((l) => l.eugies || (l.joueur_id && moi.includes(l.joueur_id))) ? (
            <AllerLigne key={`${def.id}-${filtre}`} bouton={!filtre} texte={moi.length && lignes.some((l) => l.joueur_id && moi.includes(l.joueur_id)) ? "Aller à ma ligne" : "Aller à notre premier joueur"} />
          ) : null}
        </div>
        <div className="bd">
          {lignes.length ? <TableClassement lignes={lignes} def={def} moi={moi} /> : <p className="vide">Ce classement n&apos;a pas encore été importé.</p>}
        </div>
      </section>
      <p className="cl-legende small">
        <span className="lg eug" /> joueur ou équipe d&apos;Eugies {moi.length ? <><span className="lg moi" /> toi</> : null}
      </p>
    </>
  );

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
            {profil?.role === "admin" && !apercu ? <> · <Link href="/staff/classements">⚙️ Mettre à jour / importer un fichier</Link></> : null}
          </p>
        </section>
        {/* Independent page: the rankings alone, with their own bottom bar (no parts of the home page). */}
        <Blocs
          page="Classements"
          actions={profil?.role === "admin" && !apercu ? <Link className="rf-btn" href="/staff/classements" title="Mettre à jour / importer un classement"><span className="rf-e" aria-hidden="true">⚙️</span> <span className="rf-t">Mise à jour</span></Link> : null}
          blocs={[{ id: "complet", titre: def.titre, ic: def.source === "fistf" ? <LogoFistf taille={22} /> : def.ic, contenu: complet }]}
          // Bottom bar: the rankings of the section, one thumbnail each; arrows go from one ranking to the next.
          pages={visiteur ? [
            { id: "FBFTS-Clubs", titre: "Club 🇧🇪", ic: "🦁", href: lien("FBFTS-Clubs") },
            { id: "WR-Teams", titre: "Club FISTF", ic: <LogoFistf taille={22} />, href: lien("WR-Teams") },
            { id: "FBFTS", titre: "Joueurs 🇧🇪", ic: "🇧🇪", href: lien("FBFTS") },
            { id: "WR-Open", titre: "Joueurs FISTF", ic: <LogoFistf taille={22} />, href: lien("WR-Open") },
          ] : [
            { id: "nat", titre: "National", ic: "🇧🇪", href: lien("FBFTS", natFiltre) },
            { id: "clubs", titre: "Clubs belges", ic: "🏟️", href: lien("FBFTS-Clubs", natFiltre) },
            { id: "int", titre: "International", ic: <LogoFistf taille={22} />, href: lien(groupe === "int" ? def.id : "WR-Open") },
          ]}
          pageActuelle={visiteur ? def.id : groupe}
        />
      </main>
    </>
  );
}
