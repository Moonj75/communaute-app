"use client";

import { decrireEtape, enchainerDates, lendemain, LIGUES, nomsParDefaut, nomsTableaux, type EtapeConfig } from "@/lib/internes";

export const etapeVide = (nom: string, p: Partial<EtapeConfig> = {}): EtapeConfig => ({ nom, debut: null, fin: null, format: "poules", groupes: 2, nomsGroupes: [], passage: "niveaux", qualifies: 2, ...p });

/** What a play-off gives for a group of n players: who meets whom. */
function apercuBarrage(n: number, haut: number, bas: number) {
  const milieu = n - haut - bas;
  if (milieu < 0) return { ok: false, txt: `Avec ${n} joueurs, ${haut} + ${bas} c'est trop : baisse un des deux nombres.` };
  if (milieu === 0) return { ok: true, txt: `Avec ${n} joueurs : pas de barrage, tout le monde monte ou descend directement.` };
  const duels: string[] = [];
  for (let i = 0; i < Math.floor(milieu / 2); i++) duels.push(`${haut + 1 + i}e contre ${haut + milieu - i}e`);
  const seul = milieu % 2 ? ` · le ${haut + Math.ceil(milieu / 2)}e (seul) monte directement` : "";
  return { ok: milieu % 2 === 0, txt: `Avec ${n} joueurs : ${haut} montent, ${bas} descendent, barrage ${duels.join(" et ")}${seul}.` };
}

type Props = {
  etapes: EtapeConfig[];
  onChange: (e: EtapeConfig[]) => void;
  /** Last stage already made (its shape cannot change any more); -1 = none. */
  fixe?: number;
  /** Stage in progress (what happens at its end can still change). */
  enCours?: number;
  /** Groups already made, per stage (to rename them). */
  groupesFaits?: Record<number, { id: string; nom: string }[]>;
  onGroupe?: (id: string, nom: string) => void;
  /** Players per group, per stage already made (for the play-off preview). */
  tailles?: Record<number, number[]>;
};

/** The stages of a competition: names, dates (always in order), groups, and the optional play-off stage. */
export default function EditeurEtapes({ etapes, onChange, fixe = -1, enCours = -1, groupesFaits = {}, onGroupe, tailles = {} }: Props) {
  const maj = (i: number, p: Partial<EtapeConfig>) => onChange(etapes.map((e, j) => (j === i ? { ...e, ...p } : e)));
  const majDate = (i: number, p: Partial<EtapeConfig>) => onChange(enchainerDates(etapes.map((e, j) => (j === i ? { ...e, ...p } : e)), Math.max(0, i - 1)));
  const changerGroupes = (i: number, n: number) => {
    const v = Math.max(1, Math.min(8, n || 1));
    const niveaux = i > 0 && etapes[i - 1]?.passage === "niveaux";
    maj(i, { groupes: v, nomsGroupes: nomsParDefaut(v, niveaux) });
  };
  const peutBarrageApres = (i: number) => i + 1 > fixe && etapes[i].format === "poules" && i < etapes.length - 1 && etapes[i + 1].format !== "barrage";
  const insererBarrage = (i: number) => {
    const prec = etapes[i];
    const b = etapeVide("Barrage", { format: "barrage", haut: 4, bas: 4, groupes: prec.groupes, passage: "niveaux", debut: prec.fin ? lendemain(prec.fin) : null });
    const l = [...etapes.slice(0, i), { ...prec, passage: "niveaux" as const }, b, ...etapes.slice(i + 1)];
    // The stage after the play-off: an upper and a lower division.
    const apres = l[i + 2];
    if (apres && apres.format === "poules" && !apres.taille && apres.groupes === 2 && (!apres.nomsGroupes.length || /poule (haute|basse)/i.test(apres.nomsGroupes.join(" ")))) l[i + 2] = { ...apres, nomsGroupes: ["Division du haut", "Division du bas"] };
    onChange(enchainerDates(l, i));
  };
  const retirer = (i: number) => {
    const l = etapes.filter((_, j) => j !== i);
    // A play-off left alone at the end, or without group stage before it, goes too.
    const propre = l.filter((e, j) => e.format !== "barrage" || (j > 0 && j < l.length - 1 && l[j - 1].format === "poules"));
    onChange(propre.map((e, j) => (j === propre.length - 1 && e.format !== "barrage" ? { ...e, passage: "fin" } : j < propre.length - 1 && e.passage === "fin" ? { ...e, passage: "niveaux" } : e)));
  };
  const ajouterFin = () => {
    const der = etapes[etapes.length - 1];
    const l = etapes.map((e, j) => (j === etapes.length - 1 && e.passage === "fin" && (j > fixe || j === enCours) ? { ...e, passage: "niveaux" as const } : e));
    onChange(enchainerDates([...l, etapeVide(`Étape ${etapes.length + 1}`, { groupes: 2, nomsGroupes: nomsParDefaut(2, true), passage: "fin", debut: der?.fin ? lendemain(der.fin) : null })], etapes.length - 1));
  };

  return (
    <>
      <ol className="as-etapes">
        {etapes.map((e, i) => {
          const derniere = i === etapes.length - 1;
          const verrou = i <= fixe;
          const courante = i === enCours;
          const prec = etapes[i - 1];
          const minDebut = prec ? (prec.fin ? lendemain(prec.fin) : prec.debut ? lendemain(prec.debut) : undefined) : undefined;
          const barrage = e.format === "barrage";
          return (
            <li key={i} className={`as-et-bloc${barrage ? " barr" : ""}`}>
              <div className={`as-et${barrage ? " as-et-barr" : ""}${verrou ? " as-et-fixe" : ""}`}>
                <div className="as-et-tete">
                  <span className="as-et-n">{barrage ? "⚔️" : i + 1}</span>
                  <input className="input as-et-nom" value={e.nom} maxLength={80} onChange={(x) => maj(i, { nom: x.target.value })} aria-label={`Nom de l'étape ${i + 1}`} />
                  {verrou ? <span className={`as-badge${courante ? " cours" : ""}`}>{courante ? "▶ En cours" : "✔ Jouée"}</span> : <span className="as-badge futur">À venir</span>}
                  {!verrou && etapes.length > 1 ? <button type="button" className="as-suppr" onClick={() => retirer(i)} title="Retirer cette étape" aria-label={`Retirer l'étape ${e.nom}`}>✕</button> : null}
                </div>
                <div className="as-ligne">
                  <label className="f as-court">Du<input className="input" type="date" value={e.debut || ""} min={minDebut} onChange={(x) => majDate(i, { debut: x.target.value || null })} /></label>
                  <label className="f as-court">Au<input className="input" type="date" value={e.fin || ""} min={e.debut || minDebut} onChange={(x) => majDate(i, { fin: x.target.value || null })} /></label>
                  {!verrou && !derniere && !barrage ? (
                    <label className="f as-court">Poules<input className="input" type="number" min={1} max={8} value={e.groupes} onChange={(x) => changerGroupes(i, Number(x.target.value))} /></label>
                  ) : null}
                </div>

                {verrou && groupesFaits[i]?.length && onGroupe ? (
                  <div className="as-ligne">
                    {groupesFaits[i].map((g) => (
                      <label key={g.id} className="f as-court">Nom de la poule<input className="input" value={g.nom} maxLength={40} onChange={(x) => onGroupe(g.id, x.target.value)} /></label>
                    ))}
                  </div>
                ) : null}

                {barrage && !verrou ? (
                  <>
                    <div className="as-ligne">
                      <label className="f as-court">⬆️ Montent directement<input className="input" type="number" min={0} max={30} value={e.haut ?? 0} onChange={(x) => maj(i, { haut: Math.max(0, Math.min(30, Number(x.target.value) || 0)) })} /></label>
                      <label className="f as-court">⬇️ Descendent directement<input className="input" type="number" min={0} max={30} value={e.bas ?? 0} onChange={(x) => maj(i, { bas: Math.max(0, Math.min(30, Number(x.target.value) || 0)) })} /></label>
                    </div>
                    <p className="as-resume as-aide">Par poule. Les joueurs entre les deux jouent un match de barrage : le gagnant monte dans la division du haut, le perdant va dans celle du bas. En cas de nul, on indique qui passe (prolongations / tirs).</p>
                    <ul className="as-bar">
                      {(tailles[i - 1]?.length ? tailles[i - 1] : [10, 9, 8]).filter((n, k, l) => l.indexOf(n) === k).map((n) => {
                        const a = apercuBarrage(n, e.haut ?? 0, e.bas ?? 0);
                        return <li key={n} className={a.ok ? undefined : "att"}>{a.ok ? "✓" : "⚠️"} {a.txt}</li>;
                      })}
                    </ul>
                  </>
                ) : null}

                {!verrou && !barrage && derniere ? (
                  <div className="as-forme" role="radiogroup" aria-label="Forme de la phase finale">
                    <button type="button" className={`as-f${e.format === "poules" && e.taille ? " on" : ""}`} onClick={() => maj(i, { format: "poules", taille: e.taille || 4, nomsGroupes: [...LIGUES], passage: "fin" })} disabled={i === 0}>
                      <span aria-hidden="true">💎</span><b>En ligues de 4</b><small>Mini-poules : Diamond League (les meilleurs), Golden, Silver, Bronze, puis Fair Play League A, B…</small>
                    </button>
                    <button type="button" className={`as-f${e.format === "poules" && !e.taille ? " on" : ""}`} onClick={() => maj(i, { format: "poules", taille: null, groupes: Math.max(1, e.groupes), nomsGroupes: nomsParDefaut(Math.max(1, e.groupes), i > 0), passage: "fin" })}>
                      <span aria-hidden="true">🏆</span><b>En poules</b><small>Un nombre fixe de poules (ex. division du haut / division du bas)</small>
                    </button>
                    <button type="button" className={`as-f${e.format === "elimination" ? " on" : ""}`} onClick={() => maj(i, { format: "elimination", taille: null, groupes: Math.max(1, Math.min(e.groupes, 4)), nomsGroupes: nomsTableaux(Math.max(1, Math.min(e.groupes, 4))), passage: "fin" })}>
                      <span aria-hidden="true">⚔️</span><b>En élimination directe</b><small>Matchs à élimination : quarts, demies, finale</small>
                    </button>
                  </div>
                ) : null}
                {!verrou && derniere && e.format === "poules" && e.taille ? (
                  <div className="as-ligne">
                    <label className="f as-court">Joueurs par ligue<input className="input" type="number" min={2} max={12} value={e.taille} onChange={(x) => maj(i, { taille: Math.max(2, Math.min(12, Number(x.target.value) || 4)) })} /></label>
                    <p className="as-resume as-aide">Le nombre de ligues suit le nombre de joueurs : 16 joueurs = 4 ligues de 4. Le vainqueur de la Diamond League est le champion.</p>
                  </div>
                ) : null}
                {!verrou && derniere && !barrage && !(e.format === "poules" && e.taille) ? (
                  <div className="as-ligne">
                    <label className="f as-court">{e.format === "elimination" ? "Tableaux" : "Poules"}<input className="input" type="number" min={1} max={e.format === "elimination" ? 4 : 8} value={e.groupes} onChange={(x) => {
                      const v = Math.max(1, Math.min(e.format === "elimination" ? 4 : 8, Number(x.target.value) || 1));
                      maj(i, { groupes: v, nomsGroupes: e.format === "elimination" ? nomsTableaux(v) : nomsParDefaut(v, i > 0) });
                    }} /></label>
                    <p className="as-resume as-aide">{e.format === "elimination" ? "1 tableau = tout le monde ensemble. 2 tableaux = les meilleurs dans le tableau principal, les suivants dans le tableau B." : "Le vainqueur de la 1re poule est le champion."}</p>
                  </div>
                ) : null}
                {!verrou && e.format === "elimination" && e.groupes > 1 ? (
                  <label className="f">Noms des tableaux (du plus fort au moins fort)
                    <input className="input" value={e.nomsGroupes.join(", ")} onChange={(x) => maj(i, { nomsGroupes: x.target.value.split(",").map((s) => s.trim()) })} placeholder={nomsTableaux(e.groupes).join(", ")} />
                  </label>
                ) : null}
                {!verrou && e.format === "poules" && e.taille ? (
                  <label className="f">Noms des ligues (de la plus forte à la moins forte ; au-delà : Fair Play League A, B…)
                    <input className="input" value={e.nomsGroupes.join(", ")} onChange={(x) => maj(i, { nomsGroupes: x.target.value.split(",").map((s) => s.trim()) })} placeholder={LIGUES.join(", ")} />
                  </label>
                ) : null}
                {!verrou && e.format === "poules" && !e.taille ? (
                  <label className="f">Noms des poules (du plus fort au moins fort)
                    <input className="input" value={e.nomsGroupes.join(", ")} onChange={(x) => maj(i, { nomsGroupes: x.target.value.split(",").map((s) => s.trim()) })} placeholder={nomsParDefaut(e.groupes, i > 0).join(", ")} />
                  </label>
                ) : null}
                {(!verrou || courante) && !derniere && e.format === "poules" && etapes[i + 1]?.format !== "barrage" ? (
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
                <p className="as-resume">{decrireEtape(e, derniere, etapes[i + 1])}</p>
              </div>
              {peutBarrageApres(i) ? (
                <button type="button" className="as-ins" onClick={() => insererBarrage(i)}>
                  <span aria-hidden="true">⚔️</span> Ajouter un barrage ici <small>(facultatif : montée directe, barrage, descente directe)</small>
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
      <button type="button" className="btn as-plus" onClick={ajouterFin}>➕ Ajouter une étape à la fin</button>
    </>
  );
}
