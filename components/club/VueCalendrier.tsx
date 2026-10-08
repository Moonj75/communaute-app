import Link from "next/link";
import type { Evenement, FicheLogistique as FicheLogistiqueT, JoueurLite, Participation } from "@/lib/club-types";
import FicheLogistique from "./FicheLogistique";
import {
  aujourdhui, compteARebours, dateMoyenne, estCompetition, estRetenu, indexReponses, inscriptionsOuvertes, lienReponse, modifiable, moisCourt, phase, DECISION_OUI,
} from "@/lib/club-types";
import Mois from "./Mois";
import Blocs from "@/components/Blocs";
import Jalons from "./Jalons";
import StatutChip from "./StatutChip";

export type CalendrierProps = {
  fiches?: Map<string, FicheLogistiqueT>;
  noms?: Map<string, string>;
  base?: string;
  public?: boolean;
  evs: Evenement[];
  parts: Participation[];
  famille: JoueurLite[];
  m?: string;
  e?: string;
  erreur?: string | null;
};

function lien(q: { m?: string; e?: string }) {
  const p = new URLSearchParams();
  if (q.m) p.set("m", q.m);
  if (q.e) p.set("e", q.e);
  return `/calendrier?${p.toString()}`;
}

export function decisionBadge(d: string | null) {
  if (!d) return <span className="dec dec-p">À décider</span>;
  if (d === DECISION_OUI) return <span className="dec dec-o">On y va</span>;
  if (d.includes("❌")) return <span className="dec dec-n">On n&apos;y va pas</span>;
  return <span className="dec dec-p">{d.replace(/^[^A-Za-zÀ-ÿ]+/, "")}</span>;
}

export default function VueCalendrier({ evs, parts, famille, m, e, erreur, fiches, noms }: CalendrierProps) {
  const today = aujourdhui();
  const visibles = evs.filter((x) => x.date && !x.jourSpecial && estRetenu(x));
  const avenir = visibles.filter((x) => (x.fin || x.date)! >= today);
  const sel = evs.find((x) => x.id === e) || avenir.find(estCompetition) || avenir[0] || null;
  const ym = m && /^\d{4}-\d{2}$/.test(m) ? m : (sel?.date || today).slice(0, 7);
  const idx = indexReponses(parts, evs, famille);
  const deux = sel?.fin && sel.fin !== sel.date;

  return (
    <>
      <section className="hello">
        <span className="kicker">Saison 2026 – 2027</span>
        <h2>Calendrier</h2>
        <p>Toutes les compétitions du club. Clique sur un jour pour voir l&apos;évènement.</p>
      </section>
      {erreur ? <div className="notice err">{erreur}</div> : null}

      <Blocs initial={e && sel ? "evenement" : undefined} blocs={[
        { id: "mois", titre: "Le mois", ic: "📅", contenu: (
        <section className="panel">
          <div className="bd">
            <Mois ym={ym} evs={evs} selId={sel?.id} lien={lien} />
          </div>
        </section>
        ) },
        { id: "evenement", titre: "Évènement choisi", ic: "🏁", badge: sel ? compteARebours(sel.date, today) : null, contenu: (<>

        {sel ? (
          <section className="panel ev-card" aria-live="polite">
            <div className="ev-top">
              <div className="ev-date">
                <span className="m">{sel.date ? moisCourt(sel.date) : ""}</span>
                <span className="d num">
                  {sel.date ? Number(sel.date.slice(8)) : "?"}
                  {deux ? `–${Number(sel.fin!.slice(8))}` : ""}
                </span>
                <span className="y">{sel.date?.slice(0, 4)}</span>
              </div>
              <div className="ev-id">
                <span className="cdown">{compteARebours(sel.date, today)}</span>
                <h3>{sel.nom}</h3>
                <span className="ev-meta">
                  {sel.lieu ? <>📍 {sel.lieu}</> : null}
                  {sel.deplacement ? <> · 🚐 {sel.deplacement}</> : null}
                </span>
                <span className="ev-tags">
                  {decisionBadge(sel.decision)}
                  {sel.type ? <span className="tagx">{sel.type}</span> : null}
                  {sel.priorite.map((p) => (
                    <span key={p} className="tagx gold">{p}</span>
                  ))}
                </span>
              </div>
            </div>
            <div className="bd">
              {estCompetition(sel) ? <Jalons e={sel} /> : null}
              {famille.length ? (
                <div className="fam">
                  <p className="mini-t">{famille.length > 1 ? "Réponses de la famille" : "Ma réponse"}</p>
                  {famille.map((j) => {
                    const r = idx.get(sel.id)?.get(j.notionId);
                    return (
                      <div key={j.notionId} className="fam-row">
                        <b>{j.nom}</b>
                        <span>
                          <StatutChip s={r?.statut} ouvert={inscriptionsOuvertes(sel, today)} clos={Boolean(sel.limite && sel.limite < today)} />
                          {r?.valide ? <span className="st-lock" title="Validée définitivement">🔒</span> : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <div className="ev-actions">
                {famille.some((j) => modifiable(sel, idx.get(sel.id)?.get(j.notionId), today)) || (!famille.length && inscriptionsOuvertes(sel, today)) ? (
                  famille.length ? (
                    famille.filter((j) => modifiable(sel, idx.get(sel.id)?.get(j.notionId), today)).map((j) => (
                      <a key={j.notionId} className="btn primary" href={lienReponse(sel, j.notionId)}>
                        {phase(sel, today) === "confirmation" ? "🔒 Confirmer" : "Répondre"}{famille.length > 1 ? ` pour ${j.nom.split(" ")[0]}` : ""} →
                      </a>
                    ))
                  ) : (
                    <a className="btn primary" href={lienReponse(sel)}>Répondre à cet évènement →</a>
                  )
                ) : (
                  <span className="muted small">
                    {sel.date && sel.date < today
                      ? "Évènement passé."
                      : sel.limite && sel.limite < today
                        ? `Réponses closes depuis le ${dateMoyenne(sel.limite)}.`
                        : sel.ouverture
                          ? `Inscriptions à partir du ${dateMoyenne(sel.ouverture)}.`
                          : "Les inscriptions ne sont pas encore ouvertes."}
                  </span>
                )}
                {sel.limite && sel.limite >= today ? (
                  <span className="lim">🔒 Réponse avant le <b>{dateMoyenne(sel.limite)}</b></span>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <section className="panel"><div className="bd muted">Aucun évènement à venir pour l&apos;instant.</div></section>
        )}
        </>) },

        { id: "logistique", titre: "Fiche logistique", ic: "🧳", badge: sel && fiches?.get(sel.id) ? "✓" : null, contenu: sel ? <FicheLogistique f={fiches?.get(sel.id)} ev={sel} noms={noms} /> : <p className="vide">Choisis un évènement dans le calendrier.</p> },
        { id: "liste", titre: "Prochains évènements", ic: "🗓️", badge: avenir.length || null, contenu: (
      <section className="panel list">
        <div className="hd">
          <h2>Prochains évènements</h2>
          <span className="muted small">{avenir.length} au programme</span>
        </div>
        <div className="scroller">
          {avenir.length ? (
            avenir.map((x) => {
              const mine = famille.map((j) => idx.get(x.id)?.get(j.notionId)?.statut || null);
              return (
                <Link key={x.id} href={lien({ e: x.id, m: x.date!.slice(0, 7) })} scroll={false} className={`row${x.id === sel?.id ? " on" : ""}`}>
                  <span className="row-d">
                    <b className="num">{Number(x.date!.slice(8))}</b>
                    <small>{moisCourt(x.date!)}</small>
                  </span>
                  <span className="row-main">
                    <b>{x.nom}</b>
                    <small>
                      {x.lieu || "Lieu à préciser"} · {compteARebours(x.date, today)}
                    </small>
                  </span>
                  <span className="row-end">
                    {decisionBadge(x.decision)}
                    {famille.length && estCompetition(x) && x.decision === DECISION_OUI && (inscriptionsOuvertes(x, today) || mine.some(Boolean)) ? <StatutChip s={mine.every((s) => s) ? mine[0] : null} ouvert={inscriptionsOuvertes(x, today)} clos={Boolean(x.limite && x.limite < today)} /> : null}
                  </span>
                </Link>
              );
            })
          ) : (
            <p className="muted bd">Rien de prévu pour l&apos;instant.</p>
          )}
        </div>
      </section>
        ) },
      ]} />
    </>
  );
}
