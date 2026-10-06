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
          <b>✓ {state.importes} joueurs à jour</b> depuis la Liste des joueurs de Notion
          {state.inactifs ? ` (dont ${state.inactifs} inactifs, qui ne peuvent pas se connecter)` : ""}.
          {state.sansEmail && state.sansEmail.length ? (
            <div style={{ marginTop: 6 }}>
              ⚠️ Sans e-mail dans Notion, donc non importés : <b>{state.sansEmail.join(", ")}</b>.
            </div>
          ) : null}
          {state.doublons && state.doublons.length ? (
            <div style={{ marginTop: 6 }}>⚠️ Doublons ignorés : {state.doublons.join(" ; ")}.</div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
