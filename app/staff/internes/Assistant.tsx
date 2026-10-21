"use client";

import { useState, useTransition } from "react";
import { decrireEtape, nomsParDefaut, nomsTableaux, type EtapeConfig, type TypeCompet } from "@/lib/internes";
import { creerCompetition } from "./actions";

const saisonActuelle = () => {
  const d = new Date();
  const a = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${a}–${a + 1}`;
};

const etape = (nom: string, p: Partial<EtapeConfig> = {}): EtapeConfig => ({ nom, debut: null, fin: null, format: "poules", groupes: 2, nomsGroupes: [], passage: "niveaux", qualifies: 2, ...p });

/** Ready-made shapes, changed freely afterwards. */
const MODELES: Record<TypeCompet, EtapeConfig[]> = {
  championnat: [
    etape("Phase 1", { nomsGroupes: ["Poule A", "Poule B"] }),
    etape("Phase 2", { nomsGroupes: ["Poule haute", "Poule basse"] }),
    etape("Phase finale", { nomsGroupes: ["Poule haute", "Poule basse"], passage: "fin" }),
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

  const choisirType = (t: TypeCompet) => {
    setType(t);
    setEtapes(MODELES[t]);
    setNom(`${t === "coupe" ? "Coupe" : "Championnat"} du club ${saison}`);
  };
  const maj = (i: number, p: Partial<EtapeConfig>) => setEtapes((l) => l.map((e, j) => (j === i ? { ...e, ...p } : e)));
  const nombre = (n: number) => {
    const v = Math.max(1, Math.min(6, n));
    setEtapes((l) => {
      const out = l.slice(0, v);
      while (out.length < v) out.push(etape(`Étape ${out.length + 1}`, { nomsGroupes: nomsParDefaut(2, true) }));
      return out.map((e, i) => (i === v - 1 && e.format === "poules" ? { ...e, passage: "fin" } : i < v - 1 && e.passage === "fin" ? { ...e, passage: "niveaux" } : e));
    });
  };
  const changerGroupes = (i: number, n: number) => {
    const v = Math.max(1, Math.min(8, n || 1));
    const niveaux = i > 0 && etapes[i - 1]?.passage === "niveaux";
    maj(i, { groupes: v, nomsGroupes: nomsParDefaut(v, niveaux) });
  };
  const envoyer = () =>
    start(async () => {
      setInfo(null);
      const r = await creerCompetition({ type, nom, saison, pts, etapes });
      if (r && !r.ok) setInfo(r.message);
    });

  return (
    <div className="as">
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
        <label className="f as-court">Nombre d&apos;étapes<input className="input" type="number" min={1} max={6} value={etapes.length} onChange={(e) => nombre(Number(e.target.value))} /></label>
      </div>

      <ol className="as-etapes">
        {etapes.map((e, i) => {
          const derniere = i === etapes.length - 1;
          return (
            <li key={i} className="as-et">
              <div className="as-et-tete"><span className="as-et-n">{i + 1}</span><input className="input as-et-nom" value={e.nom} maxLength={80} onChange={(x) => maj(i, { nom: x.target.value })} aria-label={`Nom de l'étape ${i + 1}`} /></div>
              <div className="as-ligne">
                <label className="f as-court">Du<input className="input" type="date" value={e.debut || ""} onChange={(x) => maj(i, { debut: x.target.value || null })} /></label>
                <label className="f as-court">Au<input className="input" type="date" value={e.fin || ""} onChange={(x) => maj(i, { fin: x.target.value || null })} /></label>
                {!derniere ? (
                  <label className="f as-court">Poules<input className="input" type="number" min={1} max={8} value={e.groupes} onChange={(x) => changerGroupes(i, Number(x.target.value))} /></label>
                ) : null}
              </div>
              {derniere ? (
                <div className="as-forme" role="radiogroup" aria-label="Forme de la phase finale">
                  <button type="button" className={`as-f${e.format === "poules" ? " on" : ""}`} onClick={() => maj(i, { format: "poules", groupes: Math.max(1, e.groupes), nomsGroupes: nomsParDefaut(Math.max(1, e.groupes), i > 0), passage: "fin" })}>
                    <span aria-hidden="true">🏆</span><b>En poules ou mini-poules</b><small>Chacun contre chacun. 2 grandes poules, ou plusieurs mini-poules (3–4 joueurs) : les meilleurs ensemble, puis les suivants, et ainsi de suite</small>
                  </button>
                  <button type="button" className={`as-f${e.format === "elimination" ? " on" : ""}`} onClick={() => maj(i, { format: "elimination", groupes: Math.max(1, Math.min(e.groupes, 4)), nomsGroupes: nomsTableaux(Math.max(1, Math.min(e.groupes, 4))), passage: "fin" })}>
                    <span aria-hidden="true">⚔️</span><b>En élimination directe</b><small>Matchs à élimination : quarts, demies, finale</small>
                  </button>
                </div>
              ) : null}
              {derniere ? (
                <div className="as-ligne">
                  <label className="f as-court">{e.format === "elimination" ? "Tableaux" : "Poules"}<input className="input" type="number" min={1} max={e.format === "elimination" ? 4 : 8} value={e.groupes} onChange={(x) => {
                    const v = Math.max(1, Math.min(e.format === "elimination" ? 4 : 8, Number(x.target.value) || 1));
                    maj(i, { groupes: v, nomsGroupes: e.format === "elimination" ? nomsTableaux(v) : nomsParDefaut(v, i > 0) });
                  }} /></label>
                  <p className="as-resume as-aide">{e.format === "elimination" ? "1 tableau = tout le monde ensemble. 2 tableaux = les meilleurs dans le tableau principal, les suivants dans le tableau B." : "Ex. 12 joueurs en 4 mini-poules : les 3 meilleurs ensemble, les 3 suivants ensemble… Le vainqueur de la 1re poule est le champion."}</p>
                </div>
              ) : null}
              {e.format === "elimination" && e.groupes > 1 ? (
                <label className="f">Noms des tableaux (du plus fort au moins fort)
                  <input className="input" value={e.nomsGroupes.join(", ")} onChange={(x) => maj(i, { nomsGroupes: x.target.value.split(",").map((s) => s.trim()) })} placeholder={nomsTableaux(e.groupes).join(", ")} />
                </label>
              ) : null}
              {e.format === "poules" ? (
                <label className="f">Noms des poules (du plus fort au moins fort)
                  <input className="input" value={e.nomsGroupes.join(", ")} onChange={(x) => maj(i, { nomsGroupes: x.target.value.split(",").map((s) => s.trim()) })} placeholder={nomsParDefaut(e.groupes, i > 0).join(", ")} />
                </label>
              ) : null}
              {!derniere ? (
                <div className="as-ligne">
                  <label className="f">Ensuite
                    <select className="input" value={e.passage} onChange={(x) => maj(i, { passage: x.target.value as EtapeConfig["passage"] })}>
                      <option value="niveaux">Tout le monde continue : les meilleurs ensemble, les suivants ensemble</option>
                      <option value="qualifies">Seuls les premiers de chaque poule continuent</option>
                    </select>
                  </label>
                  {e.passage === "qualifies" ? <label className="f as-court">Qualifiés par poule<input className="input" type="number" min={1} max={16} value={e.qualifies} onChange={(x) => maj(i, { qualifies: Number(x.target.value) })} /></label> : null}
                </div>
              ) : null}
              <p className="as-resume">{decrireEtape(e, derniere)}</p>
            </li>
          );
        })}
      </ol>

      <button type="button" className="btn primary" disabled={pending} onClick={envoyer}>{pending ? "Création…" : "✨ Créer la compétition"}</button>
      {info ? <p className="notice err">{info}</p> : null}
      <p className="muted small">Ensuite : tu choisis les joueurs et tu formes les poules de départ. Tout le reste (matchs, classements, poules suivantes, tableau final) se fait tout seul.</p>
    </div>
  );
}
