"use client";

import { useState, useTransition } from "react";
import { enregistrerConcernes } from "@/app/staff/actions";

type J = { id: string; nom: string };

/**
 * Staff: who the competition's form is for. By default every active player; untick players
 * to keep the form for the others (the unticked ones see it greyed and count as « Non »).
 */
export default function ChoixJoueurs({ evId, joueurs, choisis }: { evId: string; joueurs: J[]; choisis: string[] | null }) {
  const [sel, setSel] = useState<string[]>(choisis || joueurs.map((j) => j.id));
  const [ouvert, setOuvert] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pending, start] = useTransition();
  const tous = sel.length === joueurs.length;
  const basculer = (id: string) => { setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); setMsg(null); };
  const enregistrer = () => start(async () => {
    const r = await enregistrerConcernes(evId, sel, joueurs.length);
    setMsg({ ok: r.ok, t: r.message || (r.ok ? "Enregistré." : "Erreur.") });
  });
  return (
    <div className={`cj${ouvert ? " ouvert" : ""}`}>
      <button type="button" className="cj-tete" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert}>
        <span className="cj-ic" aria-hidden="true">👥</span>
        <span className="cj-t">
          <b>Joueurs concernés par le formulaire</b>
          <small>{tous ? `Tous les joueurs actifs (${joueurs.length})` : `${sel.length} sur ${joueurs.length} · les autres comptent « Non »`}</small>
        </span>
        <span className="cj-go" aria-hidden="true">{ouvert ? "▲" : "Choisir ▾"}</span>
      </button>
      {ouvert ? (
        <div className="cj-corps">
          <div className="cj-rapide">
            <button type="button" className="btn" onClick={() => setSel(joueurs.map((j) => j.id))}>Tout cocher</button>
            <button type="button" className="btn" onClick={() => setSel([])}>Tout décocher</button>
          </div>
          <ul className="cj-liste">
            {joueurs.map((j) => {
              const on = sel.includes(j.id);
              return (
                <li key={j.id}>
                  <button type="button" className={`cj-l${on ? " on" : ""}`} onClick={() => basculer(j.id)} aria-pressed={on}>
                    <span className="cj-case" aria-hidden="true">{on ? "✓" : ""}</span>
                    <span>{j.nom}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="cj-bas">
            {msg ? <span className={`cj-msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</span> : <span className="cj-msg">{sel.length ? `${sel.length} joueur(s) coché(s)` : "Coche au moins un joueur"}</span>}
            <button type="button" className="btn primary" disabled={pending || !sel.length} onClick={enregistrer}>{pending ? "…" : "💾 Enregistrer"}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
