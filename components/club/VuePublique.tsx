import Blocs from "@/components/Blocs";
import type { ClassementClub, Evenement, InfoPublique, Seance } from "@/lib/club-types";
import Affiche from "./Affiche";
import { BlocEntrainements } from "./VueClub";
import type { LigneClassement } from "@/lib/classements-types";

/** Public space (no login): welcome poster, club info, next trainings. No calendar, no personal data. */
export default function VuePublique({ infos, evs, seances, classements, m, connecte, eug = [], clubsComplet }: { infos: InfoPublique[]; evs: Evenement[]; seances: Seance[]; classements: ClassementClub[]; m?: string; connecte: boolean; eug?: LigneClassement[]; clubsComplet?: { nat: LigneClassement[]; equipes: LigneClassement[] } }) {
  // The calendar is for members only: visitors see the next trainings.
  void evs; void classements; void m; void eug; void clubsComplet;

  return (
    <>

      <Blocs
        page="Espace visiteur"
        blocs={[
          // Welcome poster: next training, where we train, contact.
          { id: "bienvenue", titre: "Bienvenue", ic: "🦁", contenu: <Affiche seance={seances.find((x) => !x.annule) || null} connecte={connecte} /> },
          {
            id: "club",
            titre: "Le club",
            ic: "🏆",
            contenu: infos.length ? (
              <div className="vis-infos">
                {infos.map((i) => (
                  <article key={i.id} className="vis-i">
                    <span className="vis-ic" aria-hidden="true">{i.icone || "🦁"}</span>
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
          { id: "entrainements", titre: "Prochains entraînements", ic: "🎯", badge: seances.filter((x) => !x.annule).length || null, contenu: <BlocEntrainements seances={seances} noms={new Map()} /> },
        ]}
      />
    </>
  );
}
