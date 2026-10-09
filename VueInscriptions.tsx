import Link from "next/link";
import type { Evenement, JoueurLite, Participation } from "@/lib/club-types";
import {
  aujourdhui, compteARebours, dateCourte, dateMoyenne, estCompetition, estRetenu, indexReponses, inscriptionsOuvertes, joursEntre, lienReponse, modifiable, phase, moisCourt, DECISION_OUI,
} from "@/lib/club-types";
import StatutChip from "./StatutChip";
import Blocs from "@/components/Blocs";
import { decisionBadge } from "./VueCalendrier";

export default function VueInscriptions({ evs, parts, famille, erreur }: { evs: Evenement[]; parts: Participation[]; famille: JoueurLite[]; erreur?: string | null }) {
  const today = aujourdhui();
  const idx = indexReponses(parts, evs, famille);
  const comp = evs.filter((e) => e.date && e.date >= today && estCompetition(e) && estRetenu(e) && !e.jourSpecial);
  const rep = (e: Evenement) => famille.map((j) => ({ j, p: idx.get(e.id)?.get(j.notionId) || null }));

  const aConfirmer = comp.filter((e) => phase(e, today) === "confirmation" && rep(e).some((x) => x.p?.statut && x.p.statut !== "En attente" && !x.p.valide));
  const aRepondre = comp.filter((e) => !aConfirmer.includes(e) && inscriptionsOuvertes(e, today) && rep(e).some((x) => !x.p?.statut || x.p.statut === "En attente"));
  const repondu = comp.filter((e) => !aRepondre.includes(e) && !aConfirmer.includes(e) && rep(e).some((x) => x.p?.statut && x.p.statut !== "En attente"));
  const bientot = comp.filter((e) => !aRepondre.includes(e) && !repondu.includes(e) && !aConfirmer.includes(e));
  const ouiEvs = comp.filter((e) => rep(e).some((x) => x.p?.statut === "Oui"));
  const prochLimite = aRepondre.filter((e) => e.limite).sort((a, b) => a.limite!.localeCompare(b.limite!))[0];
  const famille2 = famille.length > 1;

  const Carte = ({ e, mode }: { e: Evenement; mode: "todo" | "done" | "soon" | "conf" }) => (
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
              {p?.valide ? <span className="st-lock" title="Validée définitivement">🔒</span> : null}
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
        {rep(e).map(({ j, p }) => {
          if (!modifiable(e, p, today)) return null;
          const fait = Boolean(p?.statut && p.statut !== "En attente");
          const conf = phase(e, today) === "confirmation";
          return (
            <a key={j.notionId} className={`btn${!fait || conf ? " primary" : ""}`} href={lienReponse(e, j.notionId)}>
              {conf ? "🔒 Confirmer" : fait ? "Modifier" : "Répondre"}
              {famille2 ? ` pour ${j.nom.split(" ")[0]}` : ""} →
            </a>
          );
        })}
        {phase(e, today) === "confirmation" && e.validation ? (
          <span className="lim urgent">🔒 confirmation avant le {dateCourte(e.validation)}</span>
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

      <Blocs
        initial={aConfirmer.length ? "confirmer" : aRepondre.length ? "repondre" : undefined}
        blocs={[
          { id: "resume", titre: "Résumé", ic: "📋", contenu: (
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

          ) },
          ...(aConfirmer.length ? [{ id: "confirmer", titre: "À confirmer", ic: "🔒", badge: aConfirmer.length, contenu: (
            <>
              <p className="notice">Les inscriptions sont closes pour ces compétitions : confirme définitivement ta réponse avant la date de validation. Ensuite, elle ne pourra plus être modifiée.</p>
              {aConfirmer.map((e) => <Carte key={e.id} e={e} mode="conf" />)}
            </>
          ) }] : []),
          { id: "repondre", titre: "À répondre", ic: "✍️", badge: aRepondre.length || null, contenu: (
            <>{aRepondre.length ? aRepondre.map((e) => <Carte key={e.id} e={e} mode="todo" />) : <p className="vide">Rien à répondre pour l&apos;instant. 👍</p>}</>
          ) },
          { id: "repondu", titre: "Déjà répondu", ic: "✅", badge: repondu.length || null, contenu: (
            <>{repondu.length ? repondu.map((e) => <Carte key={e.id} e={e} mode="done" />) : <p className="vide">Aucune réponse envoyée pour l&apos;instant.</p>}</>
          ) },
          { id: "plus-tard", titre: "Plus tard", ic: "⏳", badge: bientot.length || null, contenu: (
            <>{bientot.length ? bientot.map((e) => <Carte key={e.id} e={e} mode="soon" />) : <p className="vide">Rien d&apos;autre au programme.</p>}</>
          ) },
        ]}
      />
      <p className="foot">Les réponses arrivent du formulaire dans Notion puis ici en quelques minutes.</p>
    </>
  );
}
