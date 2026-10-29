"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { gagnant, nomTour, type JoueurCompet, type Match } from "@/lib/internes";
import { saisirScore } from "@/app/staff/internes/actions";
import { validerMatch } from "@/app/internes/actions";
import FeuilleScore from "./FeuilleScore";

/** Knockout table: one column per round; the winner moves on by himself. The staff types scores in the boxes. */
export default function TableauFinal({ joueurs, matchs, editable = false, valideur = false, ou, moi = [] }: { joueurs: JoueurCompet[]; matchs: Match[]; editable?: boolean; valideur?: boolean; ou?: string; moi?: string[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const nom = (id: string | null) => (id ? joueurs.find((j) => j.id === id)?.nom || "?" : null);
  const nbTours = Math.max(1, ...matchs.map((m) => (m.tour ?? 0) + 1));
  const tours = Array.from({ length: nbTours }, (_, t) => matchs.filter((m) => m.tour === t).sort((a, b) => (a.place ?? 0) - (b.place ?? 0)));

  const enregistrer = async (m: Match, a: number, b: number, v: string | null) => {
    const r = valideur ? await validerMatch(m.id, a, b, v) : await saisirScore(m.id, a, b, v);
    setInfo(r);
    if (r.ok) router.refresh();
    return r;
  };
  const mo = matchs.find((m) => m.id === ouvert);

  return (
    <div className="tf">
      <div className="tf-scroll">
        {tours.map((ms, t) => (
          <div key={t} className="tf-tour">
            <p className="tf-titre">{nomTour(t, nbTours)}</p>
            <div className="tf-col">
              {ms.map((m) => {
                const w = gagnant(m);
                const exempt = m.joue && (!m.a || !m.b);
                const peut = editable && m.a && m.b && !exempt && (!valideur || !m.joue);
                return (
                  <div key={m.id} className={`tf-m${m.joue ? " joue" : ""}${ouvert === m.id ? " on" : ""}`}>
                    {[m.a, m.b].map((id, k) => (
                      <div key={k} className={`tf-j${w && id === w ? " w" : ""}${id && moi.includes(id) ? " moi" : ""}`}>
                        <span className="tf-nom">{nom(id) || (exempt ? "— exempt —" : "…")}</span>
                        <span className="tf-s num">{m.joue && !exempt ? (k === 0 ? m.buts_a : m.buts_b) : ""}</span>
                      </div>
                    ))}
                    {peut && ouvert !== m.id ? (
                      <button type="button" className="tf-edit" onClick={() => { setOuvert(m.id); setInfo(null); }}>{m.joue ? "✎" : "+ Score"}</button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      {mo && mo.a && mo.b ? (() => {
        const props = [mo.prop_a ? { qui: mo.a, p: mo.prop_a } : null, mo.prop_b ? { qui: mo.b, p: mo.prop_b } : null].filter((z): z is { qui: string; p: NonNullable<Match["prop_a"]> } => Boolean(z)).map(({ qui, p }) => ({ auteur: (nom(qui) || "?").split(" ")[0], a: p.a, b: p.b, v: p.v }));
        return (
          <FeuilleScore titre={nomTour(mo.tour ?? 0, nbTours)} ou={ou} gauche={{ id: mo.a, nom: nom(mo.a) || "?" }} droite={{ id: mo.b, nom: nom(mo.b) || "?" }}
            init={{ a: mo.buts_a ?? props[0]?.a ?? 0, b: mo.buts_b ?? props[0]?.b ?? 0, v: mo.vainqueur }} propositions={props} ko="passe"
            note={valideur ? "Le score compte aussitôt. Les deux joueurs sont prévenus." : undefined}
            enregistrer={(a, b, v) => enregistrer(mo, a, b, v)} fermer={() => setOuvert(null)} />
        );
      })() : null}
    </div>
  );
}
