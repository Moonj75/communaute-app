"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Compact « refresh from Notion » button, placed at the right of the fixed title line. */
export default function Rafraichir({ action }: { action: () => Promise<{ ok: boolean; message?: string }> }) {
  const [pending, start] = useTransition();
  const [etat, setEtat] = useState<{ ok: boolean; txt: string } | null>(null);
  const router = useRouter();
  const heure = () => new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
  return (
    <span className="rf">
      {etat ? (
        <small className={`rf-msg${etat.ok ? " ok" : " err"}`} role="status">{etat.txt}</small>
      ) : null}
      <button
        type="button"
        className={`rf-btn${pending ? " tourne" : ""}${etat?.ok ? " fait" : ""}`}
        disabled={pending}
        title="Recharger les dernières données de Notion"
        onClick={() =>
          start(async () => {
            const r = await action();
            setEtat(r.ok ? { ok: true, txt: `À jour · ${heure()}` } : { ok: false, txt: r.message || "Erreur" });
            router.refresh();
            setTimeout(() => setEtat(null), 4000); // the message fades after a few seconds
          })
        }
      >
        <svg className="rf-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9M18.5 3v4.5H14M5.5 21v-4.5H10" />
        </svg>
        <span className="rf-t">{pending ? "Mise à jour…" : "Notion"}</span>
      </button>
    </span>
  );
}
