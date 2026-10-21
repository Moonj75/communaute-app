"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { etatSaisie, type JoueurCompet, type Match } from "@/lib/internes";
import { saisirScore } from "@/app/staff/internes/actions";

/**
 * Cross table of a group: each player in a row and in a column; the half below the diagonal is barred,
 * each match is in the half above (score read from the row player's side). The staff types the score
 * right in the cell; the standings are updated at once.
 */
export default function Grille({ joueurs, matchs, editable = false, moi = [] }: { joueurs: JoueurCompet[]; matchs: Match[]; editable?: boolean; moi?: string[] }) {
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
  const [x, setX] = useState("");
  const [y, setY] = useState("");
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const trouver = (i: string, j: string) => matchs.find((m) => (m.a === i && m.b === j) || (m.a === j && m.b === i));
  const vu = (m: Match, ligne: string) => (m.a === ligne ? [m.buts_a, m.buts_b] : [m.buts_b, m.buts_a]) as [number | null, number | null];

  const ouvrir = (m: Match, ligne: string) => {
    if (!editable) return;
    const [a, b] = vu(m, ligne);
    setOuvert(`${m.id}|${ligne}`);
    setX(a == null ? "" : String(a));
    setY(b == null ? "" : String(b));
    setInfo(null);
  };
  const valider = (m: Match, ligne: string, effacer = false) =>
    start(async () => {
      const gx = effacer ? null : Number(x), gy = effacer ? null : Number(y);
      if (!effacer && (x === "" || y === "" || Number.isNaN(gx) || Number.isNaN(gy))) { setInfo({ ok: false, message: "Entre les deux scores." }); return; }
      const [ba, bb] = m.a === ligne ? [gx, gy] : [gy, gx];
      const r = await saisirScore(m.id, ba, bb);
      setInfo(r);
      if (r.ok) { setOuvert(null); router.refresh(); }
    });

  const joues = matchs.filter((m) => m.joue).length;
  // Scores typed by a player and not validated yet (shown under the table).
  const nomDe = (id: string | null) => joueurs.find((j) => j.id === id)?.nom || "?";
  const attente = valides.filter((m) => !m.joue && etatSaisie(m) !== "aucun").map((m) => {
    const pr = m.prop_a || m.prop_b!;
    return { m, x: nomDe(m.a), y: nomDe(m.b), p: `${pr.a}–${pr.b}`, qui: nomDe(m.prop_a ? m.a : m.b) };
  });
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
            <span className={`ig-v-s${mv.joue ? "" : " a-jouer"}`}>{mv.joue ? <><b className="num">{sa}</b><i>–</i><b className="num">{sb}</b></> : <small>à jouer</small>}</span>
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
                    <td key={c.id} className={`ig-m${res}${editable ? " edit" : ""}${ouvert === cle ? " on" : ""}${vise && vise.r === r.id && vise.c === c.id ? " hl" : ""}${vise && ((i === iR && j > i && j < iC) || (j === iC && i < iR && j > i)) ? " trace" : ""}`}
                      onMouseEnter={() => setSurvol({ r: r.id, c: c.id })}>
                      {ouvert === cle ? <span className="ig-btn"><span className="num">✎</span></span> : (
                        <button type="button" className="ig-btn" onClick={() => { setSel({ r: r.id, c: c.id }); if (editable) ouvrir(m, r.id); }} aria-label={`${r.nom} contre ${c.nom}`}>
                          {m.joue ? <span className="num">{a}–{b}</span> : etatSaisie(m) === "desaccord" ? <span className="ig-prop" title="Les deux joueurs ont mis des scores différents">⚠️</span> : etatSaisie(m) !== "aucun" ? <span className="ig-prop" title="Un joueur a mis le score, l'autre doit confirmer">⏳</span> : <span className="ig-pas">{editable ? "+" : "·"}</span>}
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
        {attente.length ? (
          <ul className="ig-att-l" aria-label="Scores en attente de validation">
            {attente.map(({ m, x, y, p, qui }) => (
              <li key={m.id}>
                <button type="button" className={`ig-att-b${etatSaisie(m) === "desaccord" ? " desac" : ""}`} onClick={() => { const cl = cellule(m); setSel(cl); if (editable) ouvrir(m, cl.r); }} title={etatSaisie(m) === "desaccord" ? "Les deux joueurs ont mis des scores différents" : `Mis par ${qui}, l'autre doit confirmer`}>
                  {etatSaisie(m) === "desaccord" ? "⚠️" : "⏳"} {x.split(" ")[0]} <b className="num">{p}</b> {y.split(" ")[0]}
                </button>
              </li>
            ))}
          </ul>
        ) : <span className="ig-att-vide">✓ Aucun score en attente</span>}
      </div>
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      {mo && lui && autre ? (
        <div className="ig-fond" onClick={() => setOuvert(null)}>
          <div className="ig-saisie" role="dialog" aria-label="Score du match" onClick={(e) => e.stopPropagation()}>
            <p className="ig-qui">Score du match</p>
            <div className="ig-duel">
              <span className="ig-j">{lui.nom}</span>
              <span className="ig-champs">
                <input inputMode="numeric" aria-label={`Buts de ${lui.nom}`} value={x} onChange={(e) => setX(e.target.value.replace(/\D/g, "").slice(0, 2))} autoFocus />
                <b>–</b>
                <input inputMode="numeric" aria-label={`Buts de ${autre.nom}`} value={y} onChange={(e) => setY(e.target.value.replace(/\D/g, "").slice(0, 2))} onKeyDown={(e) => e.key === "Enter" && valider(mo, ligne)} />
              </span>
              <span className="ig-j">{autre.nom}</span>
            </div>
            {/* Scores typed by the players themselves (waiting, or different). */}
            {[mo.prop_a ? { qui: mo.a, p: mo.prop_a } : null, mo.prop_b ? { qui: mo.b, p: mo.prop_b } : null].filter(Boolean).map((x) => {
              const auteur = joueurs.find((j) => j.id === x!.qui)?.nom || "?";
              const [vl, va] = mo.a === ligne ? [x!.p.a, x!.p.b] : [x!.p.b, x!.p.a];
              return (
                <p key={x!.qui} className="ig-propo">
                  <span>Score mis par <b>{auteur}</b> : <b className="num">{vl}–{va}</b></span>
                  <button type="button" className="btn" onClick={() => { setX(String(vl)); setY(String(va)); }}>Reprendre</button>
                </p>
              );
            })}
            <span className="ig-btns">
              <button type="button" className="btn primary" disabled={pending} onClick={() => valider(mo, ligne)}>{pending ? "…" : "✓ Valider"}</button>
              {mo.joue ? <button type="button" className="btn" disabled={pending} onClick={() => valider(mo, ligne, true)}>🗑️ Effacer</button> : null}
              <button type="button" className="btn" onClick={() => setOuvert(null)}>Annuler</button>
            </span>
            {info && !info.ok ? <p className="notice err">{info.message}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
