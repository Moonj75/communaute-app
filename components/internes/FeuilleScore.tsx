"use client";

import { useState, useTransition } from "react";
import "./feuille.css";

type J = { id: string; nom: string; n?: number | string | null };
export type RetourFeuille = { ok: boolean; message: string };

/**
 * Score sheet (rises from the bottom of the screen), the same everywhere a score is typed:
 * the two players face to face, a big number for each with − / +, the scores already typed by the players
 * (one tap takes them), « who goes through » when a knockout match is a draw, and one big button that says what it does.
 */
export default function FeuilleScore({ titre = "Score du match", ou, gauche, droite, init, propositions = [], ko, note, enregistrer, effacer, fermer }: {
  titre?: string;
  /** Competition · stage · group. */
  ou?: string;
  gauche: J;
  droite: J;
  init?: { a: number | null; b: number | null; v?: string | null };
  /** Scores typed by the players, read from the left player's side. */
  propositions?: { auteur: string; a: number; b: number; v?: string | null }[];
  /** Draw in a knockout match: who goes on (« passe ») or up (« monte »). */
  ko?: "passe" | "monte" | null;
  note?: string;
  enregistrer: (a: number, b: number, v: string | null) => Promise<RetourFeuille>;
  effacer?: () => Promise<RetourFeuille>;
  fermer: () => void;
}) {
  const [a, setA] = useState(init?.a ?? 0);
  const [b, setB] = useState(init?.b ?? 0);
  const [v, setV] = useState<string | null>(init?.v ?? null);
  const [info, setInfo] = useState<RetourFeuille | null>(null);
  const [pending, start] = useTransition();
  const nul = a === b;
  const manqueV = Boolean(ko && nul && !v);
  const go = (f: () => Promise<RetourFeuille>) => start(async () => { const r = await f(); setInfo(r); if (r.ok) fermer(); });
  const compteur = (val: number, set: (n: number) => void, j: J) => (
    <div className={`fs-c${a !== b && (val === Math.max(a, b)) ? " gagne" : ""}`}>
      <button type="button" className="fs-pm" aria-label={`Un but de plus pour ${j.nom}`} onClick={() => set(Math.min(99, val + 1))}>+</button>
      <input className="fs-n num" inputMode="numeric" aria-label={`Buts de ${j.nom}`} value={val} onFocus={(e) => e.target.select()} onChange={(e) => set(Math.min(99, Number(e.target.value.replace(/\D/g, "").slice(-2)) || 0))} />
      <button type="button" className="fs-pm moins" aria-label={`Un but de moins pour ${j.nom}`} disabled={val === 0} onClick={() => set(Math.max(0, val - 1))}>−</button>
    </div>
  );
  return (
    <div className="fs-fond" onClick={() => !pending && fermer()}>
      <div className="fs" role="dialog" aria-label={titre} onClick={(e) => e.stopPropagation()}>
        <span className="fs-poignee" aria-hidden="true" />
        <p className="fs-t">⚽ {titre}</p>
        {ou ? <p className="fs-ou">{ou}</p> : null}
        <div className="fs-duel">
          <span className="fs-j">{gauche.n != null ? <span className="fs-r num">{gauche.n}</span> : null}<b>{gauche.nom}</b></span>
          <span />
          <span className="fs-j">{droite.n != null ? <span className="fs-r num">{droite.n}</span> : null}<b>{droite.nom}</b></span>
          {compteur(a, setA, gauche)}
          <span className="fs-tiret">–</span>
          {compteur(b, setB, droite)}
        </div>
        {propositions.length ? (
          <div className="fs-props">
            {propositions.map((p) => (
              <button key={p.auteur} type="button" className={`fs-prop${p.a === a && p.b === b ? " on" : ""}`} onClick={() => { setA(p.a); setB(p.b); if (p.v) setV(p.v); }}>
                <small>Mis par {p.auteur}</small><b className="num">{p.a} – {p.b}</b>
              </button>
            ))}
            {propositions.length === 2 && (propositions[0].a !== propositions[1].a || propositions[0].b !== propositions[1].b) ? <p className="fs-desac">⚠️ Les deux joueurs ne sont pas d&apos;accord : choisis le bon score.</p> : null}
          </div>
        ) : null}
        {ko && nul ? (
          <div className="fs-v">
            <p>Égalité : qui {ko === "monte" ? "monte" : "passe"} ? <small>(prolongations / tirs)</small></p>
            <span>
              {[gauche, droite].map((j) => <button key={j.id} type="button" className={v === j.id ? "on" : undefined} onClick={() => setV(j.id)}>{j.nom}</button>)}
            </span>
          </div>
        ) : null}
        {info && !info.ok ? <p className="notice err">{info.message}</p> : null}
        <button type="button" className="fs-ok" disabled={pending || manqueV} onClick={() => go(() => enregistrer(a, b, ko && nul ? v : null))}>
          {pending ? "Enregistrement…" : <>✓ Valider <b className="num">{a} – {b}</b></>}
        </button>
        {note ? <p className="fs-note">{note}</p> : null}
        <span className="fs-bas">
          {effacer ? <button type="button" disabled={pending} onClick={() => go(effacer)}>🗑️ Effacer le score</button> : <span />}
          <button type="button" disabled={pending} onClick={fermer}>Annuler</button>
        </span>
      </div>
    </div>
  );
}
