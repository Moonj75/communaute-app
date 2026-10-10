"use client";

import { useActionState, useState } from "react";
import { inviterMembre, type InviteState } from "./invite";

const SITE = "https://lions-eugies.vercel.app";

export default function InviteCell({
  email,
  prenom,
  actif: _actif,
  connecte,
  inviteLe,
}: {
  email: string;
  prenom: string | null;
  actif: boolean;
  connecte: boolean;
  inviteLe: string | null;
}) {
  const [state, action, pending] = useActionState(inviterMembre, {} as InviteState);
  const [copied, setCopied] = useState(false);

  const message =
    `Bonjour${prenom ? " " + prenom : ""} 🦁\n` +
    `Le SC Lions d'Eugies a maintenant son espace membres : ${SITE}\n` +
    `Entre ton adresse e-mail (${email}) puis clique sur le lien que tu recevras : ` +
    `tu y trouveras ta fiche, ta cagnotte et bientôt tes inscriptions aux compétitions.`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copiez ce message :", message);
    }
  }

  const etat = state.ok ? "✓ Envoyé" : inviteLe ? `Invité le ${new Date(inviteLe).toLocaleDateString("fr-BE", { timeZone: "Europe/Brussels", day: "2-digit", month: "2-digit" })}` : connecte ? "Connecté" : "Pas invité";
  // A compact cell: the status only; the choices appear when the mouse is over it (or on a tap).
  return (
    <div className="inv" tabIndex={0}>
      <span className={`inv-etat${state.ok ? " ok" : ""}${state.error ? " err" : ""}`} title={state.error || undefined}>
        {state.error ? "⚠️ Erreur" : etat} <span className="inv-fl" aria-hidden="true">▾</span>
      </span>
      <div className="inv-menu" role="menu">
        <form action={action}>
          <input type="hidden" name="email" value={email} />
          <button className="inv-b" type="submit" disabled={pending} role="menuitem">
            {pending ? "Envoi…" : inviteLe || connecte ? "✉️ Renvoyer l'e-mail" : "✉️ Inviter par e-mail"}
          </button>
        </form>
        <button className="inv-b" type="button" onClick={copy} role="menuitem" title="Copier un message à coller dans WhatsApp ou SMS">
          {copied ? "✓ Copié" : "📋 Message WhatsApp"}
        </button>
      </div>
    </div>
  );
}
