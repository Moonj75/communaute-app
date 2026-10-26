"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DemandeEmail } from "@/lib/changement-email";
import { traiterDemandeEmail } from "./emails";

/** Requests to change an account's e-mail: validate (with a confirmation) or refuse. */
export default function DemandesEmail({ demandes, historique }: { demandes: DemandeEmail[]; historique: DemandeEmail[] }) {
  const router = useRouter();
  const [conf, setConf] = useState<{ d: DemandeEmail; ok: boolean } | null>(null);
  const [motif, setMotif] = useState("");
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const date = (s: string) => new Date(s).toLocaleDateString("fr-BE", { timeZone: "Europe/Brussels" });
  const go = () =>
    start(async () => {
      if (!conf) return;
      const r = await traiterDemandeEmail(conf.d.id, conf.ok, motif);
      setInfo(r);
      if (r.ok) { setConf(null); setMotif(""); router.refresh(); }
    });

  return (
    <div className="de">
      {info && !conf ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      {!demandes.length ? <p className="vide">Aucune demande en attente.</p> : (
        <ul className="de-l">
          {demandes.map((d) => (
            <li key={d.id} className="de-c">
              <p className="de-qui"><b>{d.nom || d.ancien_email}</b><small>demandé le {date(d.cree_le)}</small></p>
              <p className="de-ch"><span>{d.ancien_email}</span><i aria-hidden="true">→</i><b>{d.nouvel_email}</b></p>
              <span className="de-act">
                <button type="button" className="btn primary" onClick={() => { setInfo(null); setConf({ d, ok: true }); }}>✓ Valider</button>
                <button type="button" className="btn" onClick={() => { setInfo(null); setConf({ d, ok: false }); }}>✕ Refuser</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {historique.length ? (
        <details className="de-h">
          <summary>Dernières demandes traitées ({historique.length})</summary>
          <ul>{historique.map((d) => <li key={d.id}>{d.statut === "valide" ? "✅" : d.statut === "refuse" ? "❌" : "↩️"} {d.ancien_email} → {d.nouvel_email} <small className="muted">· {d.traite_le ? date(d.traite_le) : ""}{d.traite_par ? ` · ${d.traite_par}` : ""}{d.motif ? ` · ${d.motif}` : ""}</small></li>)}</ul>
        </details>
      ) : null}

      {conf ? (
        <div className="ig-fond" onClick={() => !pending && setConf(null)}>
          <div className="ig-saisie" role="dialog" aria-label="Confirmer" onClick={(e) => e.stopPropagation()}>
            <p className="ig-qui">{conf.ok ? "Valider le changement ?" : "Refuser le changement ?"}</p>
            <p style={{ margin: 0, textAlign: "center" }}>{conf.d.nom ? <><b>{conf.d.nom}</b><br /></> : null}{conf.d.ancien_email}<br />→ <b>{conf.d.nouvel_email}</b></p>
            {conf.ok ? (
              <p className="muted small" style={{ textAlign: "center" }}>L&apos;adresse change partout (connexion, appli, Notion) pour toutes les personnes de ce compte. Un mail part à la nouvelle adresse avec le lien pour se connecter.</p>
            ) : (
              <input className="input" value={motif} maxLength={200} placeholder="Motif (facultatif)" onChange={(e) => setMotif(e.target.value)} />
            )}
            <span className="ig-btns">
              <button type="button" className="btn primary" disabled={pending} onClick={go}>{pending ? "…" : conf.ok ? "✓ Oui, valider" : "Oui, refuser"}</button>
              <button type="button" className="btn" disabled={pending} onClick={() => setConf(null)}>Annuler</button>
            </span>
            {info && !info.ok ? <p className="notice err">{info.message}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
