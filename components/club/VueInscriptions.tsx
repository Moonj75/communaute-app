import Link from "next/link";
import type { Evenement, JoueurLite, Participation } from "@/lib/club-types";
import {
  aujourdhui, compteARebours, dateCourte, dateMoyenne, estCompetition, estRetenu, indexReponses, inscriptionsOuvertes, joursEntre, lienTally, moisCourt, DECISION_OUI,
} from "@/lib/club-types";
import StatutChip from "./StatutChip";
import { decisionBadge } from "./VueCalendrier";

export default function VueInscriptions({ evs, parts, famille, erreur }: { evs: Evenement[]; parts: Participation[]; famille: JoueurLite[]; erreur?: string | null }) {
  const today = aujourdhui();
  const idx = indexReponses(parts, evs, famille);
  const comp = evs.filter((e) => e.date && e.date >= today && estCompetition(e) && estRetenu(e) && !e.jourSpecial);
  const rep = (e: Evenement) => famille.map((j) => ({ j, p: idx.get(e.id)?.get(j.notionId) || null }));

  const aRepondre = comp.filter((e) => inscriptionsOuvertes(e, today) && rep(e).some((x) => !x.p?.statut || x.p.statut === "En attente"));
  const repondu = comp.filter((e) => !aRepondre.includes(e) && rep(e).some((x) => x.p?.statut && x.p.statut !== "En attente"));
  const bientot = comp.filter((e) => !aRepondre.includes(e) && !repondu.includes(e));
  const ouiEvs = comp.filter((e) => rep(e).some((x) => x.p?.statut === "Oui"));
  const prochLimite = aRepondre.filter((e) => e.limite).sort((a, b) => a.limite!.localeCompare(b.limite!))[0];
  const famille2 = famille.length > 1;

  const Carte = ({ e, mode }: { e: Evenement; mode: "todo" | "done" | "soon" }) => (
    <article className={`ins ${mode}`}>
      <div className="ins-d">
        <span className="m">{moisCourt(e.date!)}</span>
        <b className="num">{Number(e.date!.slice(8))}</b>
        <span className="cdn">{compteARebours(e.date, today)}</span>
      </div>
      <div className="ins-main">
        <h3>{e.nom}</h3>
        <p className="muted small">
          {e.lieu ? `📍 ${e.lieu}` : "Lieu à préciser"}
          {e.fin && e.fin !== e.date ? ` · jusqu'au ${dateCourte(e.fin)}` : ""}
        </p>
        <div className="ins-who">
          {rep(e).map(({ j, p }) => (
            <span key={j.notionId} className="who-l">
              {famille2 ? <b>{j.nom.split(" ")[0]}</b> : null}
              <StatutChip s={p?.statut} ouvert={inscriptionsOuvertes(e, today)} clos={Boolean(e.limite && e.limite < today)} />
              {p?.jours && p.statut === "Oui" ? <small className="muted">{p.jours}</small> : null}
            </span>
          ))}
        </div>
        {mode === "soon" ? (
          <p className="small muted">
            {e.decision !== DECISION_OUI ? <>Participation du club : {decisionBadge(e.decision)} </> : null}
            {e.ouverture && e.ouverture > today ? `Ouverture des réponses le ${dateMoyenne(e.ouverture)}.` : null}
          </p>
        ) : null}
      </div>
      <div className="ins-act">
        {inscriptionsOuvertes(e, today) ? (
          <a className={`btn${mode === "todo" ? " primary" : ""}`} href={lienTally(e)} target="_blank" rel="noopener">
            {mode === "todo" ? "Répondre ↗" : "Modifier ↗"}
          </a>
        ) : null}
        {e.limite && e.limite >= today ? (
          <span className={`lim${joursEntre(today, e.limite) <= 7 ? " urgent" : ""}`}>
            🔒 avant le {dateCourte(e.limite)}
          </span>
        ) : null}
        <Link className="small" href={`/calendrier?e=${e.id}&m=${e.date!.slice(0, 7)}`}>Voir au calendrier →</Link>
      </div>
    </article>
  );

  return (
    <>
      <section className="hello">
        <span className="kicker">{famille2 ? "Compte famille" : "Joueur"}</span>
        <h2>Mes inscriptions</h2>
        <p>Réponds aux compétitions retenues par le club. Le bouton ouvre le formulaire, déjà rempli avec l&apos;évènement.</p>
      </section>
      {erreur ? <div className="notice err">{erreur}</div> : null}
      {!famille.length ? (
        <div className="notice">Ta fiche n&apos;est pas encore reliée à la liste des joueurs. Un administrateur doit lancer la synchronisation Notion.</div>
      ) : null}

      <section className="score" aria-label="Résumé">
        <div className="main">
          <span className="lbl">À répondre</span>
          <span className="val num">{aRepondre.length}</span>
          <span className="sub">{prochLimite ? `Prochaine limite : ${prochLimite.nom} · ${dateCourte(prochLimite.limite)}` : "Tu es à jour 💪"}</span>
        </div>
        <div>
          <span className="lbl">Je participe</span>
          <span className="val num">{ouiEvs.length}</span>
          <span className="sub">{ouiEvs[0] ? `Prochaine : ${ouiEvs[0].nom}` : "Aucune pour l'instant"}</span>
        </div>
        <div>
          <span className="lbl">Au programme</span>
          <span className="val num">{comp.length}</span>
          <span className="sub">Compétitions à venir</span>
        </div>
      </section>

      <p className="sec-title">À répondre</p>
      {aRepondre.length ? aRepondre.map((e) => <Carte key={e.id} e={e} mode="todo" />) : <p className="muted">Rien à répondre pour l&apos;instant. 👍</p>}

      {repondu.length ? (
        <>
          <p className="sec-title">Déjà répondu</p>
          {repondu.map((e) => <Carte key={e.id} e={e} mode="done" />)}
        </>
      ) : null}

      {bientot.length ? (
        <>
          <p className="sec-title">Plus tard</p>
          {bientot.map((e) => <Carte key={e.id} e={e} mode="soon" />)}
        </>
      ) : null}
      <p className="foot">Les réponses arrivent du formulaire dans Notion puis ici en quelques minutes.</p>
    </>
  );
}
