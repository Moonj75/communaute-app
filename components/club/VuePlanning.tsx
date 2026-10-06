import Link from "next/link";
import type { Evenement, JoueurLite, Tache } from "@/lib/club-types";
import {
  ajouterJours, ajouterMois, aujourdhui, compteARebours, dateCourte, dateMoyenne, estCompetition, estRetenu, jalons, moisCourt, RAPPEL,
} from "@/lib/club-types";
import Mois from "./Mois";
import Jalons from "./Jalons";
import TacheLigne, { type TacheVue } from "./TacheLigne";
import NouvelleTache from "./NouvelleTache";
import Centrer from "./Centrer";
import { decisionBadge } from "./VueCalendrier";

type Props = {
  evs: Evenement[];
  taches: Tache[];
  joueurs: JoueurLite[];
  m?: string;
  e?: string;
  erreur?: string | null;
  rafraichir?: React.ReactNode;
};

function lien(q: { m?: string; e?: string }) {
  const p = new URLSearchParams();
  if (q.m) p.set("m", q.m);
  if (q.e) p.set("e", q.e);
  return `/staff/planning?${p.toString()}`;
}

export default function VuePlanning({ evs, taches, joueurs, m, e, erreur, rafraichir }: Props) {
  const T = aujourdhui();
  const semaine = ajouterJours(T, 7);
  const noms = new Map(joueurs.map((j) => [j.notionId, j.nom]));
  const evById = new Map(evs.map((x) => [x.id, x]));
  const comps = evs.filter((x) => x.date && x.date >= T && estCompetition(x) && estRetenu(x) && !x.jourSpecial);
  const sel = evById.get(e || "") || null;
  const ym = m && /^\d{4}-\d{2}$/.test(m) ? m : (sel?.date || T).slice(0, 7);

  const ouvertes = taches.filter((t) => t.statut !== "Fait");
  const retard = ouvertes.filter((t) => t.echeance && t.echeance < T);
  const auj = ouvertes.filter((t) => t.echeance === T);
  const sept = ouvertes.filter((t) => t.echeance && t.echeance > T && t.echeance <= semaine);
  const plusTard = ouvertes.filter((t) => t.echeance && t.echeance > semaine);
  const sansDate = ouvertes.filter((t) => !t.echeance);
  const faites = taches.filter((t) => t.statut === "Fait").sort((a, b) => (b.echeance || "").localeCompare(a.echeance || "")).slice(0, 12);
  const rappels = ouvertes.filter((t) => t.type === RAPPEL && t.echeance && t.echeance <= ajouterJours(T, 1));
  const aDecider = comps.filter((x) => !x.decision);
  const decRetard = aDecider.filter((x) => ajouterMois(x.date!, -8) < T);
  const prochain = comps[0];
  const parDate = (a: Tache, b: Tache) => (a.echeance || "9").localeCompare(b.echeance || "9");

  const vue = (t: Tache): TacheVue => {
    const ev = t.evenementIds.map((id) => evById.get(id)).find(Boolean) || null;
    return {
      id: t.id,
      url: t.url,
      titre: t.titre,
      statut: t.statut,
      priorite: t.priorite,
      type: t.type,
      echeance: t.echeance,
      quand: t.echeance ? `${dateCourte(t.echeance)} · ${compteARebours(t.echeance, T)}` : "Sans date",
      retard: Boolean(t.echeance && t.echeance < T),
      evenement: ev ? { id: ev.id, nom: ev.nom, m: (ev.date || T).slice(0, 7) } : null,
      responsables: t.responsableIds.map((id) => noms.get(id)).filter(Boolean).join(", "),
      lie: Boolean(sel && t.evenementIds.includes(sel.id)),
    };
  };

  const groupes: { titre: string; cls: string; liste: Tache[] }[] = [
    { titre: "En retard", cls: "g-late", liste: retard.sort(parDate) },
    { titre: "Aujourd'hui", cls: "g-today", liste: auj },
    { titre: "7 prochains jours", cls: "", liste: sept.sort(parDate) },
    { titre: "Plus tard", cls: "", liste: plusTard.sort(parDate) },
    { titre: "Sans date", cls: "", liste: sansDate },
    { titre: "Fait récemment", cls: "g-done", liste: faites },
  ];
  const feuille = sel && !comps.includes(sel) ? [sel, ...comps] : comps;

  return (
    <>
      <section className="hello row-hello">
        <div>
          <span className="kicker">Staff · Organisation</span>
          <h2>Planning</h2>
          <p>Tâches, rappels et feuille de route des compétitions. Tout est enregistré directement dans Notion.</p>
        </div>
        {rafraichir}
      </section>
      {erreur ? <div className="notice err">{erreur}</div> : null}

      {rappels.length ? (
        <section className="remind">
          <h3>⏰ Rappels</h3>
          <ul>
            {rappels.map((t) => (
              <li key={t.id}>{t.titre} <small>· {compteARebours(t.echeance, T)}</small></li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="kpis">
        <div className={`kpi${retard.length ? " bad" : ""}`}><span className="l">En retard</span><span className="v num">{retard.length}</span><span className="s">tâches dépassées</span></div>
        <div className="kpi"><span className="l">Aujourd&apos;hui</span><span className="v num">{auj.length}</span><span className="s">à boucler</span></div>
        <div className="kpi"><span className="l">7 prochains jours</span><span className="v num">{sept.length}</span><span className="s">jusqu&apos;au {dateCourte(semaine)}</span></div>
        <div className={`kpi${decRetard.length ? " warn" : ""}`}><span className="l">Décisions</span><span className="v num">{aDecider.length}</span><span className="s">{decRetard.length ? `${decRetard.length} en retard (8 mois)` : "évènements à trancher"}</span></div>
        <div className="kpi dark"><span className="l">Prochain évènement</span><span className="v num">{prochain ? compteARebours(prochain.date, T) : "—"}</span><span className="s">{prochain?.nom || "—"}</span></div>
      </section>

      <div className="plan">
        <section className="panel tasks">
          <div className="hd"><h2>Mes tâches</h2><span className="muted small">{ouvertes.length} ouvertes</span></div>
          <div className="scroller">
            {groupes.map((g) =>
              g.liste.length ? (
                <div key={g.titre} className={`grp ${g.cls}`}>
                  <p className="grp-t">{g.titre} <span>{g.liste.length}</span></p>
                  <ul>
                    {g.liste.map((t) => <TacheLigne key={t.id} t={vue(t)} />)}
                  </ul>
                </div>
              ) : null,
            )}
            {!taches.length ? <p className="muted bd">Aucune tâche pour l&apos;instant.</p> : null}
          </div>
          <div className="bd add">
            <NouvelleTache evenements={comps.map((x) => ({ id: x.id, nom: `${x.nom} — ${dateCourte(x.date)}` }))} evDefaut={sel?.id} />
          </div>
        </section>

        <div className="plan-side">
          <section className="panel">
            <div className="bd">
              <Mois ym={ym} evs={evs} taches={taches} selId={sel?.id} lien={lien} />
            </div>
          </section>

          <section className="panel roadmap">
            <div className="hd"><h2>Feuille de route</h2>{sel ? <Link className="small" href={lien({ m: ym })} scroll={false}>Tout afficher</Link> : null}</div>
            <div className="scroller">
              {feuille.length ? feuille.map((x) => {
                const prochainJalon = jalons(x).find((j) => j.date && j.date >= T && !j.fait);
                const nb = ouvertes.filter((t) => t.evenementIds.includes(x.id)).length;
                return (
                  <article key={x.id} className={`rm${x.id === sel?.id ? " on" : ""}`} data-focus={x.id === sel?.id ? "1" : undefined}>
                    <Link href={lien({ e: x.id, m: x.date!.slice(0, 7) })} scroll={false} className="rm-h">
                      <span className="rm-d"><b className="num">{Number(x.date!.slice(8))}</b><small>{moisCourt(x.date!)}</small></span>
                      <span className="rm-n">
                        <b>{x.nom}</b>
                        <small>{compteARebours(x.date, T)}{x.lieu ? ` · ${x.lieu}` : ""}{nb ? ` · ${nb} tâche${nb > 1 ? "s" : ""}` : ""}</small>
                      </span>
                      {decisionBadge(x.decision)}
                    </Link>
                    <Jalons e={x} compact />
                    {prochainJalon ? <p className="rm-next">Prochaine étape : <b>{prochainJalon.label}</b> le {dateMoyenne(prochainJalon.date)}</p> : null}
                  </article>
                );
              }) : <p className="muted bd">Aucune compétition à venir.</p>}
            </div>
          </section>
        </div>
      </div>
      <Centrer cle={sel?.id} />
    </>
  );
}
