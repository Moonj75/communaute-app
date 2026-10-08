import Link from "next/link";
import Blocs from "@/components/Blocs";
import type { ClassementClub, Evenement, InfoPublique, Seance } from "@/lib/club-types";
import { aujourdhui, compteARebours, estCompetition, estRetenu, moisCourt } from "@/lib/club-types";
import Mois from "./Mois";
import { BlocClassements, BlocEntrainements } from "./VueClub";
import { NosJoueurs, PlacesClub } from "./Classements";
import type { LigneClassement } from "@/lib/classements-types";

function lien(q: { m?: string; e?: string }) {
  const p = new URLSearchParams();
  if (q.m) p.set("m", q.m);
  return `/club?${p.toString()}#bloc-calendrier`;
}

/** Public space (no login): general info, calendar, trainings, club rankings. No personal data. */
export default function VuePublique({ infos, evs, seances, classements, m, connecte, eug = [] }: { infos: InfoPublique[]; evs: Evenement[]; seances: Seance[]; classements: ClassementClub[]; m?: string; connecte: boolean; eug?: LigneClassement[] }) {
  const T = aujourdhui();
  const comps = evs.filter((e) => e.date && e.date >= T && estCompetition(e) && estRetenu(e) && !e.jourSpecial).slice(0, 10);
  const ym = m && /^\d{4}-\d{2}$/.test(m) ? m : T.slice(0, 7);
  const publics = evs.filter((e) => e.jourSpecial || (estCompetition(e) && estRetenu(e)));

  return (
    <>
      <section className="pub-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/crest.png" alt="" width={120} height={120} />
        <div>
          <span className="kicker">LEAW · Subbuteo Beyond Borders</span>
          <h2>Bienvenue chez les Lions</h2>
          <p>Le club de Subbuteo d&apos;Eugies : compétition, famille et esprit d&apos;équipe.</p>
          <Link className="btn primary" href={connecte ? "/" : "/login"}>{connecte ? "Mon espace →" : "Espace membres · se connecter →"}</Link>
        </div>
      </section>

      <Blocs
        initial={m ? "calendrier" : undefined}
        blocs={[
          {
            id: "club",
            titre: "Le club",
            ic: "🦁",
            contenu: infos.length ? (
              <div className="pub-infos">
                {infos.map((i) => (
                  <article key={i.id} className="pub-i">
                    <span className="pub-ic" aria-hidden="true">{i.icone || "🦁"}</span>
                    <h3>{i.titre}</h3>
                    {i.texte ? <p className="pre">{i.texte}</p> : null}
                    {i.lien ? <a href={i.lien} target="_blank" rel="noopener">En savoir plus ↗</a> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="vide">Les informations du club arrivent bientôt.</p>
            ),
          },
          {
            id: "calendrier",
            titre: "Calendrier",
            ic: "📅",
            badge: comps.length || null,
            contenu: (
              <>
                <section className="panel"><div className="bd"><Mois ym={ym} evs={publics} lien={lien} /></div></section>
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
          { id: "entrainements", titre: "Entraînements", ic: "🎯", contenu: <BlocEntrainements seances={seances} noms={new Map()} /> },
          {
            id: "classements",
            titre: "Classements",
            ic: "🏆",
            contenu: (
              <>
                {eug.some((e) => e.prenom === null || e.liste === "WR-Teams") ? <PlacesClub clubs={eug.filter((e) => e.prenom === null || e.liste === "WR-Teams")} /> : <BlocClassements classements={classements} />}
                <p className="sec-title">Nos joueurs classés</p>
                <NosJoueurs lignes={eug} />
              </>
            ),
          },
        ]}
      />
    </>
  );
}
