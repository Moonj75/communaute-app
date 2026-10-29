import Link from "next/link";
import Blocs from "@/components/Blocs";
import type { ClassementClub, Evenement, Resultat, Seance } from "@/lib/club-types";
import { BlocResultats } from "./VueClub";
import ClubDuo from "./ClubDuo";
import type React from "react";
import { libelleMois, listeDef, pts, type LigneClassement } from "@/lib/classements-types";
import LogoFistf from "@/components/LogoFistf";
import Defile from "./Defile";
import PhotoAccueil from "./PhotoAccueil";
import { PalmaresAccueil } from "@/components/Palmares";
import type { ResultatP } from "@/lib/palmares-types";

export type Gens = { prenom: string | null; cagnotte: number | null; roles: string[] | null; actif: boolean }[];

export default function VueAccueil(p: {
  name: string;
  salut: string;
  isAdmin: boolean;
  lie: boolean;
  /** Every fiche of the account is « sans compétitions officielles »: no « Mes inscriptions » button. */
  sansCompet?: boolean;
  email: string;
  gens: Gens;
  prochaine: { nom: string; date: string; lieu: string | null } | null;
  j: number | null;
  /** The competition right after the next one. */
  suivante?: { nom: string; date: string; lieu: string | null; j: number } | null;
  classements: ClassementClub[];
  resultats: Resultat[];
  seances: Seance[];
  evs: Evenement[];
  noms: Map<string, string>;
  eug?: LigneClassement[];
  clubsComplet?: { nat: LigneClassement[]; equipes: LigneClassement[] };
  moi?: string[];
  /** The club's palmarès (Notion), names by fiche id without dashes. */
  palmares?: { resultats: ResultatP[]; noms: Record<string, string>; totaux: { or: number; argent: number; bronze: number; total: number } };
}) {
  const { gens } = p;
  const roles = [...new Set(gens.flatMap((g) => g.roles || []))];
  const famille = gens.length > 1;
  const now = p.classements[0];
  const eug = p.eug || [];
  const natAuto = eug.find((e) => e.liste === "FBFTS-Clubs")?.rang;

  const moi = p.moi || [];
  const maNat = eug.filter((e) => e.liste === "FBFTS" && e.joueur_id && moi.includes(e.joueur_id)).sort((a, b) => a.rang - b.rang)[0];
  const monWr = eug.filter((e) => e.liste.startsWith("WR-") && e.liste !== "WR-Teams" && e.joueur_id && moi.includes(e.joueur_id)).sort((a, b) => a.rang - b.rang)[0];
  const monOpen = eug.filter((e) => e.liste === "WR-Open" && e.joueur_id && moi.includes(e.joueur_id)).sort((a, b) => a.rang - b.rang)[0];
  const maCat = eug.filter((e) => e.liste.startsWith("WR-") && e.liste !== "WR-Open" && e.liste !== "WR-Teams" && e.joueur_id && moi.includes(e.joueur_id)).sort((a, b) => a.rang - b.rang)[0];
  const seance = p.seances.find((x) => !x.annule);
  const clubNat = eug.find((e) => e.liste === "FBFTS-Clubs");
  const eqs = eug.filter((e) => e.liste === "WR-Teams").sort((a, b) => a.rang - b.rang);
  const equipe = eqs[0];
  const autresEq = eqs.slice(1);
  const qui = maNat ? `${maNat.prenom} ${maNat.nom}` : monWr ? `${monWr.prenom} ${monWr.nom.charAt(0)}${monWr.nom.slice(1).toLowerCase()}` : p.name;
  const dateLongue = (d: string) => new Date(d.slice(0, 10) + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  const rang = (n?: number | null) => (n ? <>{n}<sup>{n === 1 ? "er" : "e"}</sup></> : "—");
  // Only the rankings where there is a place to show (no « Pas encore classé » frames in the rotation).
  const avecPlace = <T extends { n: number | null }>(l: T[]) => { const f = l.filter((x) => x.n !== null); return f.length ? f : l.slice(0, 1); };
  const proche = (j: number) => (j <= 30 ? "proche" : j <= 60 ? "moyen" : "loin");
  const score = (
    <div className="vg ecran-fixe">
      <section className="vg-hero" aria-label="Prochaine compétition">
        <div className={`vg-cpt ${p.j === null ? "loin" : p.j <= 30 ? "proche" : p.j <= 60 ? "moyen" : "loin"}`}>
          <span className="vg-l">Prochaine compétition</span>
          <span className="vg-j num">{p.j === null ? "—" : p.j === 0 ? "Jour J" : p.j === 1 ? "Demain" : <>J-{p.j}</>}</span>
        </div>
        <div className="vg-ev">
          <b>{p.prochaine?.nom || "Calendrier en préparation"}</b>
          {p.prochaine ? (
            <span>
              {dateLongue(p.prochaine.date)}
              {p.prochaine.lieu ? ` · ${p.prochaine.lieu}` : ""}
            </span>
          ) : null}
          <span className="vg-act">
            {p.sansCompet ? null : <Link className="btn primary" href="/inscriptions">🏁 Mes inscriptions</Link>}
            <Link className="btn" href="/calendrier">📅 Calendrier</Link>
          </span>
        </div>
      </section>
      {p.suivante ? (
        <Link className={`acc-suiv ${proche(p.suivante.j)}`} href="/calendrier">
          <span className="acc-sk">Ensuite</span>
          <b className="acc-sj num">J-{p.suivante.j}</b>
          <span className="acc-sn">{p.suivante.nom}</span>
          <span className="acc-sd">{dateLongue(p.suivante.date)}{p.suivante.lieu ? ` · ${p.suivante.lieu}` : ""}</span>
        </Link>
      ) : null}

      {/* The rankings, one after the other in a single frame, then the club photo. */}
      <Defile
        tuiles={avecPlace([
          { id: "nat", quoi: famille ? `Place de ${qui}` : "Ma place", titre: "Classement national", ic: <span aria-hidden="true">🇧🇪</span>, k: "var(--n-national)", n: maNat?.rang ?? null, s: maNat ? `FBFTS · catégorie ${maNat.categorie || "?"}` : "Pas encore classé", href: "/fiche" },
          { id: "open", quoi: famille ? `Place de ${qui}` : "Ma place", titre: "Mondial FISTF · Open", ic: <LogoFistf taille={20} />, k: "var(--n-open)", n: monOpen?.rang ?? null, s: monOpen ? "Classement mondial toutes catégories" : "Pas encore classé", href: "/fiche" },
          { id: "cat", quoi: famille ? `Place de ${qui}` : "Ma place", titre: `Mondial FISTF · ${maCat ? listeDef(maCat.liste).court : "catégorie"}`, ic: <LogoFistf taille={20} />, k: "var(--n-categorie)", n: maCat?.rang ?? null, s: maCat ? "Classement mondial de ma catégorie" : "Pas encore classé", href: "/fiche" },
          { id: "club-nat", quoi: "Le club", titre: "Clubs de Belgique", ic: <span aria-hidden="true">🦁</span>, k: "var(--n-club)", n: clubNat?.rang ?? now?.national ?? null, s: clubNat ? `${pts(clubNat.points)} pts · ${libelleMois(clubNat.mois)}` : "Classement FBFTS des clubs", href: "#bloc-club" },
          { id: "club-int", quoi: "Le club", titre: "Équipes · Mondial FISTF", ic: <LogoFistf taille={20} />, k: "var(--n-open)", n: equipe?.rang ?? null, s: equipe ? `Eugies ${equipe.prenom || "Team A"}${autresEq.length ? ` · ${autresEq.map((e) => `${e.prenom} ${e.rang}e`).join(" · ")}` : ""}` : "Pas encore classé", href: "#bloc-club" },
        ])}
      />
      <PhotoAccueil />

      <a className="acc-c acc-entr" href="/entrainements" style={{ "--k": "var(--n-temps)" } as React.CSSProperties}>
        <span className="acc-l">🎯 Prochain entraînement</span>
        <b className="acc-v txt">{seance ? dateLongue(seance.date) : "—"}</b>
        <span className="acc-s">{seance ? [seance.debut && seance.fin ? `${seance.debut} – ${seance.fin}` : seance.debut, seance.lieu].filter(Boolean).join(" · ") : "Aucune séance prévue"}</span>
      </a>
    </div>
  );

  return (
    <>
      <section className="hello">
        <span className="kicker">{p.isAdmin ? "Staff · Administrateur" : famille ? "Compte famille" : "Joueur"}</span>
        <h2>
          {p.salut}, <span className="perso">{p.name}</span>
        </h2>
        <p>{p.isAdmin ? "Tout le club est entre tes mains. Prépare la suite." : "Prêt pour la prochaine ? Voici ton tableau de bord."}</p>
      </section>
      {!p.lie ? <div className="notice">Ton compte est connecté mais pas encore relié à une fiche du club. Un administrateur doit vérifier ton adresse ({p.email}).</div> : null}

      <Blocs
        page="Accueil"
        blocs={[
          { id: "vue", titre: "Vue générale", ic: "🏁", contenu: score },
          { id: "club", titre: "Le club", ic: "🏆", badge: natAuto ? `${natAuto}e` : now?.national ? `${now.national}e` : null, contenu: <><ClubDuo nat={p.clubsComplet?.nat || []} equipes={p.clubsComplet?.equipes || []} eug={eug} moi={p.moi} /><p className="sec-title">Derniers résultats</p><BlocResultats resultats={p.resultats} evs={p.evs} noms={p.noms} /></> },
          ...(p.palmares?.resultats.length ? [{ id: "palmares", titre: "Palmarès", ic: "🏅", badge: String(p.palmares.totaux.or), contenu: <PalmaresAccueil resultats={p.palmares.resultats} noms={p.palmares.noms} totaux={p.palmares.totaux} /> }] : []),
        ]}
      />
      <p className="foot">Connecté en tant que {p.email}.</p>
    </>
  );
}
