"use client";

import { useState, useTransition } from "react";
import type { DemandeEmail } from "@/lib/changement-email";
import { annulerDemandeEmail, demanderChangementEmail } from "./email";

/** The account's e-mail address, and a request to change it (validated by an administrator). */
export default function ChangerEmail({ email, demande, refus }: { email: string; demande: DemandeEmail | null; refus: DemandeEmail | null }) {
  const [ouvert, setOuvert] = useState(false);
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const pareil = n1.trim().toLowerCase() === n2.trim().toLowerCase();
  const envoyer = () =>
    start(async () => {
      if (!pareil) return setInfo({ ok: false, message: "Les deux adresses ne sont pas identiques." });
      const r = await demanderChangementEmail(n1);
      setInfo(r);
      if (r.ok) { setOuvert(false); setN1(""); setN2(""); }
    });

  return (
    <section className="panel pf">
      <div className="hd">
        <h2>📧 Mon adresse e-mail</h2>
        {!ouvert && !demande ? <button type="button" className="btn" onClick={() => { setInfo(null); setOuvert(true); }}>✏️ Changer d&apos;adresse</button> : null}
      </div>
      <div className="bd">
        <p className="pf-mail"><b>{email}</b><small>C&apos;est l&apos;adresse qui te sert à te connecter{" "}: elle est partagée par toutes les personnes de ton compte.</small></p>
        {demande ? (
          <div className="pf-att">
            <span aria-hidden="true">⏳</span>
            <span>Changement vers <b>{demande.nouvel_email}</b> en attente de validation par un administrateur.<small>Demandé le {new Date(demande.cree_le).toLocaleDateString("fr-BE", { timeZone: "Europe/Brussels" })}. Dès qu&apos;il est validé, tu reçois un mail à la nouvelle adresse pour te connecter.</small></span>
            <button type="button" className="btn ghost" disabled={pending} onClick={() => start(async () => setInfo(await annulerDemandeEmail(demande.id)))}>Annuler la demande</button>
          </div>
        ) : null}
        {!demande && refus ? <p className="notice err">❌ Ta demande vers {refus.nouvel_email} n&apos;a pas été acceptée.{refus.motif ? ` Motif : ${refus.motif}` : ""}</p> : null}
        {ouvert ? (
          <div className="pf-form">
            <label className="f">Nouvelle adresse<input className="input" type="email" autoComplete="email" value={n1} maxLength={160} onChange={(e) => setN1(e.target.value)} /></label>
            <label className="f">Confirme la nouvelle adresse<input className="input" type="email" autoComplete="off" value={n2} maxLength={160} onChange={(e) => setN2(e.target.value)} /></label>
            {n2 && !pareil ? <p className="small" style={{ color: "#b3261e", margin: 0 }}>Les deux adresses ne sont pas identiques.</p> : null}
            <p className="small muted">Un administrateur valide le changement. Tu continues à te connecter avec l&apos;adresse actuelle en attendant.</p>
            <div className="pf-bas">
              <button type="button" className="btn primary" disabled={pending || !n1 || !pareil} onClick={envoyer}>{pending ? "Envoi…" : "Envoyer la demande"}</button>
              <button type="button" className="btn ghost" disabled={pending} onClick={() => { setOuvert(false); setInfo(null); }}>Annuler</button>
            </div>
          </div>
        ) : null}
        {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      </div>
    </section>
  );
}
