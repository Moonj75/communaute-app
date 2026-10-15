"use client";

import { useActionState, useState } from "react";
import { envoyerMessage, type EtatMessage } from "./actions";

/** Write a message: staff → chosen accounts; player → the staff. */
export default function Ecrire({ mode, comptes = [], parent, titreInit = "", pour, compact = false }: { mode: "admin" | "staff"; comptes?: { email: string; nom: string }[]; parent?: string; titreInit?: string; pour?: string[]; compact?: boolean }) {
  const [etat, action, envoi] = useActionState<EtatMessage, FormData>(envoyerMessage, {});
  const [a, setA] = useState<string[]>(pour || []);
  const [cherche, setCherche] = useState("");
  if (etat.ok) return <p className="cr-ok">{etat.message}</p>;
  const visibles = comptes.filter((c) => !cherche || c.nom.toLowerCase().includes(cherche.toLowerCase()));
  return (
    <form action={action} className={`cr-form${compact ? " compact" : ""}`}>
      {parent ? <input type="hidden" name="parent" value={parent} /> : null}
      {mode === "admin" ? (
        <>
          {a.map((e) => <input key={e} type="hidden" name="a" value={e} />)}
          {!pour ? (
            <fieldset className="cr-dest">
              <legend>À qui ? <small>{a.length ? `${a.length} choisi(s)` : "personne"}</small></legend>
              <div className="cr-rapide">
                <input className="input" placeholder="Chercher un joueur…" value={cherche} onChange={(e) => setCherche(e.currentTarget.value)} />
                <button type="button" className="btn" onClick={() => setA(comptes.map((c) => c.email))}>Tous</button>
                <button type="button" className="btn" onClick={() => setA([])}>Aucun</button>
              </div>
              <div className="cr-chips">
                {visibles.map((c) => {
                  const on = a.includes(c.email);
                  return <button key={c.email} type="button" className={`cr-chip${on ? " on" : ""}`} onClick={() => setA(on ? a.filter((x) => x !== c.email) : [...a, c.email])}>{on ? "✓ " : ""}{c.nom}</button>;
                })}
              </div>
            </fieldset>
          ) : null}
        </>
      ) : (
        <input type="hidden" name="pour" value="staff" />
      )}
      <input className="input" name="titre" required maxLength={140} placeholder="Objet" defaultValue={titreInit} />
      <textarea className="input area" name="texte" required maxLength={4000} rows={compact ? 3 : 5} placeholder={mode === "admin" ? "Ton message aux joueurs…" : "Ton message au staff du club…"} />
      {etat.ok === false ? <p className="notice err">{etat.message}</p> : null}
      <button className="btn primary" type="submit" disabled={envoi || (mode === "admin" && !a.length)}>{envoi ? "Envoi…" : mode === "admin" ? `✉️ Envoyer${a.length ? ` (${a.length})` : ""}` : "✉️ Envoyer au staff"}</button>
    </form>
  );
}
