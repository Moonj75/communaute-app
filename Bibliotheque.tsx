"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, prefixe, type Exercice } from "@/lib/entrainements-types";
import { sauverExercice, type Retour } from "@/app/entrainements/actions";
import "./entrainements.css";

const NIVEAUX = ["⭐ Débutant", "⭐⭐ Intermédiaire", "⭐⭐⭐ Avancé", "⭐⭐⭐⭐ Expert"];

/** Form of an exercise sheet (new or edited). */
export function FormExercice({ e, onFini }: { e?: Exercice | null; onFini?: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [info, setInfo] = useState<Retour | null>(null);
  return (
    <form
      className="en-form"
      action={(fd) => start(async () => { const r = await sauverExercice(fd); setInfo(r); if (r.ok) { router.refresh(); onFini?.(); } })}
    >
      {e ? <input type="hidden" name="id" value={e.id} /> : null}
      <div className="en-ligne">
        <label className="f">Catégorie
          <select className="input" name="style" defaultValue={e?.styles[0] || ""} required>
            <option value="" disabled>Choisir…</option>
            {CATEGORIES.map((c) => <option key={c.style} value={c.style}>{c.code} · {c.style}</option>)}
          </select>
        </label>
        <label className="f en-court">Code<input className="input" name="code" defaultValue={e?.code || ""} placeholder="auto" maxLength={8} /></label>
      </div>
      <label className="f">Nom de l&apos;exercice<input className="input" name="titre" defaultValue={e?.titre || ""} required maxLength={120} /></label>
      <label className="f">Lien de la vidéo (YouTube, Facebook…)<input className="input" name="video" type="url" defaultValue={e?.video || ""} placeholder="https://…" /></label>
      <label className="f">Déroulement<textarea className="input" name="description" rows={5} defaultValue={e?.description || ""} /></label>
      <label className="f">Objectif<input className="input" name="objectif" defaultValue={e?.objectif || ""} /></label>
      <label className="f">Matériel<input className="input" name="materiel" defaultValue={e?.materiel || ""} /></label>
      <div className="en-ligne">
        <label className="f en-court">Durée (min)<input className="input num" name="duree" inputMode="numeric" defaultValue={e?.duree ?? ""} /></label>
        <label className="f en-court">Joueurs<input className="input num" name="joueurs" inputMode="numeric" defaultValue={e?.joueurs ?? ""} /></label>
        <label className="f">Niveau
          <select className="input" name="niveau" defaultValue={e?.niveau || ""}>
            <option value="">—</option>
            {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <button type="submit" className="btn primary" disabled={pending}>{pending ? "…" : "Enregistrer la fiche"}</button>
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
    </form>
  );
}

/** Exercise library, sorted by code, filtered by category (E, A, D, TA, TE, TI, G, PA). */
export default function Bibliotheque({ exercices, peutEditer }: { exercices: Exercice[]; peutEditer: boolean }) {
  const [cat, setCat] = useState<string>("");
  const [nouveau, setNouveau] = useState(false);
  const liste = exercices.filter((e) => !cat || (e.code || "").toUpperCase().startsWith(cat + "-") || prefixe(e.styles[0]) === cat);
  return (
    <div className="en">
      <div className="en-mois" role="tablist" aria-label="Catégories">
        <button type="button" role="tab" aria-selected={!cat} className={!cat ? "on" : undefined} onClick={() => setCat("")}>Tout <small>{exercices.length}</small></button>
        {CATEGORIES.map((c) => {
          const n = exercices.filter((e) => prefixe(e.styles[0]) === c.code || (e.code || "").toUpperCase().startsWith(c.code + "-")).length;
          return <button key={c.code} type="button" role="tab" aria-selected={cat === c.code} className={cat === c.code ? "on" : undefined} onClick={() => setCat(c.code)} title={c.style}>{c.ic} {c.code} <small>{n}</small></button>;
        })}
      </div>
      {liste.length ? (
        <ul className="en-ex">
          {liste.map((e) => (
            <li key={e.id}>
              <Link href={`/entrainements/exercice/${e.id}`}>
                <span className="en-code">{e.code || "—"}</span>
                <span className="en-pt">{e.titre}</span>
                <span className="muted small">{[e.duree ? `${e.duree} min` : "", e.niveau || "", e.video ? "🎬" : ""].filter(Boolean).join(" · ")}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="vide">Aucune fiche dans cette catégorie.</p>
      )}
      {peutEditer ? (
        nouveau ? (
          <section className="en-carte"><p className="en-k">Nouvelle fiche</p><FormExercice onFini={() => setNouveau(false)} /></section>
        ) : (
          <button type="button" className="btn primary" onClick={() => setNouveau(true)}>➕ Nouvelle fiche d&apos;exercice</button>
        )
      ) : null}
      <p className="muted small">Codes : {CATEGORIES.map((c) => `${c.code} ${c.style.toLowerCase()}`).join(" · ")}.</p>
    </div>
  );
}
