"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { etatSaisie, type JoueurCompet, type Match } from "@/lib/internes";
import { saisirScore } from "@/app/staff/internes/actions";
import { validerMatch } from "@/app/internes/actions";
import FeuilleScore from "./FeuilleScore";

/**
 * Cross table of a group: each player in a row and in a column; the half below the diagonal is barred,
 * each match is in the half above (score read from the row player's side). The staff types the score
 * right in the cell; the standings are updated at once.
 */
export default function Grille({ joueurs, matchs, editable = false, valideur = false, ou, moi = [] }: { joueurs: JoueurCompet[]; matchs: Match[]; editable?: boolean; /** Validator (not staff): types the score of the matches not played yet, it counts at once. */ valideur?: boolean; /** Competition · stage · group, shown on the score sheet. */ ou?: string; moi?: string[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState<string | null>(null);
  /** The match chosen (tap) or under the mouse: its two players and its box light up. */
  // Always one match in the spotlight: the last score entered (none yet: one picked at random, after loading).
  const ordreJ = new Map(joueurs.map((j, i) => [j.id, i]));
  const cellule = (m: Match) => {
    const ia = ordreJ.get(m.a || "") ?? 0, ib = ordreJ.get(m.b || "") ?? 0;
    return ia < ib ? { r: m.a!, c: m.b! } : { r: m.b!, c: m.a! };
  };
  const valides = matchs.filter((m) => m.a && m.b && ordreJ.has(m.a) && ordreJ.has(m.b));
  const dernier = valides.filter((m) => m.joue).sort((x, y) => (y.maj_le || "").localeCompare(x.maj_le || ""))[0];
  const [sel, setSel] = useState<{ r: string; c: string } | null>(() => (dernier ? cellule(dernier) : valides[0] ? cellule(valides[0]) : null));
  useEffect(() => {
    if (!dernier && valides.length) setSel(cellule(valides[Math.floor(Math.random() * valides.length)]));
    // only once, when the table appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [survol, setSurvol] = useState<{ r: string; c: string } | null>(null);
  const vise = survol || sel;
  // Row player: lit on his row; column player: lit on his column (never in the barred half).
  const ligneVisee = (id: string) => Boolean(vise && vise.r === id);
  const colVisee = (id: string) => Boolean(vise && vise.c === id);
  const iR = vise ? joueurs.findIndex((j) => j.id === vise.r) : -1;
  const iC = vise ? joueurs.findIndex((j) => j.id === vise.c) : -1;
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);

  const trouver = (i: string, j: string) => matchs.find((m) => (m.a === i && m.b === j) || (m.a === j && m.b === i));
  const vu = (m: Match, ligne: string) => (m.a === ligne ? [m.buts_a, m.buts_b] : [m.buts_b, m.buts_a]) as [number | null, number | null];

  const peut = (m: Match) => editable && (!valideur || !m.joue);
  const ouvrir = (m: Match, ligne: string) => {
    if (!peut(m)) return;
    setOuvert(`${m.id}|${ligne}`);
    setInfo(null);
  };
  /** Saves the score typed on the sheet (read from the row player's side). */
  const enregistrer = async (m: Match, ligne: string, gx: number | null, gy: number | null) => {
    const [ba, bb] = m.a === ligne ? [gx, gy] : [gy, gx];
    const r = valideur ? await validerMatch(m.id, ba!, bb!) : await saisirScore(m.id, ba, bb);
    setInfo(r);
    if (r.ok) router.refresh();
    return r;
  };

  const joues = matchs.filter((m) => m.joue).length;
  // Scores typed by a player and not validated yet (shown under the table).
  const nomDe = (id: string | null) => joueurs.find((j) => j.id === id)?.nom || "?";
  const [iAtt, setIAtt] = useState(0);
  const attente = valides.filter((m) => !m.joue && etatSaisie(m) !== "aucun").map((m) => {
    const pr = m.prop_a || m.prop_b!;
    return { m, x: nomDe(m.a), y: nomDe(m.b), p: `${pr.a}–${pr.b}`, qui: nomDe(m.prop_a ? m.a : m.b) };
  });
  // One waiting score at a time, with arrows; the table points at it.
  const aller = (j: number) => {
    if (!attente.length) return;
    const n = (j + attente.length) % attente.length;
    setIAtt(n);
    setSel(cellule(attente[n].m));
  };
  // A box with a waiting score chosen in the table: the band below shows that score.
  const viseId = vise ? `${vise.r}|${vise.c}` : "";
  useEffect(() => {
    if (!vise) return;
    const j = attente.findIndex((a) => { const cl = cellule(a.m); return cl.r === vise.r && cl.c === vise.c; });
    if (j >= 0) setIAtt(j);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viseId]);
  const [mId, ligne] = (ouvert || "|").split("|");
  const mo = matchs.find((m) => m.id === mId);
  const autre = mo ? joueurs.find((j) => j.id === (mo.a === ligne ? mo.b : mo.a)) : null;
  const lui = joueurs.find((j) => j.id === ligne);
  // The match in the spotlight: full names, in relief, above the table.
  const mv = vise ? trouver(vise.r, vise.c) : null;
  const jr = vise ? joueurs.find((j) => j.id === vise.r) : null;
  const jc = vise ? joueurs.find((j) => j.id === vise.c) : null;
  const [sa, sb] = mv && jr ? vu(mv, jr.id) : [null, null];
  return (
    <div className="ig">
      <div className={`ig-vedette${mv ? " on" : ""}`} aria-live="polite">
        {mv && jr && jc ? (
          <>
            <span className={`ig-v-j${mv.joue && sa! > sb! ? " gagne" : ""}`}><span className="ig-n">{iR + 1}</span><b>{jr.nom}</b></span>
            <span className={`ig-v-s${mv.joue ? "" : " a-jouer"}`}>{mv.joue ? <><b className="num">{sa}</b><i>–</i><b className="num">{sb}</b></> : (() => {
              // Waiting for validation: the score typed by a player, in orange.
              const pr = mv.prop_a || mv.prop_b;
              if (!pr) return <small>à jouer</small>;
              const [pa, pb] = mv.a === jr.id ? [pr.a, pr.b] : [pr.b, pr.a];
              return <small className="ig-v-att">{etatSaisie(mv) === "desaccord" ? "⚠️" : "⏳"} {pa}–{pb} en attente</small>;
            })()}</span>
            <span className={`ig-v-j d${mv.joue && sb! > sa! ? " gagne" : ""}`}><b>{jc.nom}</b><span className="ig-n">{iC + 1}</span></span>
          </>
        ) : <span className="ig-v-aide">👆 Touche une case pour voir le match</span>}
      </div>
      <div className="ig-scroll">
        <table className="ig-t" onMouseLeave={() => setSurvol(null)}>
          <thead>
            <tr>
              <th className="ig-coin"><span className="num">{joues}/{matchs.length}</span> joués</th>
              {joueurs.map((j, c) => <th key={j.id} className={`ig-col${moi.includes(j.id) ? " moi" : ""}${colVisee(j.id) ? " hl" : ""}`} title={j.nom}>{colVisee(j.id) ? <span className={`ig-col-nom${c >= joueurs.length / 2 ? " d" : ""}`}>{j.nom}</span> : null}<span className="ig-n">{c + 1}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {joueurs.map((r, i) => (
              <tr key={r.id} className={moi.includes(r.id) ? "moi" : undefined}>
                <th className={`ig-lig${ligneVisee(r.id) ? " hl" : ""}`} title={r.nom}><span className="ig-lig-in"><span className="ig-n">{i + 1}</span><span className="ig-lig-nom">{r.nom}</span></span></th>
                {joueurs.map((c, j) => {
                  if (i === j) return <td key={c.id} className="ig-diag" aria-hidden="true" />;
                  if (j < i) return <td key={c.id} className="ig-barre" aria-hidden="true" />;
                  const m = trouver(r.id, c.id);
                  if (!m) return <td key={c.id} className="ig-vide" />;
                  const [a, b] = vu(m, r.id);
                  // Validated: fluo green; typed by a player and waiting for the other one (or different): orange.
                  const es = etatSaisie(m);
                  const res = m.joue ? " ok" : es === "desaccord" ? " att desac" : es !== "aucun" ? " att" : "";
                  const cle = `${m.id}|${r.id}`;
                  return (
                    <td key={c.id} className={`ig-m${res}${peut(m) ? " edit" : ""}${ouvert === cle ? " on" : ""}${vise && vise.r === r.id && vise.c === c.id ? " hl" : ""}${vise && ((i === iR && j > i && j < iC) || (j === iC && i < iR && j > i)) ? " trace" : ""}`}
                      onMouseEnter={() => setSurvol({ r: r.id, c: c.id })}>
                      {ouvert === cle ? <span className="ig-btn"><span className="num">✎</span></span> : (
                        <button type="button" className="ig-btn" onClick={() => { setSel({ r: r.id, c: c.id }); ouvrir(m, r.id); }} aria-label={`${r.nom} contre ${c.nom}`}>
                          {m.joue ? <span className="num">{a}–{b}</span> : etatSaisie(m) === "desaccord" ? <span className="ig-prop" title="Les deux joueurs ont mis des scores différents">⚠️</span> : etatSaisie(m) !== "aucun" ? <span className="ig-prop" title="Un joueur a mis le score, l'autre doit confirmer">⏳</span> : <span className="ig-pas">{peut(m) ? "+" : "·"}</span>}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ig-att">
        <span className="ig-leg"><i className="ok" /> Validé</span>
        <span className="ig-leg"><i className="att" /> En attente</span>
        {attente.length ? (() => {
          const i = Math.min(iAtt, attente.length - 1);
          const { m, x, y, p, qui } = attente[i];
          const desac = etatSaisie(m) === "desaccord";
          const cl = cellule(m);
          const pointe = vise && vise.r === cl.r && vise.c === cl.c;
          return (
            <div className="ig-car" aria-label="Scores en attente de validation">
              <button type="button" className="ig-car-f" onClick={() => aller(i - 1)} disabled={attente.length < 2} aria-label="Score en attente précédent">‹</button>
              <button type="button" className={`ig-att-b${desac ? " desac" : ""}${pointe ? " on" : ""}`} onClick={() => { setSel(cl); ouvrir(m, cl.r); }} title={desac ? "Les deux joueurs ont mis des scores différents" : `Mis par ${qui}, l'autre doit confirmer`}>
                {desac ? "⚠️" : "⏳"} {x} <b className="num">{p}</b> {y}
              </button>
              <button type="button" className="ig-car-f" onClick={() => aller(i + 1)} disabled={attente.length < 2} aria-label="Score en attente suivant">›</button>
              <span className="ig-car-n num">{i + 1}/{attente.length}</span>
            </div>
          );
        })() : <span className="ig-att-vide">✓ Aucun score en attente</span>}
      </div>
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      {mo && lui && autre ? (() => {
        const [vl, va] = vu(mo, ligne);
        const props = [mo.prop_a ? { qui: mo.a, p: mo.prop_a } : null, mo.prop_b ? { qui: mo.b, p: mo.prop_b } : null].filter((x): x is { qui: string | null; p: NonNullable<Match["prop_a"]> } => Boolean(x)).map(({ qui, p }) => {
          const [pa, pb] = mo.a === ligne ? [p.a, p.b] : [p.b, p.a];
          return { auteur: (joueurs.find((j) => j.id === qui)?.nom || "?").split(" ")[0], a: pa, b: pb };
        });
        return (
          <FeuilleScore
            ou={ou}
            gauche={{ id: lui.id, nom: lui.nom, n: joueurs.indexOf(lui) + 1 }}
            droite={{ id: autre.id, nom: autre.nom, n: joueurs.indexOf(autre) + 1 }}
            init={{ a: vl ?? props[0]?.a ?? 0, b: va ?? props[0]?.b ?? 0 }}
            propositions={props}
            note={valideur ? "Le score compte aussitôt dans le classement. Les deux joueurs sont prévenus." : undefined}
            enregistrer={(x, y) => enregistrer(mo, ligne, x, y)}
            effacer={!valideur && mo.joue ? () => enregistrer(mo, ligne, null, null) : undefined}
            fermer={() => setOuvert(null)}
          />
        );
      })() : null}
    </div>
  );
}
