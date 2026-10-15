"use client";

import { useActionState, useEffect, useState } from "react";
import { envoyerMessage, type EtatMessage } from "./actions";

type Props = { mode: "admin" | "staff"; comptes?: { email: string; nom: string }[]; parent?: string; titreInit?: string; pour?: string[]; compact?: boolean };

/**
 * Write a message: staff → chosen accounts; player → the staff.
 * After sending, the confirmation shows and a fresh empty form is ready for the next message.
 */
export default function Ecrire(props: Props) {
  const [n, setN] = useState(0);
  const [ok, setOk] = useState<string | null>(null);
  return (
    <>
      {ok ? <p className="cr-ok">{ok}</p> : null}
      <Formulaire key={n} {...props} envoye={(m) => { setOk(m); setN((x) => x + 1); }} />
    </>
  );
}

function Formulaire({ mode, comptes = [], parent, titreInit = "", pour, compact = false, envoye }: Props & { envoye: (m: string) => void }) {
  const [etat, action, envoi] = useActionState<EtatMessage, FormData>(envoyerMessage, {});
  const [a, setA] = useState<string[]>(pour || []);
  const [cherche, setCherche] = useState("");
  useEffect(() => {
    if (etat.ok) envoye(etat.message || "✓ Message envoyé.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat]);
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
