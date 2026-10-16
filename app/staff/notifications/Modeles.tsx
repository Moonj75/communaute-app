"use client";

import { useState, useTransition } from "react";
import { remplir, type Modele } from "@/lib/modeles-notifs";
import { enregistrerModele, retablirModele, type RetourEnvoi } from "./actions";
import Apercu from "./Apercu";

const NOMS_MOTS: Record<string, string> = {
  competition: "compétition",
  limite: "date limite",
  validation: "date de validation",
  date: "date de la compétition",
  lieu: "lieu",
  n: "nombre",
  liste: "liste des tâches",
  detail: "résumé (retard / aujourd'hui / bientôt)",
};

/**
 * The automatic messages as bands that unfold: tap one to see when it leaves and for whom,
 * the message as the player will see it, and to change its text or switch it off.
 */
export default function Modeles({ modeles, defauts, exemple }: { modeles: Modele[]; defauts: Modele[]; exemple: Record<string, string> | null }) {
  return (
    <div className="nm-l">
      {modeles.map((m) => (
        <Pli key={m.cle} m={m} d={defauts.find((x) => x.cle === m.cle)!} exemple={exemple} />
      ))}
    </div>
  );
}

function Pli({ m, d, exemple }: { m: Modele; d: Modele; exemple: Record<string, string> | null }) {
  const [titre, setTitre] = useState(m.titre);
  const [texte, setTexte] = useState(m.texte);
  const [actif, setActif] = useState(m.actif);
  const [retour, setRetour] = useState<RetourEnvoi | null>(null);
  const [pending, start] = useTransition();
  const modifie = m.titre !== d.titre || m.texte !== d.texte || !m.actif;
  const change = titre !== m.titre || texte !== m.texte || actif !== m.actif;
  // Example values: the next real competition when there is one, otherwise a made-up one.
  const mots = m.mots.includes("competition") && exemple ? exemple : m.exemple;

  const ajouter = (mot: string) => setTexte((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}{${mot}}`);
  const enregistrer = () => start(async () => setRetour(await enregistrerModele(m.cle, titre, texte, actif)));
  const retablir = () =>
    start(async () => {
      const r = await retablirModele(m.cle);
      setRetour(r);
      if (r.ok) { setTitre(d.titre); setTexte(d.texte); setActif(true); }
    });

  return (
    <details className={`nm-pli${actif ? "" : " coupe"}`}>
      <summary>
        <span className="nm-ic" aria-hidden="true">{m.ic}</span>
        <span className="nm-s">
          <b>{m.libelle}</b>
          <small>{m.quand}</small>
        </span>
        <span className={`nm-etat${actif ? (modifie ? " mod" : "") : " off"}`}>{!actif ? "Coupé" : modifie ? "Modifié" : "Actif"}</span>
        <span className="nm-fl" aria-hidden="true">▾</span>
      </summary>
      <div className="nm-corps">
        <p className="nm-qui"><span>Pour qui</span> {m.pourQui}</p>
        <div className="nm-ed">
          <div className="nm-champs">
            <label className="f">
              Titre
              <input className="input" value={titre} maxLength={120} onChange={(e) => setTitre(e.target.value)} />
            </label>
            <label className="f">
              Texte
              <textarea className="input area" value={texte} maxLength={400} rows={3} onChange={(e) => setTexte(e.target.value)} />
            </label>
            <div className="nm-mots">
              <span>Ajouter :</span>
              {m.mots.map((k) => (
                <button key={k} type="button" className="nm-mot" onClick={() => ajouter(k)} title={`Remplacé par : ${mots[k] || "…"}`}>
                  {NOMS_MOTS[k] || k}
                </button>
              ))}
            </div>
            <label className="nm-actif">
              <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} /> Envoyer ce message automatiquement
            </label>
          </div>
          <Apercu titre={remplir(titre, mots)} texte={remplir(texte, mots)} rangement={m.rangement} />
        </div>
        <div className="nm-act">
          <button type="button" className="btn primary" disabled={!change || pending} onClick={enregistrer}>{pending ? "…" : "💾 Enregistrer"}</button>
          {modifie ? <button type="button" className="btn" disabled={pending} onClick={retablir}>↺ Texte d&apos;origine</button> : null}
        </div>
        {retour ? <p className={`notice ${retour.ok ? "ok" : "err"}`}>{retour.message}</p> : null}
      </div>
    </details>
  );
}
