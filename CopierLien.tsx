"use client";

import { useState } from "react";

export default function CopierLien({ texte, label = "📋 Copier pour WhatsApp" }: { texte: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texte);
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        } catch {
          window.prompt("Copie ce texte :", texte);
        }
      }}
    >
      {ok ? "Copié ✓" : label}
    </button>
  );
}
