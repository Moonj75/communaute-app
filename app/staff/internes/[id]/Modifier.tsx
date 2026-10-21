"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enchainerDates, erreurDates, type Competition, type EtapeConfig } from "@/lib/internes";
import { modifierCompetition } from "../actions";
import EditeurEtapes from "../EditeurEtapes";

/**
 * Changing a competition at any time: name, season, points, names and dates of every stage,
 * names of the groups already made, and the stages to come (a play-off can be added or removed).
 */
export default function Modifier({ c, groupesFaits, tailles }: { c: Competition; groupesFaits: Record<number, { id: string; nom: string }[]>; tailles: Record<number, number[]> }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState(c.nom);
  const [saison, setSaison] = useState(c.saison || "");
  const [pts, setPts] = useState<[number, number, number]>([c.pts_v, c.pts_n, c.pts_d]);
  // Dates put back in order at once (a stage always starts after the end of the previous one).
  const ranges = () => enchainerDates(c.etapes);
  const [etapes, setEtapes] = useState<EtapeConfig[]>(ranges);
  const decale = JSON.stringify(ranges().map((e) => [e.debut, e.fin])) !== JSON.stringify(c.etapes.map((e) => [e.debut, e.fin]));
  const [noms, setNoms] = useState<Record<string, string>>({});
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const fixe = c.statut === "preparation" ? -1 : c.statut === "terminee" ? c.etapes.length - 1 : c.etape;
  const enCours = c.statut === "en_cours" ? c.etape : -1;
  const faits = Object.fromEntries(Object.entries(groupesFaits).map(([k, gs]) => [k, gs.map((g) => ({ ...g, nom: noms[g.id] ?? g.nom }))]));
  const souci = erreurDates(etapes);

  const annuler = () => { setNom(c.nom); setSaison(c.saison || ""); setPts([c.pts_v, c.pts_n, c.pts_d]); setEtapes(ranges()); setNoms({}); setInfo(null); setOuvert(false); };
  const enregistrer = () =>
    start(async () => {
      const r = await modifierCompetition(c.id, { nom, saison, pts, etapes, groupes: Object.entries(noms).map(([id, n]) => ({ id, nom: n })) });
      setInfo(r);
      if (r.ok) { setOuvert(false); router.refresh(); }
    });

  if (!ouvert) {
    return (
      <div className="md-ferme">
        <button type="button" className="md-ouvrir" onClick={() => { setInfo(null); setOuvert(true); }}>
          <span className="md-ic" aria-hidden="true">✏️</span>
          <span><b>Modifier la compétition</b><small>Noms, dates, poules, étapes à venir, barrage…</small></span>
          <span className="md-fl" aria-hidden="true">›</span>
        </button>
        {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      </div>
    );
  }

  return (
    <div className="as md">
      <p className="md-titre">✏️ Modifier « {c.nom} »</p>
      <div className="as-ligne">
        <label className="f">Nom<input className="input" value={nom} maxLength={120} onChange={(e) => setNom(e.target.value)} /></label>
        <label className="f as-court">Saison<input className="input" value={saison} maxLength={20} onChange={(e) => setSaison(e.target.value)} /></label>
      </div>
      <div className="as-ligne as-pts">
        {(["Victoire", "Nul", "Défaite"] as const).map((l, i) => (
          <label key={l} className="f as-court">{l}<input className="input" type="number" min={0} max={10} value={pts[i]} onChange={(e) => setPts((p) => p.map((x, j) => (j === i ? Number(e.target.value) : x)) as [number, number, number])} /></label>
        ))}
      </div>
      {fixe >= 0 ? <p className="muted small">Les étapes déjà commencées gardent leur forme : tu peux changer leur nom, leurs dates et le nom de leurs poules. Les étapes à venir se modifient entièrement.</p> : null}
      <EditeurEtapes etapes={etapes} onChange={setEtapes} fixe={fixe} enCours={enCours} groupesFaits={faits} onGroupe={(id, n) => setNoms((m) => ({ ...m, [id]: n }))} tailles={tailles} />
      {decale ? <p className="notice ok">📅 Certaines dates de début ont été décalées pour tomber après la fin de l&apos;étape d&apos;avant. Vérifie puis enregistre.</p> : null}
      {souci ? <p className="notice err">⚠️ {souci}</p> : null}
      <div className="md-bas">
        <button type="button" className="btn primary" disabled={pending || Boolean(souci)} onClick={enregistrer}>{pending ? "Enregistrement…" : "💾 Enregistrer les modifications"}</button>
        <button type="button" className="btn" disabled={pending} onClick={annuler}>Annuler</button>
      </div>
      {info && !info.ok ? <p className="notice err">{info.message}</p> : null}
    </div>
  );
}
