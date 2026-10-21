"use client";

import { useEffect, useRef, useState, useTransition } from "react";

const CLE_BROUILLON = "lions-compet-brouillon";
import { LIGUES, type EtapeConfig, type TypeCompet } from "@/lib/internes";
import { creerCompetition } from "./actions";
import EditeurEtapes, { etapeVide as etape } from "./EditeurEtapes";

const saisonActuelle = () => {
  const d = new Date();
  const a = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${a}–${a + 1}`;
};


/** Ready-made shapes, changed freely afterwards. */
const MODELES: Record<TypeCompet, EtapeConfig[]> = {
  championnat: [
    etape("Phase 1", { nomsGroupes: ["Poule A", "Poule B"] }),
    etape("Phase 2", { nomsGroupes: ["Poule haute", "Poule basse"] }),
    etape("Phase finale", { nomsGroupes: [...LIGUES], passage: "fin", taille: 4 }),
  ],
  coupe: [
    etape("Poules", { nomsGroupes: ["Poule A", "Poule B"], passage: "qualifies", qualifies: 2 }),
    etape("Tableau final", { format: "elimination", groupes: 1, passage: "fin" }),
  ],
};

/** Creating a competition: its type, its points, and its stages (how many, how many groups, what happens next). */
export default function Assistant() {
  const [type, setType] = useState<TypeCompet>("championnat");
  const [nom, setNom] = useState(`Championnat du club ${saisonActuelle()}`);
  const [saison, setSaison] = useState(saisonActuelle());
  const [pts, setPts] = useState<[number, number, number]>([3, 1, 0]);
  const [etapes, setEtapes] = useState<EtapeConfig[]>(MODELES.championnat);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [repris, setRepris] = useState(false);
  const pret = useRef(false);

  // The form is kept in this browser while it is filled in: leaving the page loses nothing.
  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem(CLE_BROUILLON) || "null");
      if (b && b.etapes?.length) { setType(b.type); setNom(b.nom); setSaison(b.saison); setPts(b.pts); setEtapes(b.etapes); setRepris(true); }
    } catch { /* nothing saved */ }
    pret.current = true;
  }, []);
  useEffect(() => {
    if (!pret.current) return;
    try { localStorage.setItem(CLE_BROUILLON, JSON.stringify({ type, nom, saison, pts, etapes })); } catch { /* storage unavailable */ }
  }, [type, nom, saison, pts, etapes]);
  const recommencer = () => {
    try { localStorage.removeItem(CLE_BROUILLON); } catch { /* storage unavailable */ }
    setRepris(false); setType("championnat"); setEtapes(MODELES.championnat); setPts([3, 1, 0]); setSaison(saisonActuelle()); setNom(`Championnat du club ${saisonActuelle()}`);
  };

  const choisirType = (t: TypeCompet) => {
    setType(t);
    setEtapes(MODELES[t]);
    setNom(`${t === "coupe" ? "Coupe" : "Championnat"} du club ${saison}`);
  };
  const envoyer = () =>
    start(async () => {
      setInfo(null);
      try { localStorage.removeItem(CLE_BROUILLON); } catch { /* storage unavailable */ }
      const r = await creerCompetition({ type, nom, saison, pts, etapes });
      if (r && !r.ok) setInfo(r.message);
    });

  return (
    <div className="as">
      {repris ? <p className="rp-sauve">💾 Brouillon repris là où tu t&apos;étais arrêté. <button type="button" className="mo-lien" onClick={recommencer}>Recommencer à zéro</button></p> : <p className="rp-sauve">💾 Ce formulaire est gardé au fur et à mesure : tu peux quitter et revenir.</p>}
      <div className="as-types">
        {(["championnat", "coupe"] as const).map((t) => (
          <button key={t} type="button" className={`as-type${type === t ? " on" : ""}`} onClick={() => choisirType(t)}>
            <span aria-hidden="true">{t === "coupe" ? "🥇" : "🏆"}</span>
            <b>{t === "coupe" ? "Coupe du club" : "Championnat du club"}</b>
            <small>{t === "coupe" ? "Poules puis tableau final" : "Poules successives : les forts ensemble, les suivants ensemble"}</small>
          </button>
        ))}
      </div>

      <div className="as-ligne">
        <label className="f">Nom<input className="input" value={nom} maxLength={120} onChange={(e) => setNom(e.target.value)} /></label>
        <label className="f as-court">Saison<input className="input" value={saison} maxLength={20} onChange={(e) => setSaison(e.target.value)} /></label>
      </div>
      <div className="as-ligne as-pts">
        {(["Victoire", "Nul", "Défaite"] as const).map((l, i) => (
          <label key={l} className="f as-court">{l}<input className="input" type="number" min={0} max={10} value={pts[i]} onChange={(e) => setPts((p) => p.map((x, j) => (j === i ? Number(e.target.value) : x)) as [number, number, number])} /></label>
        ))}
      </div>

      <EditeurEtapes etapes={etapes} onChange={setEtapes} />

      <button type="button" className="btn primary" disabled={pending} onClick={envoyer}>{pending ? "Création…" : "✨ Créer la compétition"}</button>
      {info ? <p className="notice err">{info}</p> : null}
      <p className="muted small">Ensuite : tu choisis les joueurs et tu formes les poules de départ. Tout le reste (matchs, classements, poules suivantes, tableau final) se fait tout seul.</p>
    </div>
  );
}
