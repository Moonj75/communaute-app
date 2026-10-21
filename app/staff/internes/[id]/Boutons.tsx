"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cloturerEtape, supprimerCompetition } from "../actions";

/** Close the current stage now, or delete the whole competition (each with a confirmation). */
export default function Boutons({ id, enCours, etape }: { id: string; enCours: boolean; etape: string }) {
  const router = useRouter();
  const [conf, setConf] = useState<"" | "cloturer" | "supprimer">("");
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="ci-boutons">
      {enCours ? (
        conf === "cloturer" ? (
          <span className="jr-conf">Clôturer « {etape} » maintenant ? Les matchs non joués ne compteront pas.
            <button type="button" className="btn primary" disabled={pending} onClick={() => start(async () => { const r = await cloturerEtape(id); setInfo(r); setConf(""); router.refresh(); })}>Oui</button>
            <button type="button" className="btn" onClick={() => setConf("")}>Non</button>
          </span>
        ) : <button type="button" className="btn" onClick={() => setConf("cloturer")}>⏭️ Clôturer l&apos;étape en cours</button>
      ) : null}
      {conf === "supprimer" ? (
        <span className="jr-conf">Supprimer toute la compétition, ses poules et ses scores ?
          <button type="button" className="btn jr-oui" disabled={pending} onClick={() => start(async () => { await supprimerCompetition(id); })}>Oui, supprimer</button>
          <button type="button" className="btn" onClick={() => setConf("")}>Non</button>
        </span>
      ) : <button type="button" className="btn" onClick={() => setConf("supprimer")}>🗑️ Supprimer</button>}
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
    </div>
  );
}
