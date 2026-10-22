"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DEPENSES, euro, solde, type Bareme, type EvenementLie, type Mouvement } from "@/lib/cagnotte";
import ChoixEvenement from "./ChoixEvenement";
import { demanderDepense } from "@/app/fiche/cagnotte";
import Historique from "./Historique";

/** The kitty on the player's card: the balance, « Détails › » (history in a side panel) and « use my kitty ». */
export default function CagnotteFiche({ joueurId, nom, montant, groupe, mouvements, bareme, noms, evenements = [] }: {
  joueurId: string; nom: string; montant: number; groupe: string | null; mouvements: Mouvement[] | null; bareme: Bareme[]; noms: Record<string, string>; evenements?: EvenementLie[];
}) {
  const [ev, setEv] = useState<EvenementLie | null>(null);
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [form, setForm] = useState(false);
  const [cat, setCat] = useState<string>(DEPENSES[0].id);
  const [mt, setMt] = useState("");
  const [lib, setLib] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  // With the history installed, the balance comes from it; otherwise the amount of the fiche.
  const valeur = mouvements ? solde(mouvements) : montant;
  const attente = (mouvements || []).filter((m) => m.statut === "en_attente").length;
  const envoyer = () =>
    start(async () => {
      const r = await demanderDepense({ joueurId, categorie: cat, montant: mt, libelle: lib, date, evenement: ev ? { id: ev.id, nom: ev.nom } : null });
      setInfo(r);
      if (r.ok) { setForm(false); setMt(""); setLib(""); router.refresh(); }
    });

  return (
    <>
      <section className="fc-cagnotte fx-cagnotte" aria-label="Cagnotte">
        <span className="fcg-ic" aria-hidden="true">💰</span>
        <span className="fcg-txt">
          <span className="fcg-l">{groupe ? "Cagnotte commune" : "Ma cagnotte"}</span>
          <span className="fcg-s">{groupe ? `👨‍👩‍👧 ${groupe} · ` : ""}{attente ? `⏳ ${attente} en attente · ` : ""}déplacements du club</span>
          {mouvements ? <button type="button" className="fcg-det" onClick={() => setOuvert(true)}>Détails ›</button> : null}
        </span>
        <b className="fcg-v num or-brillant">{euro.format(valeur)}</b>
      </section>
      {ouvert && mouvements ? (
        <Historique
          titre={groupe ? groupe : `Cagnotte de ${nom}`}
          sousTitre={groupe ? "Cagnotte commune" : undefined}
          mouvements={mouvements}
          bareme={bareme}
          noms={groupe ? noms : undefined}
          onClose={() => setOuvert(false)}
          enBas={
            form ? (
              <div className="hc-form">
                <p className="mini-t">Utiliser ma cagnotte</p>
                <div className="hc-types">
                  {DEPENSES.map((d) => <button key={d.id} type="button" className={`hc-type${cat === d.id ? " on" : ""}`} onClick={() => setCat(d.id)}><span aria-hidden="true">{d.ic}</span>{d.id}</button>)}
                </div>
                <ChoixEvenement evenements={evenements} valeur={ev?.id || ""} onChange={(e) => { setEv(e); if (e && !lib) setLib(e.nom); }} />
                <label className="f">Pour quoi ?<input className="input" value={lib} maxLength={120} placeholder="Ex. Open de Paris" onChange={(e) => setLib(e.target.value)} /></label>
                <div className="as-ligne">
                  <label className="f as-court">Montant<input className="input num" inputMode="decimal" value={mt} placeholder="0,00" onChange={(e) => setMt(e.target.value.replace(/[^\d,.]/g, "").slice(0, 8))} /></label>
                  <label className="f as-court">Date<input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
                </div>
                <span className="ig-btns">
                  <button type="button" className="btn primary" disabled={pending} onClick={envoyer}>{pending ? "…" : "📨 Envoyer la demande"}</button>
                  <button type="button" className="btn" onClick={() => setForm(false)}>Annuler</button>
                </span>
                <p className="muted small">Rien n&apos;est déduit avant la validation d&apos;un responsable.</p>
                {info && !info.ok ? <p className="notice err">{info.message}</p> : null}
              </div>
            ) : (
              <>
                {info?.ok ? <p className="notice ok">{info.message}</p> : null}
                <button type="button" className="btn primary hc-utiliser" onClick={() => { setInfo(null); setForm(true); }}>💸 Demander à utiliser ma cagnotte</button>
              </>
            )
          }
        />
      ) : null}
    </>
  );
}
