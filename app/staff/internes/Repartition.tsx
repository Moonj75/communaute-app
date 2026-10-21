"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { nomsParDefaut, type Brouillon, type EtapeConfig, type JoueurCompet } from "@/lib/internes";
import { enregistrerBrouillon, lancer } from "./actions";
import { ajouterJoueurRapide } from "@/app/admin/actions";

/**
 * First stage: the staff picks the players from the club's list and puts each one in a group
 * (or lets the app share them out). Then « Lancer » creates every match.
 */
export default function Repartition({ id, etape, joueurs: joueursClub, brouillon }: { id: string; etape: EtapeConfig; joueurs: (JoueurCompet & { actif: boolean })[]; brouillon?: Brouillon | null }) {
  const router = useRouter();
  const ko = etape.format === "elimination";
  // The club's list, plus the players created here (they appear at once).
  const [nouveaux, setNouveaux] = useState<(JoueurCompet & { actif: boolean })[]>([]);
  const joueurs = useMemo(() => [...joueursClub, ...nouveaux.filter((n) => !joueursClub.some((j) => j.id === n.id))], [joueursClub, nouveaux]);
  const [np, setNp] = useState("");
  const [nn, setNn] = useState("");
  const [nActif, setNActif] = useState(true);
  const [creation, setCreation] = useState(false);
  // Starts again from the saved preparation, if any.
  const [nb, setNb] = useState(brouillon?.nb || (ko ? 1 : Math.max(1, etape.groupes)));
  const [noms, setNoms] = useState<string[]>(brouillon?.noms?.length ? brouillon.noms : etape.nomsGroupes.length ? etape.nomsGroupes : nomsParDefaut(etape.groupes, false));
  /** Player → group index (-1 = not playing). */
  const [place, setPlace] = useState<Record<string, number>>(brouillon?.place || {});
  const [ordre, setOrdre] = useState<string[]>(brouillon?.ordre || []);
  const [sauve, setSauve] = useState<string>(brouillon?.le ? "✓ Préparation reprise" : "");
  const premier = useRef(true);

  // Saved by itself a moment after each change.
  useEffect(() => {
    if (premier.current) { premier.current = false; return; }
    setSauve("Enregistrement…");
    const t = window.setTimeout(async () => {
      const r = await enregistrerBrouillon(id, { nb, noms, place, ordre });
      setSauve(r.ok ? `✓ Enregistré à ${new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}` : `⚠️ ${r.message}`);
    }, 1200);
    return () => window.clearTimeout(t);
  }, [id, nb, noms, place, ordre]);
  const [voirTous, setVoirTous] = useState(false);
  const [cherche, setCherche] = useState("");
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const sansAccent = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const nbActifs = joueurs.filter((j) => j.actif).length;
  // Chosen players always stay visible, even a non-active one when the extended list is closed again.
  const liste = joueurs.filter((j) => (voirTous || j.actif || (place[j.id] ?? -1) >= 0) && (!cherche || sansAccent(j.nom).includes(sansAccent(cherche))));
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

      </div>

      <div className="rp-liste-choix" role="radiogroup" aria-label="Quels joueurs montrer">
        <button type="button" className={`rp-seg${!voirTous ? " on" : ""}`} onClick={() => setVoirTous(false)}>Joueurs actifs <span className="num">{nbActifs}</span></button>
        <button type="button" className={`rp-seg${voirTous ? " on" : ""}`} onClick={() => setVoirTous(true)}>📚 Liste étendue : actifs + non actifs <span className="num">{joueurs.length}</span></button>
      </div>
      <input className="input rp-cherche" type="search" value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder="🔎 Chercher un joueur…" aria-label="Chercher un joueur" />

      <details className="rp-nouveau">
        <summary>➕ Le joueur n&apos;est pas dans la liste ? Le créer ici</summary>
        <div className="as-ligne">
          <label className="f as-court">Prénom<input className="input" value={np} maxLength={80} onChange={(e) => setNp(e.target.value)} /></label>
          <label className="f">Nom<input className="input" value={nn} maxLength={120} onChange={(e) => setNn(e.target.value)} /></label>
          <label className="rp-tous"><input type="checkbox" checked={nActif} onChange={(e) => setNActif(e.target.checked)} /> Actif</label>
          <button type="button" className="btn primary" disabled={creation || !nn.trim()} onClick={async () => {
            setCreation(true);
            const r = await ajouterJoueurRapide(np, nn, nActif);
            setCreation(false);
            setInfo({ ok: r.ok, message: r.message });
            if (r.ok && r.joueur) {
              setNouveaux((l) => [...l, r.joueur!]);
              if (!r.joueur.actif) setVoirTous(true);
              mettre(r.joueur.id, 0);
              setNp(""); setNn("");
            }
          }}>{creation ? "…" : "Créer et ajouter"}</button>
        </div>
        <p className="muted small">Il est créé dans la liste des joueurs (Notion), sans e-mail, et placé tout de suite dans la 1re poule : change sa poule si besoin.</p>
      </details>

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

      <p className="rp-sauve" aria-live="polite">💾 {sauve || "Ta préparation est enregistrée au fur et à mesure : tu peux quitter et revenir."}</p>
      <button type="button" className="btn primary rp-go" disabled={pending || choisis.length < 2} onClick={go}>{pending ? "Création des matchs…" : `🚀 Lancer avec ${choisis.length} joueurs`}</button>
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
    </div>
  );
}
