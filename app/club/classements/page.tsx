import Link from "next/link";
import Header from "@/components/Header";
import Blocs from "@/components/Blocs";
import { NosJoueurs, PlacesClub, TableClassement } from "@/components/club/Classements";
import { compterListes, lireEugies, lireImports, lireListe } from "@/lib/classements-lire";
import { LISTES, SOURCES, libelleMois, listeDef } from "@/lib/classements-types";
import { displayName, getVue } from "@/lib/profil";

export const dynamic = "force-dynamic";
export const metadata = { title: "Classements · SC Lions d'Eugies", description: "Classements national (FBFTS) et mondial (FISTF) avec les joueurs du club en évidence." };

const FILTRES = [
  { id: "", txt: "Tout le classement" },
  { id: "club", txt: "🦁 Eugies seulement" },
  { id: "bel", txt: "🇧🇪 Belges", fistf: true },
];

/** Public page: full rankings, club rows highlighted, the signed-in player's own rows glowing. */
export default async function Classements({ searchParams }: { searchParams: Promise<{ l?: string; f?: string }> }) {
  const sp = await searchParams;
  const { supabase: sb, user, profil, apercu } = await getVue();
  const def = listeDef(sp.l || "FBFTS");
  const filtre = sp.f === "club" || (sp.f === "bel" && def.source === "fistf") ? sp.f : "";

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

  const complet = (
    <>
      <nav className="cl-tabs" aria-label="Classements">
        {LISTES.map((l) => (
          <Link key={l.id} href={lien(l.id, l.source === "fistf" || filtre !== "bel" ? filtre : "")} className={l.id === def.id ? "on" : undefined} aria-current={l.id === def.id ? "page" : undefined}>
            <span aria-hidden="true">{l.ic}</span> {l.court}
            {eug.some((e) => e.liste === l.id) ? <span className="cl-n">{eug.filter((e) => e.liste === l.id && e.prenom !== null).length || "🦁"}</span> : null}
          </Link>
        ))}
      </nav>
      <div className="cl-filtres">
        {FILTRES.filter((f) => !f.fistf || def.source === "fistf").map((f) => (
          <Link key={f.id} href={lien(def.id, f.id)} className={`chip${filtre === f.id ? " on" : ""}`}>
            {f.txt}
          </Link>
        ))}
        {lignes.some((l) => l.eugies) && !filtre ? (
          <a className="chip go" href="#ma-ligne">
            ↓ Aller à {moi.length && lignes.some((l) => l.joueur_id && moi.includes(l.joueur_id)) ? "ma ligne" : "notre premier joueur"}
          </a>
        ) : null}
      </div>
      <section className="panel">
        <div className="hd">
          <h2>{def.titre}</h2>
          <span className="muted small">
            {lignes[0] ? libelleMois(lignes[0].mois, true) : ""} · {nb.get(def.id) || 0} classés · <a href={SOURCES[def.source].page} target="_blank" rel="noopener">source ↗</a>
          </span>
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
          <h2>Les Lions au classement</h2>
          <p>
            🇧🇪 FBFTS {imp("fbfts") ? `(${libelleMois(imp("fbfts")!.mois, true)})` : ""} · 🌍 FISTF {imp("fistf") ? `(${libelleMois(imp("fistf")!.mois, true)})` : ""} — mis à jour
            automatiquement le 1<sup>er</sup> de chaque mois. <Link href="/club">← Le club</Link>
            {profil?.role === "admin" && !apercu ? <> · <Link href="/staff/classements">⚙️ Mettre à jour / importer un fichier</Link></> : null}
          </p>
        </section>
        <Blocs
          initial={sp.l ? "complet" : undefined}
          blocs={[
            { id: "nos-joueurs", titre: "Nos joueurs", ic: "🦁", badge: new Set(eug.filter((e) => e.prenom !== null).map((e) => e.joueur_id || e.nom)).size || null, contenu: <NosJoueurs lignes={eug} moi={moi} lien={false} /> },
            { id: "club", titre: "Le club", ic: "🏆", badge: eug.find((e) => e.liste === "FBFTS-Clubs") ? `#${eug.find((e) => e.liste === "FBFTS-Clubs")!.rang}` : null, contenu: <PlacesClub clubs={eug.filter((e) => e.prenom === null || e.liste === "WR-Teams")} /> },
            { id: "complet", titre: "Classement complet", ic: "📋", badge: def.court, contenu: complet, apercu: <TableClassement lignes={lignes.slice(0, 14)} def={def} compact /> },
          ]}
        />
      </main>
    </>
  );
}
