"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { etatSaisie, gagnant, type Match } from "@/lib/internes";
import { saisirScore } from "@/app/staff/internes/actions";
import { validerMatch } from "@/app/internes/actions";
import FeuilleScore from "./FeuilleScore";

type J = { id: string; nom: string; rang: number };
export type BlocBarrage = { nom: string; haut: J[]; seul: J | null; duels: { x: J; y: J; match: Match | null }[]; bas: J[] };

/**
 * Play-off stage: for each group of the stage before, who goes straight up, the play-off matches
 * (the winner goes up, the loser goes down) and who goes straight down. The staff types the scores here.
 */
export default function Barrage({ blocs, editable = false, valideur = false, ou, moi = [], nomHaut, nomBas }: { blocs: BlocBarrage[]; editable?: boolean; valideur?: boolean; ou?: string; moi?: string[]; nomHaut: string; nomBas: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState<{ m: Match; x: J; y: J } | null>(null);
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);

  // Scores read from the side of x (the better placed one).
  const buts = (m: Match, x: string) => (m.a === x ? [m.buts_a, m.buts_b] : [m.buts_b, m.buts_a]) as [number | null, number | null];
  const ouvrir = (m: Match, x: J, y: J) => { setOuvert({ m, x, y }); setInfo(null); };
  const enregistrer = async (gx: number | null, gy: number | null, v: string | null) => {
    if (!ouvert) return { ok: false, message: "" };
    const { m, x } = ouvert;
    const [ba, bb] = m.a === x.id ? [gx, gy] : [gy, gx];
    const r = valideur ? await validerMatch(m.id, ba!, bb!, v) : await saisirScore(m.id, ba, bb, v);
    setInfo(r);
    if (r.ok) router.refresh();
    return r;
  };

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
              <p className="br-zt"><span aria-hidden="true">⬆️</span> Accès direct {nomHaut}</p>
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
                    {editable && m && (!valideur || !m.joue) ? <button type="button" className="br-edit" onClick={() => ouvrir(m, x, y)}>{m.joue ? "✎ Corriger" : "⚽ Mettre le score"}</button> : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {b.bas.length ? (
            <div className="br-zone b">
              <p className="br-zt"><span aria-hidden="true">⬇️</span> Accès {nomBas}</p>
              <ul className="br-l">{b.bas.map((j) => puce(j, "b"))}</ul>
            </div>
          ) : null}
        </section>
      ))}
      {info && !ouvert ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      {ouvert ? (() => {
        const { m, x, y } = ouvert;
        const [a, c] = buts(m, x.id);
        const props = [m.prop_a ? { qui: m.a, p: m.prop_a } : null, m.prop_b ? { qui: m.b, p: m.prop_b } : null].filter((z): z is { qui: string | null; p: NonNullable<Match["prop_a"]> } => Boolean(z)).map(({ qui, p }) => {
          const [pa, pb] = m.a === x.id ? [p.a, p.b] : [p.b, p.a];
          return { auteur: ((qui === x.id ? x : y).nom || "?").split(" ")[0], a: pa, b: pb, v: p.v };
        });
        return (
          <FeuilleScore titre="Score du barrage" ou={ou} gauche={{ id: x.id, nom: x.nom, n: `${x.rang}e` }} droite={{ id: y.id, nom: y.nom, n: `${y.rang}e` }}
            init={{ a: a ?? props[0]?.a ?? 0, b: c ?? props[0]?.b ?? 0, v: m.vainqueur }} propositions={props} ko="monte"
            note={valideur ? "Le score compte aussitôt. Les deux joueurs sont prévenus." : undefined}
            enregistrer={enregistrer} fermer={() => setOuvert(null)} />
        );
      })() : null}
    </div>
  );
}
