"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { envoyerReponse, type RetourReponse } from "./actions";

type Init = { statut: string | null; jours: string | null; restrictions: string | null; depart: string | null; retour: string | null; vehicule: string | null };

function Choix({ nom, options, valeur, onChange, grand }: { nom: string; options: { v: string; l: string; ic?: string }[]; valeur: string | null; onChange: (v: string) => void; grand?: boolean }) {
  return (
    <div className={`choix${grand ? " grand" : ""}`} role="radiogroup">
      {options.map((o) => (
        <label key={o.v} className={`ch${valeur === o.v ? " on" : ""} ch-${o.v === "Oui" ? "o" : o.v === "Non" ? "n" : o.v === "Peut-être" ? "m" : "x"}`}>
          <input type="radio" name={nom} value={o.v} checked={valeur === o.v} onChange={() => onChange(o.v)} />
          {o.ic ? <span className="ch-ic" aria-hidden="true">{o.ic}</span> : null}
          <span>{o.l}</span>
        </label>
      ))}
    </div>
  );
}

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
  const [statut, setStatut] = useState<string | null>(p.init.statut && p.init.statut !== "En attente" ? p.init.statut : null);
  const [jours, setJours] = useState<string | null>(p.init.jours);
  const [restr, setRestr] = useState<string | null>(p.init.restrictions);
  const [depart, setDepart] = useState<string | null>(p.init.depart);
  const [retour, setRetour] = useState<string | null>(p.init.retour);
  const [vehicule, setVehicule] = useState<string | null>(p.init.vehicule);
  const [confirmer, setConfirmer] = useState(false);

  if (etat?.ok)
    return (
      <section className="merci">
        <span className="merci-ic" aria-hidden="true">{etat.statut === "Oui" ? "🦁" : etat.statut === "Non" ? "👋" : "🤔"}</span>
        <h2>{etat.definitif ? "C'est validé" : "Merci"} {p.prenom} !</h2>
        {etat.definitif ? <p className="lock-ok">🔒 Réponse validée définitivement : elle ne peut plus être modifiée.</p> : p.jusquau ? <p className="small">Tu peux encore la modifier {p.jusquau}.</p> : null}
        <p>
          {etat.statut === "Oui"
            ? `Ta participation à ${p.evNom} est enregistrée. Allez les Lions !`
            : etat.statut === "Non"
              ? "Merci pour ces informations, à bientôt !"
              : "Merci pour ces informations, nous te rappellerons plus tard pour que tu aies le temps de te décider."}
        </p>
        <div className="merci-act">
          <Link className="btn primary" href="/inscriptions">← Retour à mes inscriptions</Link>
          {p.autres.map((a) => (
            <Link key={a.id} className="btn" href={`/inscriptions/repondre?e=${p.evId}&j=${a.id}`}>Répondre pour {a.prenom} →</Link>
          ))}
        </div>
      </section>
    );

  const manque =
    !statut || (statut === "Oui" && ((p.deuxJours && !jours) || (p.loin && (!restr || !vehicule || (restr === "Oui" && (!depart || !retour))))));

  return (
    <form action={action} className="rep">
      <input type="hidden" name="e" value={p.evId} />
      <input type="hidden" name="j" value={p.joueurId} />

      <fieldset className="q">
        <legend>Veux-tu participer à <b>{p.evNom}</b> ?</legend>
        <Choix nom="statut" grand valeur={statut} onChange={setStatut} options={[{ v: "Oui", l: "Oui", ic: "✓" }, { v: "Peut-être", l: "Peut-être", ic: "?" }, { v: "Non", l: "Non", ic: "✕" }]} />
      </fieldset>

      {statut === "Oui" && p.deuxJours ? (
        <fieldset className="q">
          <legend>Participes-tu seulement le samedi, seulement le dimanche ou les deux jours ?</legend>
          <Choix nom="jours" valeur={jours} onChange={setJours} options={[{ v: "Samedi uniquement", l: "Samedi" }, { v: "Dimanche uniquement", l: "Dimanche" }, { v: "Les deux jours", l: "Les deux jours" }]} />
        </fieldset>
      ) : null}

      {statut === "Oui" && p.loin ? (
        <>
          <fieldset className="q">
            <legend>As-tu des restrictions pour le départ ou le retour ?</legend>
            <Choix nom="restrictions" valeur={restr} onChange={setRestr} options={[{ v: "Non", l: "Non, je suis libre" }, { v: "Oui", l: "Oui" }]} />
          </fieldset>
          {restr === "Oui" ? (
            <>
              <fieldset className="q">
                <legend>Disponible au départ à partir de…</legend>
                <Choix nom="depart" valeur={depart} onChange={setDepart} options={[{ v: "Vendredi matin", l: "Vendredi matin" }, { v: "Vendredi après-midi", l: "Vendredi après-midi" }, { v: "Vendredi soir", l: "Vendredi soir" }]} />
              </fieldset>
              <fieldset className="q">
                <legend>Retour impératif…</legend>
                <Choix nom="retour" valeur={retour} onChange={setRetour} options={[{ v: "Dimanche soir", l: "Dimanche soir" }, { v: "Lundi matin", l: "Lundi matin" }, { v: "Lundi soir", l: "Lundi soir" }]} />
              </fieldset>
            </>
          ) : null}
          <fieldset className="q">
            <legend>As-tu un véhicule disponible pour cet évènement ?</legend>
            <Choix nom="vehicule" valeur={vehicule} onChange={setVehicule} options={[{ v: "Oui", l: "Oui, je peux conduire", ic: "🚗" }, { v: "Non", l: "Non" }]} />
          </fieldset>
        </>
      ) : null}

      {etat && !etat.ok ? <p className="notice err">{etat.message}</p> : null}

      {p.confirmation ? (
        <p className="notice">🔒 Les inscriptions sont closes : c&apos;est le moment de <b>confirmer définitivement</b> ta réponse{p.jusquau ? ` (${p.jusquau})` : ""}. Après validation, tu ne pourras plus la changer.</p>
      ) : null}

      {confirmer ? (
        <div className="confirm-def" role="alertdialog" aria-label="Confirmer la validation définitive">
          <p>
            <b>Valider définitivement ?</b> Ta réponse « {statut} » sera verrouillée : tu ne pourras plus la modifier.
          </p>
          <div>
            <button type="button" className="btn" onClick={() => setConfirmer(false)}>Annuler</button>
            <button className="btn primary" type="submit" name="definitif" value="1" disabled={pending}>🔒 Oui, je valide</button>
          </div>
        </div>
      ) : null}

      <div className="rep-bar">
        {!p.confirmation ? (
          <button className="btn" type="submit" disabled={pending || manque}>
            {pending ? "Envoi…" : "Enregistrer"}
          </button>
        ) : null}
        <Link className="btn rep-stop" href="/inscriptions">✕ Arrêter l&apos;inscription</Link>
        <button type="button" className="btn primary" disabled={pending || manque || statut === "Peut-être"} onClick={() => setConfirmer(true)} title={statut === "Peut-être" ? "Choisis Oui ou Non pour valider définitivement" : undefined}>
          🔒 Valider définitivement
        </button>
      </div>
    </form>
  );
}
