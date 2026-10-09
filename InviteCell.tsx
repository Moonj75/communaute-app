"use client";

import { useActionState, useState } from "react";
import { inviterMembre, type InviteState } from "./invite";

const SITE = "https://lions-eugies.vercel.app";

export default function InviteCell({
  email,
  prenom,
  actif,
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 190 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <form action={action}>
          <input type="hidden" name="email" value={email} />
          <button className="btn" type="submit" disabled={pending} style={{ minHeight: 36, padding: "0 10px", fontSize: 13 }}>
            {pending ? "Envoi…" : inviteLe || connecte ? "✉️ Renvoyer" : "✉️ Inviter"}
          </button>
        </form>
        <button className="btn" type="button" onClick={copy} style={{ minHeight: 36, padding: "0 10px", fontSize: 13 }} title="Copier un message à coller dans WhatsApp ou SMS">
          {copied ? "✓ Copié" : "📋 WhatsApp"}
        </button>
      </div>
      {state.ok ? <span style={{ fontSize: 12, color: "var(--yes)", fontWeight: 700 }}>{state.ok}</span> : null}
      {state.error ? <span style={{ fontSize: 12, color: "var(--no)", fontWeight: 700 }}>{state.error}</span> : null}
      {!state.ok && inviteLe ? (
        <span className="muted" style={{ fontSize: 12 }}>
          Invité le {new Date(inviteLe).toLocaleDateString("fr-BE", { timeZone: "Europe/Brussels" })}
        </span>
      ) : null}
    </div>
  );
}
