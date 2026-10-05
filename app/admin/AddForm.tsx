"use client";

import { useActionState, useEffect, useRef } from "react";
import { addMembre, type AdminState } from "./actions";

export default function AddForm() {
  const [state, action, pending] = useActionState(addMembre, {} as AdminState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {state.ok ? <div className="notice ok">✓ {state.ok}</div> : null}
      {state.error ? <div className="notice err">{state.error}</div> : null}
      <div className="addform">
        <label className="f">
          E-mail
          <input className="input" name="email" type="email" required placeholder="prenom.nom@exemple.be" />
        </label>
        <label className="f">
          Prénom
          <input className="input" name="prenom" />
        </label>
        <label className="f">
          Nom
          <input className="input" name="nom" required />
        </label>
        <label className="f">
          Rôle
          <select className="input" name="role" defaultValue="joueur">
            <option value="joueur">Joueur</option>
            <option value="admin">Administrateur</option>
          </select>
        </label>
        <button className="btn primary" type="submit" disabled={pending} style={{ minHeight: 50 }}>
          {pending ? "Ajout…" : "+ Ajouter"}
        </button>
      </div>
    </form>
  );
}
