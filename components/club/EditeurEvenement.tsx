"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Evenement } from "@/lib/club-types";
import { COMPETITIONS_EV, DECISIONS, DEPLACEMENTS, PRIORITES_EV, TYPES_EV, plusJours, type Delais } from "@/lib/evenements-types";
import { enregistrerEvenement } from "@/app/staff/actions";
import "./evenements.css";

/**
 * Staff: every field of an event of the calendar (Notion « Calendrier Déplacements »), to create one from the app
 * or to complete one created in Notion. The registration dates can be proposed from the club's usual delays.
 */
export default function EditeurEvenement({ ev, aFiche = false, delais, manque = [], ouvert = false }: { ev?: Evenement; aFiche?: boolean; delais: Delais; manque?: string[]; ouvert?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [info, setInfo] = useState<{ ok: boolean; message?: string } | null>(null);
  const [voir, setVoir] = useState(ouvert || !ev);
  const [f, setF] = useState({
    nom: ev?.nom || "", type: ev?.type || "Compétition", competition: ev?.competition || "", date: ev?.date || "", fin: ev?.fin || "",
    lieu: ev?.lieu || "", deplacement: ev?.deplacement || "", decision: ev ? ev.decision || "" : "✅ On y va", priorite: ev?.priorite || [],
    ouverture: ev?.ouverture || "", limite: ev?.limite || "", validation: ev?.validation || "", covoiturage: Boolean(ev?.covoiturage), notes: ev?.notes || "",
  });
  const maj = (k: keyof typeof f, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const compet = f.type === "Compétition";
  const proposer = () => {
    const d = delais[f.deplacement] || delais["🏠 Proximité"];
    if (!f.date || !d) return;
    setF((x) => ({ ...x, ouverture: plusJours(x.date, -d.ouverture), limite: plusJours(x.date, -d.limite), validation: plusJours(x.date, -d.validation) }));
  };
  const envoyer = (fd: FormData) => start(async () => {
    const r = await enregistrerEvenement(fd);
    setInfo(r);
    if (r.ok) { router.refresh(); if (!ev) setF((x) => ({ ...x, nom: "", date: "", fin: "", lieu: "", ouverture: "", limite: "", validation: "", notes: "" })); }
  });

  if (ev && !voir)
    return (
      <div className={`ee-ligne${manque.length ? " incomplet" : ""}`}>
        <div className="ee-l-t">
          <b>{ev.nom}</b>
          <small>{ev.date ? new Date(ev.date + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "Sans date"}{ev.lieu ? ` · ${ev.lieu}` : ""}</small>
          {manque.length ? <span className="ee-manque">À compléter : {manque.join(" · ")}</span> : <span className="ee-ok">✓ Complet</span>}
        </div>
        <button type="button" className="btn en-mini" onClick={() => setVoir(true)}>✏️ {manque.length ? "Compléter" : "Modifier"}</button>
      </div>
    );

  return (
    <form action={envoyer} className="ee">
      {ev ? <input type="hidden" name="id" value={ev.id} /> : null}
      {manque.length ? <p className="ee-manque">Manque : {manque.join(" · ")}</p> : null}
      <label className="f">Nom de l&apos;évènement<input className="input" name="nom" required value={f.nom} onChange={(e) => maj("nom", e.target.value)} placeholder="Ex. Open de Flanders" /></label>
      <div className="f">Type d&apos;évènement
        <div className="ee-choix">{TYPES_EV.map((t) => <button type="button" key={t} className={f.type === t ? "on" : undefined} onClick={() => maj("type", t)}>{t === "Compétition" ? "🏆" : t === "Entraînement" ? "🎯" : "✨"} {t}</button>)}</div>
        <input type="hidden" name="type" value={f.type} />
      </div>
      {compet ? (
        <div className="f">Compétition
          <div className="ee-choix">{COMPETITIONS_EV.map((t) => <button type="button" key={t} className={f.competition === t ? "on" : undefined} onClick={() => maj("competition", t)}>{t}</button>)}</div>
          <input type="hidden" name="competition" value={f.competition} />
        </div>
      ) : null}
      <div className="ee-2">
        <label className="f">Date (1er jour)<input className="input" type="date" name="date" required value={f.date} onChange={(e) => maj("date", e.target.value)} /></label>
        <label className="f">Dernier jour <small className="muted">(si 2 jours)</small><input className="input" type="date" name="fin" value={f.fin} min={f.date || undefined} onChange={(e) => maj("fin", e.target.value)} /></label>
      </div>
      <label className="f">Lieu<input className="input" name="lieu" value={f.lieu} onChange={(e) => maj("lieu", e.target.value)} placeholder="Ex. Gand (Belgique)" /></label>
      {compet ? (
        <>
          <div className="f">Type de déplacement
            <div className="ee-choix">{DEPLACEMENTS.map((t) => <button type="button" key={t} className={f.deplacement === t ? "on" : undefined} onClick={() => maj("deplacement", t)}>{t}</button>)}</div>
            <input type="hidden" name="deplacement" value={f.deplacement} />
          </div>
          <div className="f">Le club y va ?
            <div className="ee-choix">{DECISIONS.map((t) => <button type="button" key={t} className={f.decision === t ? "on" : undefined} onClick={() => maj("decision", t)}>{t}</button>)}</div>
            <input type="hidden" name="decision" value={f.decision} />
          </div>
          <div className="f">Priorité
            <div className="ee-choix">{PRIORITES_EV.map((t) => <button type="button" key={t} className={f.priorite.includes(t) ? "on" : undefined} onClick={() => maj("priorite", f.priorite.includes(t) ? f.priorite.filter((x) => x !== t) : [...f.priorite, t])}>{t}</button>)}</div>
            {f.priorite.map((p) => <input key={p} type="hidden" name="priorite" value={p} />)}
          </div>
          <div className="ee-dates">
            <div className="ee-dates-t"><b>Inscriptions des joueurs</b><button type="button" className="btn en-mini" disabled={!f.date} onClick={proposer} title="Comme les autres évènements du même type de déplacement">🪄 Proposer les dates</button></div>
            <div className="ee-3">
              <label className="f">Ouverture<input className="input" type="date" name="ouverture" value={f.ouverture} onChange={(e) => maj("ouverture", e.target.value)} /></label>
              <label className="f">Date limite<input className="input" type="date" name="limite" value={f.limite} onChange={(e) => maj("limite", e.target.value)} /></label>
              <label className="f">Validation<input className="input" type="date" name="validation" value={f.validation} onChange={(e) => maj("validation", e.target.value)} /></label>
            </div>
          </div>
          <label className="ee-coche"><input type="checkbox" name="covoiturage" checked={f.covoiturage} onChange={(e) => maj("covoiturage", e.target.checked)} /> 🚐 Covoiturage organisé par le club</label>
          {!aFiche ? <label className="ee-coche"><input type="checkbox" name="fiche" defaultChecked={f.decision === "✅ On y va"} /> 📋 Créer aussi sa fiche logistique</label> : null}
        </>
      ) : null}
      <label className="f">Notes <small className="muted">(facultatif)</small><textarea className="input" name="notes" rows={2} value={f.notes} onChange={(e) => maj("notes", e.target.value)} placeholder="Ex. FBFTS · organisé par…" /></label>
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      <span className="ee-btns">
        <button className="btn primary" type="submit" disabled={pending} style={{ minHeight: 48 }}>{pending ? "Enregistrement…" : ev ? "💾 Enregistrer dans Notion" : "➕ Ajouter au calendrier"}</button>
        {ev ? <button type="button" className="btn" onClick={() => setVoir(false)}>Fermer</button> : null}
      </span>
    </form>
  );
}
