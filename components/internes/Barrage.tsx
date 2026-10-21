"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { etatSaisie, gagnant, type Match } from "@/lib/internes";
import { saisirScore } from "@/app/staff/internes/actions";

type J = { id: string; nom: string; rang: number };
export type BlocBarrage = { nom: string; haut: J[]; seul: J | null; duels: { x: J; y: J; match: Match | null }[]; bas: J[] };

/**
 * Play-off stage: for each group of the stage before, who goes straight up, the play-off matches
 * (the winner goes up, the loser goes down) and who goes straight down. The staff types the scores here.
 */
export default function Barrage({ blocs, editable = false, moi = [], nomHaut, nomBas }: { blocs: BlocBarrage[]; editable?: boolean; moi?: string[]; nomHaut: string; nomBas: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState<{ m: Match; x: J; y: J } | null>(null);
  const [sx, setSx] = useState("");
  const [sy, setSy] = useState("");
  const [qui, setQui] = useState<string | null>(null);
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  // Scores read from the side of x (the better placed one).
  const buts = (m: Match, x: string) => (m.a === x ? [m.buts_a, m.buts_b] : [m.buts_b, m.buts_a]) as [number | null, number | null];
  const ouvrir = (m: Match, x: J, y: J) => {
    const [a, b] = buts(m, x.id);
    setOuvert({ m, x, y }); setSx(a == null ? "" : String(a)); setSy(b == null ? "" : String(b)); setQui(m.vainqueur); setInfo(null);
  };
  const valider = () =>
    start(async () => {
      if (!ouvert) return;
      if (sx === "" || sy === "") { setInfo({ ok: false, message: "Entre les deux scores." }); return; }
      const { m, x } = ouvert;
      const [ba, bb] = m.a === x.id ? [Number(sx), Number(sy)] : [Number(sy), Number(sx)];
      const r = await saisirScore(m.id, ba, bb, sx === sy ? qui : null);
      setInfo(r);
      if (r.ok) { setOuvert(null); router.refresh(); }
    });

  const puce = (j: J, sens: "h" | "b") => (
    <li key={j.id} className={`br-p ${sens}${moi.includes(j.id) ? " moi" : ""}`}><span className="br-r num">{j.rang}</span>{j.nom}</li>
  );

  const joueur = (j: J, w: string | null, droite: boolean) => (
    <span className={`br-j${droite ? " d" : ""}${w === j.id ? " w" : w ? " l" : ""}${moi.includes(j.id) ? " moi" : ""}`}>
      <span className="br-r num">{j.rang}e</span>
      <b>{j.nom}</b>
      {w ? <small>{w === j.id ? `⬆️ ${nomHaut}` : `⬇️ ${nomBas}`}</small> : null}
    </span>
  );

  return (
    <div className="br">
      {blocs.map((b) => (
        <section key={b.nom} className="br-bloc">
          <p className="br-titre">{b.nom}</p>
          {b.haut.length || b.seul ? (
            <div className="br-zone h">
              <p className="br-zt"><span aria-hidden="true">⬆️</span> Montent directement en {nomHaut}</p>
              <ul className="br-l">{b.haut.map((j) => puce(j, "h"))}{b.seul ? puce(b.seul, "h") : null}</ul>
            </div>
          ) : null}
          {b.duels.length ? (
            <div className="br-zone m">
              <p className="br-zt"><span aria-hidden="true">⚔️</span> Barrage : le gagnant monte, le perdant descend</p>
              {b.duels.map(({ x, y, match: m }) => {
                const w = m ? gagnant(m) : null;
                const [a, c] = m && m.joue ? buts(m, x.id) : [null, null];
                const attente = m && !m.joue && etatSaisie(m) !== "aucun";
                return (
                  <div key={x.id} className={`br-duel${w ? " fini" : ""}`}>
                    {joueur(x, w, false)}
                    <span className={`br-s${m?.joue ? "" : " a-jouer"}`}>
                      {m?.joue ? <><b className="num">{a}</b><i>–</i><b className="num">{c}</b></> : <small>{attente ? "⏳ à confirmer" : "à jouer"}</small>}
                      {m?.joue && a === c && w ? <small className="br-tab">{(w === x.id ? x : y).nom.split(" ")[0]} passe</small> : null}
                    </span>
                    {joueur(y, w, true)}
                    {editable && m ? <button type="button" className="br-edit" onClick={() => ouvrir(m, x, y)}>{m.joue ? "✎ Corriger" : "⚽ Mettre le score"}</button> : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {b.bas.length ? (
            <div className="br-zone b">
              <p className="br-zt"><span aria-hidden="true">⬇️</span> Vont en {nomBas}</p>
              <ul className="br-l">{b.bas.map((j) => puce(j, "b"))}</ul>
            </div>
          ) : null}
        </section>
      ))}
      {info && !ouvert ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      {ouvert ? (
        <div className="ig-fond" onClick={() => setOuvert(null)}>
          <div className="ig-saisie" role="dialog" aria-label="Score du barrage" onClick={(e) => e.stopPropagation()}>
            <p className="ig-qui">Score du barrage</p>
            <div className="ig-duel">
              <span className="ig-j">{ouvert.x.nom}</span>
              <span className="ig-champs">
                <input inputMode="numeric" aria-label={`Buts de ${ouvert.x.nom}`} value={sx} onChange={(e) => setSx(e.target.value.replace(/\D/g, "").slice(0, 2))} autoFocus />
                <b>–</b>
                <input inputMode="numeric" aria-label={`Buts de ${ouvert.y.nom}`} value={sy} onChange={(e) => setSy(e.target.value.replace(/\D/g, "").slice(0, 2))} onKeyDown={(e) => e.key === "Enter" && valider()} />
              </span>
              <span className="ig-j">{ouvert.y.nom}</span>
            </div>
            {sx !== "" && sx === sy ? (
              <select className="input" value={qui || ""} onChange={(e) => setQui(e.target.value || null)} aria-label="Qui monte ?">
                <option value="">Match nul : qui monte ? (prolongations / tirs)</option>
                <option value={ouvert.x.id}>{ouvert.x.nom}</option>
                <option value={ouvert.y.id}>{ouvert.y.nom}</option>
              </select>
            ) : null}
            <span className="ig-btns">
              <button type="button" className="btn primary" disabled={pending} onClick={valider}>{pending ? "…" : "✓ Valider"}</button>
              <button type="button" className="btn" onClick={() => setOuvert(null)}>Annuler</button>
            </span>
            {info && !info.ok ? <p className="notice err">{info.message}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
