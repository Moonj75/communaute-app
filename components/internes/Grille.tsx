"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { etatSaisie, type JoueurCompet, type Match } from "@/lib/internes";
import { saisirScore } from "@/app/staff/internes/actions";

const court = (n: string) => {
  const [p, ...r] = n.split(" ");
  return r.length ? `${p} ${r.join(" ").charAt(0)}.` : p;
};

/**
 * Cross table of a group: each player in a row and in a column; the half below the diagonal is barred,
 * each match is in the half above (score read from the row player's side). The staff types the score
 * right in the cell; the standings are updated at once.
 */
export default function Grille({ joueurs, matchs, editable = false, moi = [] }: { joueurs: JoueurCompet[]; matchs: Match[]; editable?: boolean; moi?: string[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState<string | null>(null);
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
  const [mId, ligne] = (ouvert || "|").split("|");
  const mo = matchs.find((m) => m.id === mId);
  const autre = mo ? joueurs.find((j) => j.id === (mo.a === ligne ? mo.b : mo.a)) : null;
  const lui = joueurs.find((j) => j.id === ligne);
  return (
    <div className="ig">
      <div className="ig-scroll">
        <table className="ig-t">
          <thead>
            <tr>
              <th className="ig-coin"><span className="num">{joues}/{matchs.length}</span> joués</th>
              {joueurs.map((j, c) => <th key={j.id} className={`ig-col${moi.includes(j.id) ? " moi" : ""}`} title={j.nom}><span className="ig-n">{c + 1}</span><span className="ig-nom">{court(j.nom)}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {joueurs.map((r, i) => (
              <tr key={r.id} className={moi.includes(r.id) ? "moi" : undefined}>
                <th className="ig-lig" title={r.nom}><span className="ig-n">{i + 1}</span> {court(r.nom)}</th>
                {joueurs.map((c, j) => {
                  if (i === j) return <td key={c.id} className="ig-diag" aria-hidden="true" />;
                  if (j < i) return <td key={c.id} className="ig-barre" aria-hidden="true" />;
                  const m = trouver(r.id, c.id);
                  if (!m) return <td key={c.id} className="ig-vide" />;
                  const [a, b] = vu(m, r.id);
                  const res = !m.joue ? "" : a! > b! ? " v" : a! < b! ? " d" : " n";
                  const cle = `${m.id}|${r.id}`;
                  return (
                    <td key={c.id} className={`ig-m${res}${editable ? " edit" : ""}${ouvert === cle ? " on" : ""}`}>
                      {ouvert === cle ? <span className="ig-btn"><span className="num">✎</span></span> : (
                        <button type="button" className="ig-btn" disabled={!editable} onClick={() => ouvrir(m, r.id)} aria-label={`${r.nom} contre ${c.nom}`}>
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
