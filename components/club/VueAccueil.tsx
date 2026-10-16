import Link from "next/link";
import Blocs from "@/components/Blocs";
import type { ClassementClub, Evenement, Resultat, Seance } from "@/lib/club-types";
import { BlocEntrainements, BlocResultats } from "./VueClub";
import ClubDuo from "./ClubDuo";
import type React from "react";
import { libelleMois, listeDef, pts, type LigneClassement } from "@/lib/classements-types";
import LogoFistf from "@/components/LogoFistf";

export type Gens = { prenom: string | null; cagnotte: number | null; roles: string[] | null; actif: boolean }[];

export default function VueAccueil(p: {
  name: string;
  salut: string;
  isAdmin: boolean;
  lie: boolean;
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
  const proche = (j: number) => (j <= 30 ? "proche" : j <= 60 ? "moyen" : "loin");
  const score = (
    <div className="vg">
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
            <Link className="btn primary" href="/inscriptions">🏁 Mes inscriptions</Link>
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

      {/* The 5 ranking tiles, grouped, narrower and centred, a little apart from the competition above. */}
      <div className="acc-cl" aria-label="Classements">
      {/* My places: national, international (Open), international in my category. */}
      <div className="acc-ligne l3">
        <Link className="acc-c" href="/fiche" style={{ "--k": "var(--n-national)" } as React.CSSProperties}>
          <span className="acc-l">🇧🇪 National</span>
          <b className="acc-v num">{rang(maNat?.rang)}</b>
          <span className="acc-s">{maNat ? `Catégorie ${maNat.categorie || "?"}` : "non classé"}</span>
        </Link>
        <Link className="acc-c" href="/fiche" style={{ "--k": "var(--n-open)" } as React.CSSProperties}>
          <span className="acc-l"><LogoFistf /> International</span>
          <b className="acc-v num">{rang(monOpen?.rang)}</b>
          <span className="acc-s">FISTF Open</span>
        </Link>
        <Link className="acc-c" href="/fiche" style={{ "--k": "var(--n-categorie)" } as React.CSSProperties}>
          <span className="acc-l"><LogoFistf /> Catégorie</span>
          <b className="acc-v num">{rang(maCat?.rang)}</b>
          <span className="acc-s">{maCat ? `FISTF ${listeDef(maCat.liste).court}` : "non classé"}</span>
        </Link>
      </div>
      {famille ? <p className="acc-qui">Places de {qui}</p> : null}

      {/* The club's places. */}
      <div className="acc-ligne l2">
        <a className="acc-c" href="#bloc-club" style={{ "--k": "var(--n-club)" } as React.CSSProperties}>
          <span className="acc-l">🦁 Club · national</span>
          <b className="acc-v num">{clubNat ? rang(clubNat.rang) : rang(now?.national)}</b>
          <span className="acc-s">{clubNat ? `${pts(clubNat.points)} pts · ${libelleMois(clubNat.mois)}` : "clubs belges"}</span>
        </a>
        <a className="acc-c" href="#bloc-club" style={{ "--k": "var(--n-open)" } as React.CSSProperties}>
          <span className="acc-l"><LogoFistf /> Club · international</span>
          <b className="acc-v num">{rang(equipe?.rang)}</b>
          <span className="acc-s">{equipe ? `Eugies ${equipe.prenom || "Team A"}${autresEq.length ? ` · ${autresEq.map((e) => `${e.prenom} ${e.rang}e`).join(" · ")}` : ""}` : "pas encore classé"}</span>
        </a>
      </div>
      </div>

      <a className="acc-c acc-entr" href="#bloc-entrainements" style={{ "--k": "var(--n-temps)" } as React.CSSProperties}>
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
          { id: "entrainements", titre: "Entraînements", ic: "🎯", badge: p.seances.filter((s) => !s.annule).length || null, contenu: <BlocEntrainements seances={p.seances} noms={p.noms} /> },
        ]}
      />
      <p className="foot">Connecté en tant que {p.email}.</p>
    </>
  );
}
