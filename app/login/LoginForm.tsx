"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

const initial: LoginState = { status: "idle" };

export default function LoginForm({ error }: { error?: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  if (state.status === "sent") {
    return (
      <div className="notice ok" role="status" style={{ marginTop: 16 }}>
        <b>📬 Lien envoyé à {state.email}.</b>
        <br />
        Ouvrez l&apos;e-mail sur cet appareil et cliquez sur le lien pour entrer. Pensez à regarder dans les
        courriers indésirables.
      </div>
    );
  }

  return (
    <form action={action}>
      {error ? <div className="notice err">{error}</div> : null}
      {state.status === "error" ? (
        <div className="notice err" role="alert">
          {state.message}
        </div>
      ) : null}
      <label className="f">
        Votre adresse e-mail
        <input
          className="input"
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          defaultValue={state.email}
          placeholder="prenom.nom@exemple.be"
        />
      </label>
      <button className="btn primary" type="submit" disabled={pending} style={{ minHeight: 50, fontSize: 15 }}>
        {pending ? "Envoi en cours…" : "Recevoir mon lien de connexion"}
      </button>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Pas de mot de passe : vous recevez un lien sécurisé par e-mail, valable une heure.
      </p>
    </form>
  );
}
