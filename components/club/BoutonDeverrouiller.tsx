"use client";
// components/club/BoutonDeverrouiller.tsx — staff button « Déverrouiller » in the participants table.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deverrouillerReponse } from "@/app/staff/actions";

export default function BoutonDeverrouiller({ id, nom }: { id: string; nom: string }) {
  const [enCours, demarrer] = useTransition();
  const [fait, setFait] = useState(false);
  const router = useRouter();
  if (fait) return <span className="tb-bt-ok">🔓 Déverrouillée</span>;
  return (
    <button type="button" className="tb-bt dv" disabled={enCours} title={`${nom} pourra de nouveau modifier sa réponse`}
      onClick={() => {
        if (!window.confirm(`Déverrouiller la réponse de ${nom} ? Il pourra de nouveau la modifier lui-même.`)) return;
        demarrer(async () => {
          const r = await deverrouillerReponse(id);
          if (r.ok) { setFait(true); router.refresh(); } else window.alert(r.message || "Impossible de déverrouiller.");
        });
      }}>
      {enCours ? "…" : "🔓 Déverrouiller"}
    </button>
  );
}
