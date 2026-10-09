"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function Rafraichir({ action }: { action: () => Promise<{ ok: boolean; message?: string }> }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  return (
    <span className="refresh">
      <button
        type="button"
        className="btn"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await action();
            setMsg(r.ok ? "À jour ✓" : r.message || "Erreur");
            router.refresh();
          })
        }
      >
        {pending ? "Mise à jour…" : "🔄 Rafraîchir depuis Notion"}
      </button>
      {msg ? <small className="muted">{msg}</small> : null}
    </span>
  );
}
