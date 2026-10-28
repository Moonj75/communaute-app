"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendMagicLink, verifierCode, type CodeState, type LoginState } from "./actions";
import Aide from "./Aide";

const initial: LoginState = { status: "idle" };
const initialCode: CodeState = { status: "idle" };

/** Step 2: the code of the e-mail, typed here (works in the installed app, whatever opens the mail). */
function SaisieCode({ email, recommencer }: { email: string; recommencer: () => void }) {
  const [state, action, pending] = useActionState(verifierCode, initialCode);
  const [aide, setAide] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  useEffect(() => { champ.current?.focus(); }, []);
  if (state.status === "aide" && state.cas) return <Aide cas={state.cas} email={email} />;
  if (aide) return <Aide cas="code" email={email} />;
  return (
    <form action={action} className="login-code">
      <div className="notice ok" role="status">
        <b>📬 Mail envoyé à {email}.</b>
        <br />
        Il contient un <b>code à 6 chiffres</b> : tape-le ci-dessous. Pense à regarder dans les courriers indésirables.
      </div>
      {state.status === "error" ? <div className="notice err" role="alert">{state.message}</div> : null}
      <input type="hidden" name="email" value={email} />
      <label className="f">
        Code reçu par e-mail
        <input
          ref={champ}
          className="input login-chiffres"
          name="code"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,12}"
          maxLength={12}
          placeholder="123456"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length === 6 && !pending) e.target.form?.requestSubmit();
          }}
        />
      </label>
      <button className="btn primary" type="submit" disabled={pending} style={{ minHeight: 50, fontSize: 15 }}>
        {pending ? "Vérification…" : "Entrer dans mon espace"}
      </button>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Tu peux aussi cliquer sur le lien du mail, mais seulement si tu l&apos;ouvres sur cet appareil, dans ce navigateur.
        Avec l&apos;application installée, utilise le code.
      </p>
      <button type="button" className="btn ghost" onClick={recommencer}>↺ Changer d&apos;adresse ou renvoyer un code</button>
      <button type="button" className="btn ghost" onClick={() => setAide(true)}>📭 Je ne reçois pas le code / il ne marche pas</button>
    </form>
  );
}

export default function LoginForm({ error }: { error?: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  if (state.status === "sent") return <SaisieCode email={state.email || ""} recommencer={() => window.location.assign("/login")} />;
  // Not (or no longer) in the club: the help page made for that situation.
  if (state.status === "aide" && state.cas) return <Aide cas={state.cas} email={state.email || ""} nom={state.nom} />;

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
        {pending ? "Envoi en cours…" : "Recevoir mon code de connexion"}
      </button>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Pas de mot de passe : tu reçois par e-mail un code à 6 chiffres, valable une heure.
      </p>
    </form>
  );
}
