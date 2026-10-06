import Link from "next/link";
import type { Evenement, JoueurLite, Participation } from "@/lib/club-types";
import {
  ajouterJours, aujourdhui, compteARebours, dateCourte, dateMoyenne, estCompetition, estRetenu, indexReponses, initiales, lienTally, moisCourt, DECISION_OUI,
} from "@/lib/club-types";
import Jalons from "./Jalons";
import CopierLien from "./CopierLien";

type Props = {
  evs: Evenement[];
  parts: Participation[];
  joueurs: JoueurLite[];
  e?: string;
  erreur?: string | null;
  rafraichir?: React.ReactNode;
};

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default function VueTableauBord({ evs, parts, joueurs, e, erreur, rafraichir }: Props) {
  const today = aujourdhui();
  const actifs = joueurs.filter((j) => j.actif);
  const N = actifs.length;
  const idx = indexReponses(parts, evs, joueurs);
  const suivis = evs.filter(
    (x) => x.date && x.date >= ajouterJours(today, -14) && estCompetition(x) && estRetenu(x) && !x.jourSpecial && (x.decision === DECISION_OUI || x.ouverture),
  );
  const sel = suivis.find((x) => x.id === e) || suivis.find((x) => x.date! >= today) || suivis[0] || null;

  const compte = (ev: Evenement) => {
    const m = idx.get(ev.id) || new Map<string, Participation>();
    const by = (s: string) => actifs.filter((j) => m.get(j.notionId)?.statut === s);
    const o = by("Oui"), p = by("Peut-être"), n = by("Non");
    const att = actifs.filter((j) => !m.get(j.notionId)?.statut || m.get(j.notionId)?.statut === "En attente");
    return { m, o, p, n, att };
  };

  const c = sel ? compte(sel) : null;
  const rows = c ? [...c.o, ...c.p].map((j) => ({ j, r: c.m.get(j.notionId)! })) : [];
  const relance = sel && c
    ? `🦁 Rappel SC Lions d'Eugies : ${sel.nom} (${dateMoyenne(sel.date)}${sel.lieu ? ", " + sel.lieu : ""}). ` +
      `Il manque encore la réponse de : ${c.att.map((j) => j.nom.split(" ")[0]).join(", ")}. ` +
      (sel.limite ? `Réponse avant le ${dateMoyenne(sel.limite)} 👉 ` : "Réponds ici 👉 ") + lienTally(sel)
    : "";
  const cols = suivis.filter((x) => x.date! >= today).slice(0, 8);

  return (
    <>
      <section className="hello row-hello">
        <div>
          <span className="kicker">Staff · Inscriptions</span>
          <h2>Tableau de bord</h2>
          <p>Qui vient, qui hésite, qui n&apos;a pas encore répondu — par compétition.</p>
        </div>
        {rafraichir}
      </section>
      {erreur ? <div className="notice err">{erreur}</div> : null}

      <div className="split dash">
        <section className="panel list">
          <div className="hd"><h2>Compétitions</h2><span className="muted small">{N} joueurs actifs</span></div>
          <div className="scroller">
            {suivis.length ? suivis.map((x) => {
              const k = compte(x);
              const past = x.date! < today;
              return (
                <Link key={x.id} href={`/staff/inscriptions?e=${x.id}`} scroll={false} className={`row${x.id === sel?.id ? " on" : ""}${past ? " past" : ""}`}>
                  <span className="row-d"><b className="num">{Number(x.date!.slice(8))}</b><small>{moisCourt(x.date!)}</small></span>
                  <span className="row-main">
                    <b>{x.nom}</b>
                    <span className="bar3" aria-label={`${k.o.length} oui, ${k.p.length} peut-être, ${k.n.length} non`}>
                      <i className="o" style={{ width: `${pct(k.o.length, N)}%` }} />
                      <i className="m" style={{ width: `${pct(k.p.length, N)}%` }} />
                      <i className="n" style={{ width: `${pct(k.n.length, N)}%` }} />
                    </span>
                    <small>{k.o.length} oui · {k.att.length} en attente · {compteARebours(x.date, today)}</small>
                  </span>
                </Link>
              );
            }) : <p className="muted bd">Aucune compétition retenue à venir. Décide dans le planning.</p>}
          </div>
        </section>

        {sel && c ? (
          <section className="panel detail">
            <div className="hero-ev">
              <span className="eyebrow">{dateMoyenne(sel.date)} · {compteARebours(sel.date, today)}{sel.lieu ? ` · ${sel.lieu}` : ""}</span>
              <h2>{sel.nom}</h2>
              <div className="tiles">
                {[
                  { k: "o", l: "Oui", v: c.o.length },
                  { k: "m", l: "Peut-être", v: c.p.length },
                  { k: "n", l: "Non", v: c.n.length },
                  { k: "p", l: "En attente", v: c.att.length },
                ].map((t) => (
                  <div key={t.k} className={`tile t-${t.k}`}>
                    <span className="tl">{t.l}</span>
                    <span className="tv num">{t.v}</span>
                    <span className="tb"><i style={{ width: `${pct(t.v, N)}%` }} /></span>
                    <span className="ts">{pct(t.v, N)} %</span>
                  </div>
                ))}
              </div>
              <p className="hero-sub">{N - c.att.length} réponses sur {N} joueurs · {pct(N - c.att.length, N)} % ont répondu</p>
            </div>
            <div className="bd">
              <Jalons e={sel} compact />
              <div className="ev-actions">
                <a className="btn primary" href={lienTally(sel)} target="_blank" rel="noopener">Formulaire de l&apos;évènement ↗</a>
                {c.att.length ? <CopierLien texte={relance} label="📋 Relance WhatsApp" /> : null}
                <a className="btn" href={sel.url} target="_blank" rel="noopener">Page Notion ↗</a>
              </div>

              <div className="three">
                <div className="box b-o"><span className="bh">Participent ({c.o.length})</span><div className="chips">{c.o.length ? c.o.map((j) => <span key={j.notionId} className="chip o"><i>{initiales(j.nom)}</i>{j.nom}</span>) : <span className="muted small">Personne pour l&apos;instant.</span>}</div></div>
                <div className="box b-p"><span className="bh">En attente ({c.att.length})</span><div className="chips">{c.att.length ? c.att.map((j) => <span key={j.notionId} className="chip"><i>{initiales(j.nom)}</i>{j.nom}</span>) : <span className="muted small">Tout le monde a répondu 🎉</span>}</div></div>
                <div className="box b-n"><span className="bh">Peut-être / Non ({c.p.length + c.n.length})</span><div className="chips">{[...c.p, ...c.n].map((j) => <span key={j.notionId} className={`chip ${c.p.includes(j) ? "m" : "n"}`}><i>{initiales(j.nom)}</i>{j.nom}</span>)}{!c.p.length && !c.n.length ? <span className="muted small">Personne.</span> : null}</div></div>
              </div>

              {rows.length ? (
                <>
                  <p className="mini-t">Logistique des inscrits</p>
                  <div className="scroll-x">
                    <table className="t">
                      <thead><tr><th>Joueur</th><th>Réponse</th><th>Jours</th><th>Véhicule</th><th>Départ</th><th>Retour</th><th>Restrictions</th></tr></thead>
                      <tbody>
                        {rows.map(({ j, r }) => (
                          <tr key={j.notionId}>
                            <td><b>{j.nom}</b></td>
                            <td><span className={`st st-${r.statut === "Oui" ? "o" : "m"}`}>{r.statut}</span></td>
                            <td>{r.jours || "—"}</td>
                            <td>{r.vehicule === "Oui" ? "🚗 Oui" : r.vehicule || "—"}</td>
                            <td>{r.depart || "—"}</td>
                            <td>{r.retour || "—"}</td>
                            <td className="small">{r.restrictions.join(", ") || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      {cols.length ? (
        <section className="panel">
          <div className="hd"><h2>Inscriptions par joueur</h2><span className="muted small">Les {cols.length} prochaines compétitions</span></div>
          <div className="bd scroll-x">
            <table className="matrix">
              <thead>
                <tr>
                  <th>Joueur</th>
                  {cols.map((x) => (
                    <th key={x.id} title={`${x.nom} — ${dateMoyenne(x.date)}`}>
                      <Link href={`/staff/inscriptions?e=${x.id}`}>{x.nom.slice(0, 14)}</Link>
                      <small>{dateCourte(x.date)}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actifs.map((j) => (
                  <tr key={j.notionId}>
                    <td><b>{j.nom}</b></td>
                    {cols.map((x) => {
                      const s = idx.get(x.id)?.get(j.notionId)?.statut;
                      const k = s === "Oui" ? "o" : s === "Peut-être" ? "m" : s === "Non" ? "n" : "p";
                      return <td key={x.id}><span className={`cell ${k}`} title={`${j.nom} · ${x.nom} : ${s || "en attente"}`}>{s === "Oui" ? "Oui" : s === "Peut-être" ? "?" : s === "Non" ? "Non" : "·"}</span></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
