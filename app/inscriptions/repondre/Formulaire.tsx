"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { envoyerReponse, type RetourReponse } from "./actions";

type Init = { statut: string | null; jours: string | null; restrictions: string | null; depart: string | null; retour: string | null; vehicule: string | null; referent?: string | null };
type Cle = "statut" | "jours" | "restrictions" | "depart" | "retour" | "vehicule" | "referent";
type Option = { v: string; l: string; ic?: string; d?: string };
type Etape = { cle: Cle; q: string; aide?: string; options: Option[]; grand?: boolean };

const STATUT: Option[] = [
  { v: "Oui", l: "Oui", ic: "✓", d: "Je participe" },
  { v: "Peut-être", l: "Peut-être", ic: "?", d: "Je ne sais pas encore" },
  { v: "Non", l: "Non", ic: "✕", d: "Je ne viens pas" },
];

/**
 * Progressive answer form: one question at a time, the next one only appears when it applies
 * (conditional logic), answered questions fold into a short summary you can reopen.
 *
 * Logic:
 *  - « Oui » + event on two days      → which days?
 *  - « Oui » + travel (not local)     → restrictions? → if yes: departure, return → vehicle?
 *  - « Peut-être » / « Non »          → nothing else, straight to the summary.
 */
export default function Formulaire(p: {
  evId: string;
  evNom: string;
  joueurId: string;
  prenom: string;
  deuxJours: boolean;
  loin: boolean;
  init: Init;
  autres: { id: string; prenom: string }[];
  /** « jusqu'au 12 oct. » : last day the answer can still be changed. */
  jusquau: string | null;
  confirmation: boolean;
}) {
  const [etat, action, pending] = useActionState<RetourReponse | null, FormData>(envoyerReponse, null);
  const [r, setR] = useState<Partial<Record<Cle, string | null>>>({
    statut: p.init.statut && p.init.statut !== "En attente" ? p.init.statut : null,
    jours: p.init.jours,
    restrictions: p.init.restrictions,
    depart: p.init.depart,
    retour: p.init.retour,
    vehicule: p.init.vehicule,
    referent: p.init.referent || null,
  });
  // Question being edited (null = the first unanswered one).
  const [ouverte, setOuverte] = useState<Cle | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const [quitter, setQuitter] = useState(false);
  const router = useRouter();
  const touche = JSON.stringify(r) !== JSON.stringify({ statut: p.init.statut && p.init.statut !== "En attente" ? p.init.statut : null, jours: p.init.jours, restrictions: p.init.restrictions, depart: p.init.depart, retour: p.init.retour, vehicule: p.init.vehicule, referent: p.init.referent || null });
  const sortir = () => (touche ? setQuitter(true) : router.push("/inscriptions"));
  const courante = useRef<HTMLFieldSetElement>(null);

  /** Questions that apply, given the answers so far. */
  const etapes = useMemo<Etape[]>(() => {
    const l: Etape[] = [{ cle: "statut", q: `Participes-tu à ${p.evNom} ?`, options: STATUT, grand: true }];
    if (r.statut !== "Oui") return l;
    if (p.deuxJours)
      l.push({
        cle: "jours",
        q: "Quels jours seras-tu là ?",
        aide: "La compétition se déroule sur deux jours.",
        options: [
          { v: "Samedi uniquement", l: "Samedi", ic: "🗓️" },
          { v: "Dimanche uniquement", l: "Dimanche", ic: "🗓️" },
          { v: "Les deux jours", l: "Les deux jours", ic: "📆" },
        ],
      });
    if (p.loin) {
      l.push({
        cle: "restrictions",
        q: "As-tu une contrainte d'horaire pour le départ ou le retour ?",
        aide: "Pour organiser les voitures et l'hébergement.",
        options: [
          { v: "Non", l: "Non, je suis libre", ic: "🙂" },
          { v: "Oui", l: "Oui, j'ai une contrainte", ic: "⏰" },
        ],
      });
      if (r.restrictions === "Oui") {
        l.push({
          cle: "depart",
          q: "Je peux partir au plus tôt…",
          options: [
            { v: "Vendredi matin", l: "Vendredi matin", ic: "🌅" },
            { v: "Vendredi après-midi", l: "Vendredi après-midi", ic: "☀️" },
            { v: "Vendredi soir", l: "Vendredi soir", ic: "🌙" },
          ],
        });
        l.push({
          cle: "retour",
          q: "Je dois être rentré au plus tard…",
          options: [
            { v: "Dimanche soir", l: "Dimanche soir", ic: "🌙" },
            { v: "Lundi matin", l: "Lundi matin", ic: "🌅" },
            { v: "Lundi soir", l: "Lundi soir", ic: "🌆" },
          ],
        });
      }
      l.push({
        cle: "vehicule",
        q: "Peux-tu prendre ta voiture pour ce déplacement ?",
        options: [
          { v: "Oui", l: "Oui, je peux conduire", ic: "🚗" },
          { v: "Non", l: "Non", ic: "🚶" },
        ],
      });
    }
    // Same question as the Tally form: one player takes charge of the group on the day.
    l.push({
      cle: "referent",
      q: "Peux-tu être référent principal ?",
      aide: "Le référent coordonne le groupe sur place (rendez-vous, horaires, contact avec le staff).",
      options: [
        { v: "Oui", l: "Oui, je veux bien", ic: "🧭" },
        { v: "Non", l: "Non", ic: "🙂" },
      ],
    });
    return l;
  }, [r.statut, r.restrictions, p.deuxJours, p.loin, p.evNom]);

  const premiereVide = etapes.find((e) => !r[e.cle])?.cle || null;
  const active = ouverte && etapes.some((e) => e.cle === ouverte) ? ouverte : premiereVide;
  const iActive = active ? etapes.findIndex((e) => e.cle === active) : etapes.length;
  const complet = !premiereVide;
  const faites = etapes.filter((e) => r[e.cle]).length;

  // Bring the new question into view.
  useEffect(() => {
    courante.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active]);

  const choisir = (cle: Cle, v: string) => {
    setR((x) => ({ ...x, [cle]: v }));
    setOuverte(null); // go to the next unanswered question
    setConfirmer(false);
  };

  if (etat?.ok)
    return (
      <section className="merci">
        <span className="merci-ic" aria-hidden="true">{etat.statut === "Oui" ? "🦁" : etat.statut === "Non" ? "👋" : "🤔"}</span>
        <h2>
          {etat.definitif ? "C'est validé" : "Merci"} {p.prenom} !
        </h2>
        {etat.definitif ? (
          <p className="lock-ok">🔒 Réponse validée définitivement : elle ne peut plus être modifiée.</p>
        ) : p.jusquau ? (
          <p className="small">Tu peux encore la modifier {p.jusquau}.</p>
        ) : null}
        <p>
          {etat.statut === "Oui"
            ? `Ta participation à ${p.evNom} est enregistrée. Allez les Lions !`
            : etat.statut === "Non"
              ? "Merci pour ces informations, à bientôt !"
              : "Merci pour ces informations, nous te rappellerons plus tard pour que tu aies le temps de te décider."}
        </p>
        <div className="merci-act">
          <Link className="btn primary" href="/inscriptions">
            ← Retour à mes inscriptions
          </Link>
          {p.autres.map((a) => (
            <Link key={a.id} className="btn" href={`/inscriptions/repondre?e=${p.evId}&j=${a.id}`}>
              Répondre pour {a.prenom} →
            </Link>
          ))}
        </div>
      </section>
    );

  const libelle = (e: Etape) => e.options.find((o) => o.v === r[e.cle])?.l || r[e.cle];

  return (
    <form action={action} className="rep pas">
      <input type="hidden" name="e" value={p.evId} />
      <input type="hidden" name="j" value={p.joueurId} />
      {/* Only the answers to questions that apply are sent. */}
      {etapes.map((e) => (r[e.cle] ? <input key={e.cle} type="hidden" name={e.cle} value={r[e.cle]!} /> : null))}

      <div className="pas-prog" aria-label={`Étape ${Math.min(faites + 1, etapes.length)} sur ${etapes.length}`}>
        <div className="pas-barre">
          <span style={{ width: `${(faites / etapes.length) * 100}%` }} />
        </div>
        <span className="pas-n">{complet ? "✓ Tout est rempli" : r.statut ? `Question ${iActive + 1} sur ${etapes.length}` : "Question 1"}</span>
      </div>

      {etapes.map((e, i) => {
        if (i > iActive) return null; // not reached yet: hidden
        if (e.cle !== active)
          return (
            <button key={e.cle} type="button" className="pas-fait" onClick={() => setOuverte(e.cle)} aria-label={`Modifier : ${e.q}`}>
              <span className="pas-ok" aria-hidden="true">✓</span>
              <span className="pas-q">{e.q}</span>
              <b className={`pas-r${e.cle === "statut" ? ` r-${r.statut === "Oui" ? "o" : r.statut === "Non" ? "n" : "m"}` : ""}`}>{libelle(e)}</b>
              <span className="pas-mod">Modifier</span>
            </button>
          );
        return (
          <fieldset key={e.cle} ref={courante} className="q pas-q-on">
            <legend>
              <span className="pas-num">{i + 1}</span> {e.q}
            </legend>
            {e.aide ? <p className="pas-aide">{e.aide}</p> : null}
            <div className={`choix${e.grand ? " grand" : ""}`} role="radiogroup">
              {e.options.map((o) => (
                <label key={o.v} className={`ch${r[e.cle] === o.v ? " on" : ""} ch-${e.cle === "statut" ? (o.v === "Oui" ? "o" : o.v === "Non" ? "n" : "m") : "x"}`}>
                  <input type="radio" name={`_${e.cle}`} value={o.v} checked={r[e.cle] === o.v} onChange={() => choisir(e.cle, o.v)} />
                  {o.ic ? <span className="ch-ic" aria-hidden="true">{o.ic}</span> : null}
                  <span className="ch-t">
                    {o.l}
                    {o.d ? <small>{o.d}</small> : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}

      {complet ? (
        <section className="pas-fin">
          <h3>Récapitulatif</h3>
          <p className="small">
            {r.statut === "Oui"
              ? "Vérifie tes réponses, puis enregistre."
              : r.statut === "Non"
                ? "Pas de souci : enregistre ta réponse pour que le staff le sache."
                : "Tu pourras changer d'avis jusqu'à la date limite."}
          </p>
          {p.confirmation ? (
            <p className="notice">
              🔒 Les inscriptions sont closes : c&apos;est le moment de <b>confirmer définitivement</b> ta réponse{p.jusquau ? ` (${p.jusquau})` : ""}. Après validation, tu ne pourras plus la changer.
            </p>
          ) : null}
        </section>
      ) : null}

      {etat && !etat.ok ? <p className="notice err">{etat.message}</p> : null}

      {confirmer ? (
        <div className="confirm-def" role="alertdialog" aria-label="Confirmer la validation définitive">
          <p>
            <b>Valider définitivement ?</b> Ta réponse « {r.statut} » sera verrouillée : tu ne pourras plus la modifier.
          </p>
          <div>
            <button type="button" className="btn" onClick={() => setConfirmer(false)}>
              Annuler
            </button>
            <button className="btn primary" type="submit" name="definitif" value="1" disabled={pending}>
              🔒 Oui, je valide
            </button>
          </div>
        </div>
      ) : null}

      {quitter ? (
        <div className="rep-quitter" role="alertdialog" aria-label="Quitter le formulaire">
          <p>
            <b>Répondre plus tard ?</b> Tes choix ne sont pas encore enregistrés. Tu pourras revenir jusqu&apos;à la date limite.
          </p>
          <div>
            <button type="button" className="btn" onClick={() => setQuitter(false)}>Continuer à répondre</button>
            <Link className="btn ghost" href="/inscriptions">Quitter sans enregistrer</Link>
          </div>
        </div>
      ) : null}

      <div className="rep-bar">
        <button type="button" className="rep-plustard" onClick={sortir}>
          <span aria-hidden="true">↩</span> Plus tard
        </button>
        {complet && !p.confirmation ? (
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Envoi…" : "Enregistrer"}
          </button>
        ) : null}
        {complet ? (
          <button type="button" className="btn primary" disabled={pending || r.statut === "Peut-être"} onClick={() => setConfirmer(true)} title={r.statut === "Peut-être" ? "Choisis Oui ou Non pour valider définitivement" : undefined}>
            🔒 Valider définitivement
          </button>
        ) : (
          <span className="rep-encore">Réponds à la question pour continuer</span>
        )}
      </div>
    </form>
  );
}
