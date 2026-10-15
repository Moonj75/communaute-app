"use client";

import { useActionState, useState } from "react";
import { envoyerContact, type EtatContact } from "./actions";

const CHOIX = ["Un ami, la famille", "Internet, réseaux", "Un tournoi, une démo", "J'y jouais jeune", "Autre"];

/** Contact form for visitors: details, how they discovered Subbuteo, their message. */
export default function Formulaire() {
  const [etat, action, envoi] = useActionState<EtatContact, FormData>(envoyerContact, {});
  const [choix, setChoix] = useState("");
  if (etat.ok) {
    return (
      <div className="ct-merci">
        <span aria-hidden="true">🦁</span>
        <h3>Message envoyé !</h3>
        <p>{etat.message}</p>
        <a className="btn primary" href="/club">Retour à l&apos;accueil</a>
      </div>
    );
  }
  return (
    <form action={action} className="ct-form">
      <fieldset>
        <legend>Tes coordonnées</legend>
        <div className="ct-2">
          <input className="input" name="prenom" required maxLength={80} autoComplete="given-name" placeholder="Prénom *" aria-label="Prénom" />
          <input className="input" name="nom" maxLength={80} autoComplete="family-name" placeholder="Nom" aria-label="Nom" />
        </div>
        <div className="ct-2">
          <input className="input" type="email" name="email" required maxLength={160} autoComplete="email" inputMode="email" placeholder="E-mail *" aria-label="E-mail" />
          <input className="input" type="tel" name="telephone" maxLength={40} autoComplete="tel" inputMode="tel" placeholder="Téléphone" aria-label="Téléphone" />
        </div>
      </fieldset>
      <fieldset>
        <legend>Comment as-tu découvert le Subbuteo ?</legend>
        <input type="hidden" name="decouverte_choix" value={choix} />
        <div className="ct-chips">
          {CHOIX.map((c) => (
            <button key={c} type="button" className={`ct-chip${choix === c ? " on" : ""}`} onClick={() => setChoix(choix === c ? "" : c)}>{choix === c ? "✓ " : ""}{c}</button>
          ))}
        </div>
        <textarea className="input area" name="decouverte" rows={1} maxLength={900} placeholder="Précise si tu veux (facultatif)" />
      </fieldset>
      <fieldset>
        <legend>Ton message</legend>
        <textarea className="input area" name="message" rows={2} maxLength={3000} placeholder="Ta question, ton envie de venir essayer, un âge, une disponibilité…" />
      </fieldset>
      {/* Anti-robot field, invisible to people. */}
      <input type="text" name="site" tabIndex={-1} autoComplete="off" className="ct-piege" aria-hidden="true" />
      {etat.ok === false ? <p className="notice err">{etat.message}</p> : null}
      <button className="btn primary ct-go" type="submit" disabled={envoi}>{envoi ? "Envoi…" : "✉️ Envoyer"}</button>
      <p className="small muted">Tes coordonnées servent uniquement au club pour te répondre.</p>
    </form>
  );
}
