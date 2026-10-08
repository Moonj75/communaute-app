"use client";

import { useActionState } from "react";
import { synchroniserNotion, type SyncState } from "./sync";

export default function SyncPanel({ last }: { last: string | null }) {
  const [state, action, pending] = useActionState(async () => synchroniserNotion(), {} as SyncState);
  const lastTxt = state.at || last;
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <button className="btn primary" type="submit" disabled={pending} style={{ minHeight: 50, fontSize: 15 }}>
          {pending ? "Synchronisation…" : "🔄 Synchroniser avec Notion"}
        </button>
        <span className="muted" style={{ fontSize: 13 }}>
          {lastTxt
            ? "Dernière synchronisation : " +
              new Date(lastTxt).toLocaleString("fr-BE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Brussels" })
            : "Jamais synchronisé"}
        </span>
      </div>
      {state.error ? <div className="notice err">{state.error}</div> : null}
      {state.ok ? (
        <div className="notice ok">
          <b>✓ {state.personnes} fiches</b> et <b>{state.comptes} comptes de connexion</b> à jour depuis Notion
          {state.inactifs ? ` (${state.inactifs} comptes inactifs ne peuvent pas se connecter)` : ""}.
          {state.familles && state.familles.length ? (
            <div style={{ marginTop: 6 }}>👨‍👧 Comptes famille : {state.familles.join(" ; ")}.</div>
          ) : null}
          {state.sansEmail && state.sansEmail.length ? (
            <div style={{ marginTop: 6 }}>
              ⚠️ Joueurs actifs sans e-mail (ils ne peuvent pas se connecter) : <b>{state.sansEmail.join(", ")}</b>.
            </div>
          ) : null}
          {state.photos ? <div style={{ marginTop: 6 }}>📷 {state.photos} photo(s) mise(s) à jour depuis Notion.</div> : null}
          {state.avertissement ? <div style={{ marginTop: 6 }}>⚠️ {state.avertissement}</div> : null}
        </div>
      ) : null}
    </form>
  );
}
