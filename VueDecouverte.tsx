import Blocs from "@/components/Blocs";
import type { ClassementClub, Evenement, InfoPublique, Resultat, Seance } from "@/lib/club-types";
import { aujourdhui, compteARebours, estCompetition, estRetenu, moisCourt } from "@/lib/club-types";
import type { LigneClassement } from "@/lib/classements-types";
import Mois from "./Mois";
import { BlocClassements, BlocEntrainements, BlocResultats } from "./VueClub";
import { ClassementsClubs, NosJoueurs, PlacesClub } from "./Classements";

/**
 * « Discovery » space for members who are not active this season: general information only
 * (club, calendar, trainings, rankings, results). No answers to competitions, no logistics.
 */
export default function VueDecouverte(p: {
  salut: string;
  name: string;
  infos: InfoPublique[];
  evs: Evenement[];
  seances: Seance[];
  resultats: Resultat[];
  classements: ClassementClub[];
  eug: LigneClassement[];
  clubsComplet: { nat: LigneClassement[]; equipes: LigneClassement[] };
  moi: string[];
  noms: Map<string, string>;
  m?: string;
}) {
  const T = aujourdhui();
  const comps = p.evs.filter((e) => e.date && e.date >= T && estCompetition(e) && estRetenu(e) && !e.jourSpecial).slice(0, 8);
  const ym = p.m && /^\d{4}-\d{2}$/.test(p.m) ? p.m : T.slice(0, 7);
  const publics = p.evs.filter((e) => e.jourSpecial || (estCompetition(e) && estRetenu(e)));
  const clubs = p.eug.filter((e) => e.prenom === null || e.liste === "WR-Teams");

  return (
    <>
      <section className="hello">
        <span className="kicker">Membre du club</span>
        <h2>
          {p.salut}, <span className="perso">{p.name}</span>
        </h2>
        <p>Bienvenue dans l&apos;espace du club : calendrier, entraînements, classements et nouvelles des Lions.</p>
      </section>
      <div className="decouverte">
        <span className="dec-ic" aria-hidden="true">🦁</span>
        <div>
          <b>Tu n&apos;es pas inscrit comme joueur actif cette saison.</b>
          <p>Tu peux suivre toute la vie du club ici. Envie de rejouer en compétition ? Parles-en au staff : ton espace complet s&apos;ouvrira (inscriptions, déplacements…).</p>
        </div>
      </div>
      <Blocs
        page="Accueil"
        initial={p.m ? "calendrier" : undefined}
        blocs={[
          {
            id: "club",
            titre: "Le club",
            ic: "🏆",
            contenu: (
              <>
                {p.infos.length ? (
                  <div className="pub-infos">
                    {p.infos.map((i) => (
                      <article key={i.id} className="pub-i">
                        <span className="pub-ic" aria-hidden="true">{i.icone || "🦁"}</span>
                        <h3>{i.titre}</h3>
                        {i.texte ? <p className="pre">{i.texte}</p> : null}
                        {i.lien ? <a href={i.lien} target="_blank" rel="noopener">En savoir plus ↗</a> : null}
                      </article>
                    ))}
                  </div>
                ) : null}
                <p className="sec-title">Le club au classement</p>
                {clubs.length ? <PlacesClub clubs={clubs} /> : <BlocClassements classements={p.classements} />}
                <p className="sec-title">Derniers résultats</p>
                <BlocResultats resultats={p.resultats} evs={p.evs} noms={p.noms} />
              </>
            ),
          },
          {
            id: "calendrier",
            titre: "Calendrier",
            ic: "📅",
            badge: comps.length || null,
            contenu: (
              <>
                <section className="panel">
                  <div className="bd">
                    <Mois ym={ym} evs={publics} lien={(q) => `/?${q.m ? `m=${q.m}` : ""}#bloc-calendrier`} />
                  </div>
                </section>
                {comps.length ? (
                  <section className="panel list">
                    <div className="hd"><h2>Prochaines compétitions</h2></div>
                    {comps.map((x) => (
                      <div key={x.id} className="row">
                        <span className="row-d"><b className="num">{Number(x.date!.slice(8))}</b><small>{moisCourt(x.date!)}</small></span>
                        <span className="row-main"><b>{x.nom}</b><small>{x.lieu || "Lieu à préciser"} · {compteARebours(x.date, T)}</small></span>
                        <span />
                      </div>
                    ))}
                  </section>
                ) : null}
              </>
            ),
          },
          { id: "entrainements", titre: "Entraînements", ic: "🎯", badge: p.seances.filter((s) => !s.annule).length || null, contenu: <BlocEntrainements seances={p.seances} noms={p.noms} /> },
          { id: "classements", titre: "Classements", ic: "📊", contenu: <><NosJoueurs lignes={p.eug} moi={p.moi} /><p className="sec-title">Classements des clubs</p><ClassementsClubs nat={p.clubsComplet.nat} equipes={p.clubsComplet.equipes} /></> },
        ]}
      />
    </>
  );
}
