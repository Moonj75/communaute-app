"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROLES, type RoleSeance } from "@/lib/entrainements-types";
import { actualiserNotion, changerRoleMembre, type Retour } from "@/app/entrainements/actions";
import "./entrainements.css";

type Etat = "titulaire" | "suppleant" | "aucun";
export type MembreEquipe = { id: string; nom: string; etats: Record<RoleSeance, Etat> };

const SUIVANT: Record<Etat, Etat> = { aucun: "titulaire", titulaire: "suppleant", suppleant: "aucun" };
const COURT: Record<RoleSeance, string> = { entraineur: "Entraîn.", ouvreur: "Ouvreur", fermeur: "Fermeur", buvette: "Buvette" };
const LIB: Record<Etat, string> = { titulaire: "★", suppleant: "🔁", aucun: "" };

/**
 * Staff: the list of members and their training roles, changed from the app (written into Notion → Rôles).
 * One tap on a role: ★ holder → 🔁 substitute → nothing.
 */
export default function Equipe({ membres }: { membres: MembreEquipe[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [seulEquipe, setSeulEquipe] = useState(true);
  const [local, setLocal] = useState<Record<string, Record<RoleSeance, Etat>>>({});
  const [info, setInfo] = useState<Retour | null>(null);
  const etatsDe = (m: MembreEquipe) => local[m.id] || m.etats;

  const liste = useMemo(() => {
    const t = q.trim().toLowerCase();
    return membres.filter((m) => (!t || m.nom.toLowerCase().includes(t)) && (!seulEquipe || t || ROLES.some((r) => etatsDe(m)[r.id] !== "aucun")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membres, q, seulEquipe, local]);

  const basculer = (m: MembreEquipe, role: RoleSeance) => {
    const avant = etatsDe(m);
    const etat = SUIVANT[avant[role]];
    setLocal((l) => ({ ...l, [m.id]: { ...avant, [role]: etat } }));
    start(async () => {
      const r = await changerRoleMembre(m.id, role, etat);
      setInfo(r.ok ? { ok: true, message: `${m.nom} : ${ROLES.find((x) => x.id === role)!.nom.toLowerCase()} ${etat === "titulaire" ? "★ titulaire" : etat === "suppleant" ? "🔁 suppléant" : "retiré"} ✓` } : r);
      if (!r.ok) setLocal((l) => ({ ...l, [m.id]: avant }));
      else router.refresh();
    });
  };

  return (
    <div className="en">
      <div className="en-admin">
        <input className="input" type="search" placeholder="🔎 Chercher un membre…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="en-coche"><input type="checkbox" checked={seulEquipe} onChange={(e) => setSeulEquipe(e.target.checked)} /> Seulement l&apos;équipe</label>
        <button type="button" className="btn" disabled={pending} onClick={() => start(async () => { const r = await actualiserNotion(); setInfo(r); if (r.ok) router.refresh(); })}>🔄 Mettre à jour depuis Notion</button>
      </div>
      <p className="muted small">Touche un rôle pour le changer : <b>★ titulaire</b> → <b>🔁 suppléant</b> → rien. C&apos;est enregistré tout de suite dans Notion.</p>
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      <ul className="eq-liste">
        <li className="eq-tete" aria-hidden="true">
          <span />
          {ROLES.map((r) => <span key={r.id} title={r.nom}>{r.ic}<small>{COURT[r.id]}</small></span>)}
        </li>
        {liste.map((m) => (
          <li key={m.id} className="eq-l">
            <span className="eq-nom">{m.nom}</span>
            {ROLES.map((r) => {
              const e = etatsDe(m)[r.id];
              return (
                <button key={r.id} type="button" className={`eq-r ${e}`} disabled={pending} onClick={() => basculer(m, r.id)} aria-label={`${r.nom} de ${m.nom} : ${e}`}>
                  {LIB[e] || <span className="eq-vide">+</span>}
                </button>
              );
            })}
          </li>
        ))}
        {!liste.length ? <li className="vide">Personne ne correspond.</li> : null}
      </ul>
    </div>
  );
}
