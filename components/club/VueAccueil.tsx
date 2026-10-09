import Link from "next/link";
import Blocs from "@/components/Blocs";
import Installer from "@/components/Installer";
import type { ClassementClub, Evenement, Resultat, Seance } from "@/lib/club-types";
import { BlocEntrainements, BlocResultats } from "./VueClub";
import { ClassementsClubs, NosJoueurs } from "./Classements";
import { libelleMois, pts, type LigneClassement } from "@/lib/classements-types";

const euro = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

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
  const cagnotte = gens.reduce((s, g) => s + (Number(g.cagnotte) || 0), 0);
  const roles = [...new Set(gens.flatMap((g) => g.roles || []))];
  const famille = gens.length > 1;
  const now = p.classements[0];
  const eug = p.eug || [];
  const natAuto = eug.find((e) => e.liste === "FBFTS-Clubs")?.rang;
  const nbJoueurs = new Set(eug.filter((e) => e.prenom !== null && e.liste !== "WR-Teams").map((e) => e.joueur_id || e.nom)).size;

  const moi = p.moi || [];
  const maNat = eug.filter((e) => e.liste === "FBFTS" && e.joueur_id && moi.includes(e.joueur_id)).sort((a, b) => a.rang - b.rang)[0];
  const monWr = eug.filter((e) => e.liste.startsWith("WR-") && e.liste !== "WR-Teams" && e.joueur_id && moi.includes(e.joueur_id)).sort((a, b) => a.rang - b.rang)[0];
  const seance = p.seances.find((x) => !x.annule);
  const clubNat = eug.find((e) => e.liste === "FBFTS-Clubs");
  const eqs = eug.filter((e) => e.liste === "WR-Teams").sort((a, b) => a.rang - b.rang);
  const equipe = eqs[0];
  const autresEq = eqs.slice(1);
  const qui = maNat ? `${maNat.prenom} ${maNat.nom}` : monWr ? `${monWr.prenom} ${monWr.nom.charAt(0)}${monWr.nom.slice(1).toLowerCase()}` : p.name;
  const dateLongue = (d: string) => new Date(d.slice(0, 10) + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  const score = (
    <div className="vg">
      <section className="vg-hero" aria-label="Prochaine compétition">
        <div className="vg-cpt">
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
      <div className="fc-grille vg-grille">
        <Link className="fc-t t-nat" href="/fiche">
          <span className="fl-l">🇧🇪 {famille ? "Classement national" : "Ma place nationale"}</span>
          <b className="fc-v num">{maNat ? <>{maNat.rang}<sup>{maNat.rang === 1 ? "er" : "e"}</sup></> : "—"}</b>
          <span className="fc-qui">{qui}</span>
          <span className="fc-s">{maNat ? `Catégorie ${maNat.categorie || "?"}` : monWr ? `International : ${monWr.rang}e` : "Pas encore classé"}</span>
        </Link>
        <Link className="fc-t t-euro" href="/fiche">
          <span className="fl-l">💶 {famille ? "Cagnotte famille" : "Ma cagnotte"}</span>
          <b className="fc-v num">{euro.format(cagnotte)}</b>
          <span className="fc-qui">{famille ? gens.map((g) => g.prenom).filter(Boolean).join(" · ") : qui}</span>
          <span className="fc-s">déplacements</span>
        </Link>
        <a className="fc-t t-cnat" href="#bloc-club">
          <span className="fl-l">🇧🇪 Club · national</span>
          <b className="fc-v num">{clubNat ? <>{clubNat.rang}<sup>{clubNat.rang === 1 ? "er" : "e"}</sup></> : now?.national ? <>{now.national}<sup>e</sup></> : "—"}</b>
          <span className="fc-qui v-club">SC Lions d&apos;Eugies</span>
          <span className="fc-s">{clubNat ? `${pts(clubNat.points)} pts · ${libelleMois(clubNat.mois)}` : "clubs belges"}</span>
        </a>
        <a className="fc-t t-int" href="#bloc-club">
          <span className="fl-l">🌍 Club · international</span>
          <b className="fc-v num">{equipe ? <>{equipe.rang}<sup>{equipe.rang === 1 ? "er" : "e"}</sup></> : "—"}</b>
          <span className="fc-qui v-club">{equipe ? `Eugies ${equipe.prenom || "Team A"}` : "SC Lions d'Eugies"}</span>
          <span className="fc-s">{equipe ? `FISTF équipes${autresEq.length ? ` · ${autresEq.map((e) => `${e.prenom} ${e.rang}e`).join(" · ")}` : ""}` : "pas encore classé"}</span>
        </a>
        <a className="fc-t t-temps fc-large" href="#bloc-entrainements">
          <span className="fl-l">🎯 Prochain entraînement</span>
          <b className="fc-v fc-v-txt">{seance ? dateLongue(seance.date) : "—"}</b>
          <span className="fc-s">{seance ? [seance.debut && seance.fin ? `${seance.debut} – ${seance.fin}` : seance.debut, seance.lieu].filter(Boolean).join(" · ") : "Aucune séance prévue"}</span>
        </a>
      </div>
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
      <Installer />
      {!p.lie ? <div className="notice">Ton compte est connecté mais pas encore relié à une fiche du club. Un administrateur doit vérifier ton adresse ({p.email}).</div> : null}

      <Blocs
        page="Accueil"
        blocs={[
          { id: "vue", titre: "Vue générale", ic: "🏁", contenu: score },
          { id: "club", titre: "Le club", ic: "🏆", badge: natAuto ? `${natAuto}e` : now?.national ? `${now.national}e` : null, contenu: <><ClassementsClubs nat={p.clubsComplet?.nat || []} equipes={p.clubsComplet?.equipes || []} /><p className="sec-title">Derniers résultats</p><BlocResultats resultats={p.resultats} evs={p.evs} noms={p.noms} /></> },
          { id: "classements", titre: "Classements", ic: "📊", badge: nbJoueurs || null, contenu: <NosJoueurs lignes={eug} moi={p.moi} /> },
          { id: "entrainements", titre: "Entraînements", ic: "🎯", badge: p.seances.filter((s) => !s.annule).length || null, contenu: <BlocEntrainements seances={p.seances} noms={p.noms} /> },
        ]}
      />
      <p className="foot">Connecté en tant que {p.email}.</p>
    </>
  );
}
