"use client";
// app/error.tsx — page shown instead of « Application error » when something goes wrong.

import { useEffect } from "react";

export default function Erreur({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="wrap" style={{ padding: "48px 16px", textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
      <p style={{ fontSize: 48, margin: 0 }} aria-hidden="true">🦁</p>
      <h2>Oups, un petit souci</h2>
      <p>La page n&apos;a pas pu s&apos;afficher. Le plus souvent, l&apos;appli vient d&apos;être mise à jour : recharge la page et réessaie.</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
        <button className="btn primary" type="button" onClick={() => window.location.reload()}>🔄 Recharger la page</button>
        <button className="btn" type="button" onClick={() => reset()}>Réessayer</button>
        <a className="btn" href="/">🏠 Accueil</a>
      </div>
      {error.digest ? <p className="small muted" style={{ marginTop: 18 }}>Code pour le staff : {error.digest}</p> : null}
    </main>
  );
}
