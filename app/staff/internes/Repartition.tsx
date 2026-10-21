"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { nomsParDefaut, type EtapeConfig, type JoueurCompet } from "@/lib/internes";
import { lancer } from "./actions";

/**
 * First stage: the staff picks the players from the club's list and puts each one in a group
 * (or lets the app share them out). Then « Lancer » creates every match.
 */
export default function Repartition({ id, etape, joueurs }: { id: string; etape: EtapeConfig; joueurs: (JoueurCompet & { actif: boolean })[] }) {
  const router = useRouter();
  const ko = etape.format === "elimination";
  const [nb, setNb] = useState(ko ? 1 : Math.max(1, etape.groupes));
  const [noms, setNoms] = useState<string[]>(etape.nomsGroupes.length ? etape.nomsGroupes : nomsParDefaut(etape.groupes, false));
  /** Player → group index (-1 = not playing). */
  const [place, setPlace] = useState<Record<string, number>>({});
  const [ordre, setOrdre] = useState<string[]>([]);
  const [voirTous, setVoirTous] = useState(false);
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const liste = joueurs.filter((j) => voirTous || j.actif);
  const nomsG = Array.from({ length: nb }, (_, i) => noms[i] || nomsParDefaut(nb, false)[i]);
  const groupes = useMemo(
    () => nomsG.map((n, gi) => ({ nom: n, joueurs: ordre.filter((pid) => place[pid] === gi).map((pid) => joueurs.find((j) => j.id === pid)!).filter(Boolean).map((j) => ({ id: j.id, nom: j.nom })) })),
    [nomsG, ordre, place, joueurs],
  );
  const choisis = ordre.filter((pid) => (place[pid] ?? -1) >= 0);

  const mettre = (pid: string, gi: number) => {
    setPlace((p) => ({ ...p, [pid]: gi }));
    setOrdre((o) => (o.includes(pid) ? o : [...o, pid]));
  };
  const melanger = () => {
    const ids = [...choisis].sort(() => Math.random() - 0.5);
    const p: Record<string, number> = { ...place };
    ids.forEach((pid, i) => (p[pid] = i % nb));
    setPlace(p);
    setOrdre(ids);
  };
  const toutActifs = () => {
    const ids = joueurs.filter((j) => j.actif).map((j) => j.id);
    const p: Record<string, number> = {};
    ids.forEach((pid, i) => (p[pid] = i % nb));
    setPlace(p);
    setOrdre(ids);
  };
  const go = () =>
    start(async () => {
      const r = await lancer(id, groupes);
      setInfo(r);
      if (r.ok) router.refresh();
    });

  return (
    <div className="rp">
      {!ko ? (
        <div className="as-ligne">
          <label className="f as-court">Nombre de poules<input className="input" type="number" min={1} max={8} value={nb} onChange={(e) => { const v = Math.max(1, Math.min(8, Number(e.target.value) || 1)); setNb(v); setNoms(nomsParDefaut(v, false)); setPlace((p) => Object.fromEntries(Object.entries(p).map(([k, g]) => [k, g >= v ? -1 : g]))); }} /></label>
          {nomsG.map((n, i) => (
            <label key={i} className="f as-court">Nom {i + 1}<input className="input" value={n} maxLength={40} onChange={(e) => setNoms((l) => { const c = [...nomsG]; c[i] = e.target.value; return c; })} /></label>
          ))}
        </div>
      ) : <p className="muted small">Élimination directe : l&apos;ordre de sélection donne les têtes de série (le 1er choisi est la tête de série n°1).</p>}

      <div className="rp-outils">
        <button type="button" className="btn" onClick={toutActifs}>👥 Prendre tous les joueurs actifs</button>
        <button type="button" className="btn" disabled={choisis.length < 2} onClick={melanger}>🎲 Répartir au hasard</button>
        <label className="rp-tous"><input type="checkbox" checked={voirTous} onChange={(e) => setVoirTous(e.target.checked)} /> Montrer aussi les non actifs</label>
      </div>

      <div className="rp-grille">
        <ul className="rp-liste" aria-label="Joueurs du club">
          {liste.map((j) => {
            const g = place[j.id] ?? -1;
            return (
              <li key={j.id} className={g >= 0 ? "pris" : undefined}>
                <span className="rp-nom">{j.nom}{!j.actif ? <small> · non actif</small> : null}</span>
                <span className="rp-choix">
                  <button type="button" className={`rp-c${g < 0 ? " on" : ""}`} onClick={() => mettre(j.id, -1)} title="Ne joue pas">—</button>
                  {nomsG.map((n, gi) => (
                    <button key={gi} type="button" className={`rp-c g${gi % 6}${g === gi ? " on" : ""}`} onClick={() => mettre(j.id, gi)} title={n}>{ko ? "✓" : String.fromCharCode(65 + gi)}</button>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="rp-poules">
          {groupes.map((g, gi) => (
            <div key={gi} className={`rp-p g${gi % 6}`}>
              <p className="rp-pt">{ko ? "Tableau (têtes de série)" : g.nom} <span className="num">{g.joueurs.length}</span></p>
              <ol>{g.joueurs.map((j) => <li key={j.id}>{j.nom}</li>)}</ol>
              {!ko && g.joueurs.length >= 2 ? <p className="muted small">{(g.joueurs.length * (g.joueurs.length - 1)) / 2} matchs</p> : null}
            </div>
          ))}
        </div>
      </div>

      <button type="button" className="btn primary rp-go" disabled={pending || choisis.length < 2} onClick={go}>{pending ? "Création des matchs…" : `🚀 Lancer avec ${choisis.length} joueurs`}</button>
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
    </div>
  );
}
