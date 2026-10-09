"use client";

import { useActionState } from "react";
import { envoyerManuel, type RetourEnvoi } from "./actions";

export default function FormEnvoi({ evenements, cible }: { evenements: { id: string; nom: string }[]; cible?: string }) {
  const [etat, action, pending] = useActionState<RetourEnvoi | null, FormData>(envoyerManuel, null);
  return (
    <form action={action} className="envoi">
      <label className="f">
        Destinataires
        <select className="input" name="cible" defaultValue={cible || "tous"}>
          <option value="tous">Tous les joueurs actifs</option>
          <option value="staff">Le staff (administrateurs)</option>
          {evenements.map((e) => (
            <option key={"a" + e.id} value={`attente:${e.id}`}>Sans réponse · {e.nom}</option>
          ))}
          {evenements.map((e) => (
            <option key={"o" + e.id} value={`oui:${e.id}`}>Inscrits « Oui » · {e.nom}</option>
          ))}
        </select>
      </label>
      <label className="f">
        Titre
        <input className="input" name="titre" required maxLength={80} placeholder="Ex. 🏁 Dernier rappel pour Majorque" />
      </label>
      <label className="f">
        Message
        <textarea className="input area" name="message" maxLength={240} rows={3} placeholder="Ex. Il reste 2 jours pour répondre, on compte sur toi !" />
      </label>
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Envoi…" : "📣 Envoyer maintenant"}
      </button>
      {etat ? <p className={`notice ${etat.ok ? "ok" : "err"}`}>{etat.message}</p> : null}
    </form>
  );
}
