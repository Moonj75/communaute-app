import Link from "next/link";
import type { Evenement, FicheLogistique as FicheLogistiqueT, JoueurLite, Participation } from "@/lib/club-types";
import { Anneau, couleurObjectif, Rythme } from "./Graphes";
import FicheLogistique from "./FicheLogistique";
import {
  ajouterJours, aujourdhui, compteARebours, dateCourte, dateMoyenne, estCompetition, estRetenu, indexReponses, initiales, lienReponse, moisCourt, DECISION_OUI,
} from "@/lib/club-types";
import Jalons from "./Jalons";
import CopierLien from "./CopierLien";
import Blocs from "@/components/Blocs";

type Props = {
  fiches?: Map<string, FicheLogistiqueT>;
  noms?: Map<string, string>;
  evs: Evenement[];
  parts: Participation[];
  joueurs: JoueurLite[];
  e?: string;
  erreur?: string | null;
  rafraichir?: React.ReactNode;
};

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default function VueTableauBord({ evs, parts, joueurs, e, erreur, rafraichir, fiches, noms }: Props) {
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
  const fiche = sel ? fiches?.get(sel.id) : null;
  const objectif = fiche?.objectif || null;
  const points = c ? actifs.map((j) => c.m.get(j.notionId)).filter((p): p is Participation => Boolean(p?.statut && p.statut !== "En attente")).map((p) => ({ t: p.creeLe, oui: p.statut === "Oui" })) : [];
  const relance = sel && c
    ? `🦁 Rappel SC Lions d'Eugies : ${sel.nom} (${dateMoyenne(sel.date)}${sel.lieu ? ", " + sel.lieu : ""}). ` +
      `Il manque encore la réponse de : ${c.att.map((j) => j.nom.split(" ")[0]).join(", ")}. ` +
      (sel.limite ? `Réponse avant le ${dateMoyenne(sel.limite)} 👉 ` : "Réponds ici 👉 ") + `https://lions-eugies.vercel.app${lienReponse(sel)}`
    : "";
  const cols = suivis.filter((x) => x.date! >= today).slice(0, 8);
  const avenir = suivis.filter((x) => x.date! >= today);
  const objectifDe = (x: Evenement) => fiches?.get(x.id)?.objectif || null;
  const jours = (d: string) => Math.round((Date.parse(d + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) / 864e5);
  const proximite = (d: string) => { const j = jours(d); return j < 0 ? "passe" : j <= 30 ? "proche" : j <= 60 ? "moyen" : "loin"; };
  // Key figures of the selected competition (the next one by default): a compact band that stays
  // fixed while scrolling and follows the competition chosen in the list below.
  const kp = c;
  const butP = objectif;
  const voituresP = kp ? kp.o.filter((j) => kp.m.get(j.notionId)?.vehicule === "Oui").length : 0;
  const kpis = [
    { k: "k-open", ic: "✅", l: "Inscrits", v: kp ? `${kp.o.length}${butP ? ` / ${butP}` : ""}` : "—", s: kp ? (butP ? `${pct(kp.o.length, butP)} % de l'objectif` : `sur ${N} actifs`) : "", w: kp ? pct(kp.o.length, butP || N) : 0 },
    { k: "k-temps", ic: "💬", l: "Ont répondu", v: kp ? `${pct(N - kp.att.length, N)} %` : "—", s: kp ? `${kp.att.length} en attente` : "", w: kp ? pct(N - kp.att.length, N) : 0 },
    { k: "k-temps2", ic: "🚗", l: "Véhicules", v: String(voituresP), s: kp ? `${kp.o.length} inscrit${kp.o.length > 1 ? "s" : ""}` : "", w: kp && kp.o.length ? pct(voituresP * 4, kp.o.length) : 0 },
  ];
  // Priorities: competitions of the next 4 months.
  const dans4 = ajouterJours(today, 122);
  const prio = avenir.filter((x) => x.date! <= dans4);
  // Logistics of the selected event: departures / returns, cars, restrictions.
  const ouiP = c ? c.o.map((j) => ({ j, r: c.m.get(j.notionId)! })) : [];
  const repartir = (cle: "depart" | "retour", opts: string[]) => opts.map((o) => ({ o, gens: ouiP.filter((x) => x.r[cle] === o).map((x) => x.j.nom) }));
  const departs = repartir("depart", ["Vendredi matin", "Vendredi après-midi", "Vendredi soir"]);
  const retours = repartir("retour", ["Dimanche soir", "Lundi matin", "Lundi soir"]);
  const avecVoiture = ouiP.filter((x) => x.r.vehicule === "Oui").map((x) => x.j.nom);
  const avecRestr = ouiP.filter((x) => x.r.restrictions.length || x.r.depart || x.r.retour).map((x) => x.j.nom);
  const deuxJours = Boolean(sel?.fin && sel.fin !== sel.date);
  const chiffres = (
    <section className="tb-kpis tb-bande" aria-label="Chiffres clés de la compétition choisie" aria-live="polite">
      <div className="tb-kpi k-nat tb-ksel">
        <span className="tb-kh"><span className="tb-kl">{sel && sel.date! >= today ? (sel.id === avenir[0]?.id ? "Prochaine compétition" : "Compétition choisie") : "Compétition"}</span>
          {sel?.date ? <span className={`tb-cd ${proximite(sel.date)}`}>{compteARebours(sel.date, today)}</span> : null}</span>
        <b className="tb-knom">{sel ? sel.nom : "Rien de prévu"}</b>
        {sel ? <span className="tb-ks">{dateMoyenne(sel.date)}{sel.lieu ? ` · ${sel.lieu}` : ""}</span> : null}
        {sel ? (
          <span className="tb-kbtn">
            <Link className="btn tb-kb" href={`/calendrier?e=${sel.id}&m=${sel.date!.slice(0, 7)}#bloc-mois`}>📋 Fiche complète</Link>
            <Link className="btn tb-kb" href={`/staff/inscriptions?e=${sel.id}#bloc-detail`} scroll={false}>🔎 Détail</Link>
          </span>
        ) : null}
      </div>
      {kpis.map((x) => (
        <div key={x.l} className={`tb-kpi ${x.k}`}>
          <span className="tb-kh"><span className="tb-ki" aria-hidden="true">{x.ic}</span><span className="tb-kl">{x.l}</span></span>
          <span className="tb-kv num">{x.v}</span>
          <span className="tb-kt"><i style={{ width: `${Math.min(100, x.w)}%` }} /></span>
          <span className="tb-ks">{x.s}</span>
        </div>
      ))}
    </section>
  );

  return (
    <>
      <section className="hello">
        <div>
          <span className="kicker">Staff · Inscriptions</span>
          <h2>Tableau de bord</h2>
          <p>Qui vient, qui hésite, qui n&apos;a pas encore répondu — par compétition.</p>
        </div>
      </section>
      {erreur ? <div className="notice err">{erreur}</div> : null}


      <Blocs actions={rafraichir} initial={e ? "detail" : undefined} blocs={[
        { id: "prio", titre: "Priorités · 4 mois", ic: "🔥", badge: prio.length || null, contenu: prio.length ? (<>
          {chiffres}
          <section className="panel tb-prio">
            <div className="hd"><h2>Inscriptions prioritaires · 4 mois</h2>
              <span className="tb-leg"><span><i className="cd proche" />&lt; 1 mois</span><span><i className="cd moyen" />&lt; 2 mois</span><span><i className="cd loin" />plus tard</span></span>
            </div>
            <div className="tb-pg">
              {prio.map((x) => {
                const k = compte(x);
                const but = objectifDe(x);
                const f = fiches?.get(x.id);
                return (
                  <Link key={x.id} href={`/staff/inscriptions?e=${x.id}#bloc-prio`} scroll={false} className={`tb-pc${x.id === sel?.id ? " on" : ""}`}>
                    <span className="tb-t1"><span className="v-date">{dateMoyenne(x.date)}</span><span className={`tb-cd ${proximite(x.date!)}`}>{compteARebours(x.date, today)}</span></span>
                    <b className="tb-nm">{x.nom}</b>
                    <span className="tb-ds">{x.lieu ? <span className="v-lieu">📍 {x.lieu}</span> : null}{x.competition ? <span>🏆 {x.competition}</span> : null}</span>
                    <span className="tb-ct">
                      <span className="tb-anneau" style={{ color: couleurObjectif(pct(k.o.length, but || N)) }}><Anneau v={pct(k.o.length, but || N)} taille={34} epaisseur={5} couleur="currentColor" /></span>
                      <span><b className="num">{k.o.length}{but ? ` / ${but}` : ""}</b> inscrits · <b className="num">{k.att.length}</b> en attente</span>
                    </span>
                    <span className="tb-pied">
                      {x.limite ? <span className="tb-lm">⏱️ avant le {dateCourte(x.limite)}</span> : null}
                      {x.priorite[0] ? <span className="tb-pr">{x.priorite[0]}</span> : null}
                      <span className={`tb-fi${f?.statut === "Prête" ? " ok" : ""}`}>🧳 {f ? (f.statut === "Prête" ? "Fiche prête" : "Fiche en cours") : "Pas de fiche"}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </>) : <>{chiffres}<p className="vide">Aucune compétition dans les 4 prochains mois.</p></> },
        { id: "liste", titre: "Compétitions", ic: "🏁", badge: suivis.length || null, contenu: (
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
        ) },

        { id: "detail", titre: sel ? sel.nom : "Détail", ic: "📊", badge: c ? `${c.o.length} oui` : null, contenu: sel && c ? (<>
          <section className="panel detail">
            <div className="hero-ev">
              <div className="stat-hero">
                <div>
                  <span className="eyebrow">{dateMoyenne(sel.date)} · {compteARebours(sel.date, today)}{sel.lieu ? ` · ${sel.lieu}` : ""}</span>
                  <h2>{sel.nom}</h2>
                </div>
                <div className="gauge">
                  <div className="gauge-l">
                    <b className="num">{objectif ? pct(c.o.length, objectif) : pct(N - c.att.length, N)} %</b>
                    <span>{objectif ? `de l'objectif (${c.o.length} / ${objectif} inscrits)` : `ont répondu (${N - c.att.length} / ${N})`}</span>
                  </div>
                  <Anneau v={objectif ? pct(c.o.length, objectif) : pct(N - c.att.length, N)} couleur={couleurObjectif(objectif ? pct(c.o.length, objectif) : pct(N - c.att.length, N))} piste="rgba(255,255,255,.15)" />
                </div>
              </div>
              <div className="track"><i style={{ width: `${Math.min(100, objectif ? pct(c.o.length, objectif) : pct(N - c.att.length, N))}%` }} /></div>
            </div>
            <div className="dist">
              <div className="gts">
                {[
                  { k: "o", l: "Oui", v: c.o.length },
                  { k: "m", l: "Peut-être", v: c.p.length },
                  { k: "n", l: "Non", v: c.n.length },
                  { k: "p", l: "En attente", v: c.att.length },
                ].map((t) => (
                  <div key={t.k} className={`gt gt-${t.k}`}>
                    <span className="gt-l">{t.l}</span>
                    <span className="gt-row"><span className="gt-v num">{t.v}</span><span className="gt-pc num">{pct(t.v, N)}<small>%</small></span></span>
                    <span className="gt-bar"><i style={{ width: `${Math.min(100, pct(t.v, N))}%` }} /></span>
                    <span className="gt-s">sur {N} joueurs</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bd">
              <div className="tb-facts">
                {[
                  { ic: "🚗", l: "Véhicules", gens: avecVoiture, vide: "Aucun véhicule proposé" },
                  { ic: "⚠️", l: "Restrictions", gens: avecRestr, vide: "Aucune restriction" },
                  { ic: "📆", l: deuxJours ? "Les deux jours" : "Sur 1 jour", gens: deuxJours ? ouiP.filter((x) => x.r.jours === "Les deux jours").map((x) => x.j.nom) : ouiP.map((x) => x.j.nom), vide: "Personne" },
                ].map((f) => (
                  <div key={f.l} className="tb-fact">
                    <span className="tb-fh">{f.ic} {f.l}</span>
                    <b className="tb-fv num">{f.gens.length}</b>
                    <span className="tb-fn">{f.gens.length ? f.gens.map((n) => n.split(" ")[0]).join(" · ") : f.vide}</span>
                  </div>
                ))}
              </div>
              <Jalons e={sel} compact />
              <div className="ev-actions">
                <Link className="btn" href={lienReponse(sel)}>📝 Voir le formulaire</Link>
                {c.att.length ? <CopierLien texte={relance} label="📋 Relance WhatsApp" /> : null}
                {c.att.length ? <Link className="btn" href={`/staff/notifications?cible=attente:${sel.id}`}>🔔 Notifier les {c.att.length}</Link> : null}
                <a className="btn" href={sel.url} target="_blank" rel="noopener">Page Notion ↗</a>
              </div>

            </div>
          </section>

        </>) : <p className="vide">Choisis une compétition.</p> },

        { id: "qui", titre: "Qui vient", ic: "👥", badge: c ? `${c.o.length}/${N}` : null, contenu: sel && c ? (
          <section className="panel"><div className="bd">
              <div className="three">
                <div className="box b-o"><span className="bh">Participent ({c.o.length}){c.o.filter((j) => c.m.get(j.notionId)?.valide).length ? ` · 🔒 ${c.o.filter((j) => c.m.get(j.notionId)?.valide).length} validés` : ""}</span><div className="chips">{c.o.length ? c.o.map((j) => <span key={j.notionId} className="chip o"><i>{initiales(j.nom)}</i>{j.nom}{c.m.get(j.notionId)?.valide ? " 🔒" : ""}</span>) : <span className="muted small">Personne pour l&apos;instant.</span>}</div></div>
                <div className="box b-p"><span className="bh">En attente ({c.att.length})</span><div className="chips">{c.att.length ? c.att.map((j) => <Link key={j.notionId} className="chip chip-lien" href={lienReponse(sel, j.notionId)} title={`Répondre pour ${j.nom}`}><i>{initiales(j.nom)}</i>{j.nom} ✎</Link>) : <span className="muted small">Tout le monde a répondu 🎉</span>}</div></div>
                <div className="box b-n"><span className="bh">Peut-être / Non ({c.p.length + c.n.length})</span><div className="chips">{[...c.p, ...c.n].map((j) => <span key={j.notionId} className={`chip ${c.p.includes(j) ? "m" : "n"}`}><i>{initiales(j.nom)}</i>{j.nom}</span>)}{!c.p.length && !c.n.length ? <span className="muted small">Personne.</span> : null}</div></div>
              </div>

          </div></section>
        ) : <p className="vide">Choisis une compétition.</p> },

        { id: "inscrits", titre: "Logistique des inscrits", ic: "🚗", badge: rows.length || null, contenu: sel && c ? (
          <section className="panel"><div className="bd">
              {rows.length ? (
                <>
                  {ouiP.some((x) => x.r.depart || x.r.retour) ? (
                    <div className="tb-dist">
                      {[{ t: "🛫 Départs", l: departs }, { t: "🛬 Retours", l: retours }].map((d) => (
                        <div key={d.t} className="tb-db">
                          <span className="tb-dt">{d.t}</span>
                          {d.l.map((o) => (
                            <div key={o.o} className="tb-dr" title={o.gens.join(", ")}>
                              <span>{o.o}</span>
                              <span className="tb-dbar"><i style={{ width: `${pct(o.gens.length, Math.max(1, ouiP.length))}%` }} /></span>
                              <b className="num">{o.gens.length}</b>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : null}
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
            {!rows.length ? <p className="vide">Personne d&apos;inscrit pour l&apos;instant.</p> : null}
          </div></section>
        ) : <p className="vide">Choisis une compétition.</p> },

        { id: "rythme", titre: "Rythme des réponses", ic: "📈", contenu: sel && c ? (
          <section className="panel">
            {points.length ? (
              <div className="rythme-box">
                <div className="legend"><b>Rythme des réponses</b><span><i style={{ background: "var(--fg)" }} />Réponses</span><span><i style={{ background: "var(--yes)" }} />Oui</span>{objectif ? <span><i style={{ background: "var(--accent)" }} />Objectif ({objectif})</span> : null}</div>
                <Rythme points={points} debut={points.map((x) => x.t).sort()[0]} fin={sel.date! < today ? sel.date! : today} objectif={objectif} max={N} />
              </div>
            ) : null}
            {!points.length ? <p className="vide">Pas encore de réponse.</p> : null}
          </section>
        ) : <p className="vide">Choisis une compétition.</p> },

        { id: "logistique", titre: "Logistique", ic: "🧳", badge: fiche ? (fiche.statut === "Prête" ? "✓" : "…") : null, contenu: sel ? <FicheLogistique f={fiche} ev={sel} noms={noms} staff /> : <p className="vide">Choisis une compétition.</p> },

        { id: "matrice", titre: "Par joueur", ic: "🧮", contenu: cols.length ? (
        <section className="panel">
          <div className="hd"><h2>Inscriptions par joueur</h2><span className="muted small">Les {cols.length} prochaines compétitions</span></div>
          <div className="bd scroll-x mx-box">
            <table className="matrix">
              <thead>
                <tr>
                  <th>Joueur</th>
                  <th>Inscrit</th>
                  <th>A répondu</th>
                  {cols.map((x) => (
                    <th key={x.id} title={`${x.nom} — ${dateMoyenne(x.date)}`}>
                      <Link href={`/staff/inscriptions?e=${x.id}`}>{x.nom.slice(0, 14)}</Link>
                      <small>{dateCourte(x.date)}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actifs.map((j) => {
                  const st = cols.map((x) => idx.get(x.id)?.get(j.notionId)?.statut);
                  const oui = st.filter((v) => v === "Oui").length;
                  const rep = pct(st.filter((v) => v && v !== "En attente").length, cols.length);
                  return (
                  <tr key={j.notionId}>
                    <td><b>{j.nom}</b></td>
                    <td className="num mx-oui"><b>{oui}</b></td>
                    <td><span className="mx-rep"><span className="tb-dbar"><i style={{ width: `${rep}%` }} /></span><small className="num">{rep} %</small></span></td>
                    {cols.map((x) => {
                      const s = idx.get(x.id)?.get(j.notionId)?.statut;
                      const k = s === "Oui" ? "o" : s === "Peut-être" ? "m" : s === "Non" ? "n" : "p";
                      return <td key={x.id}><span className={`cell ${k}`} title={`${j.nom} · ${x.nom} : ${s || "en attente"}`}>{s === "Oui" ? "Oui" : s === "Peut-être" ? "?" : s === "Non" ? "Non" : "·"}</span></td>;
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        ) : <p className="vide">Aucune compétition à venir.</p> },
      ]} />
    </>
  );
}
