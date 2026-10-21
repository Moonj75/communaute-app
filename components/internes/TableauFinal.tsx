"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { gagnant, nomTour, type JoueurCompet, type Match } from "@/lib/internes";
import { saisirScore } from "@/app/staff/internes/actions";

/** Knockout table: one column per round; the winner moves on by himself. The staff types scores in the boxes. */
export default function TableauFinal({ joueurs, matchs, editable = false, moi = [] }: { joueurs: JoueurCompet[]; matchs: Match[]; editable?: boolean; moi?: string[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [x, setX] = useState("");
  const [y, setY] = useState("");
  const [qui, setQui] = useState<string | null>(null);
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const nom = (id: string | null) => (id ? joueurs.find((j) => j.id === id)?.nom || "?" : null);
  const nbTours = Math.max(1, ...matchs.map((m) => (m.tour ?? 0) + 1));
  const tours = Array.from({ length: nbTours }, (_, t) => matchs.filter((m) => m.tour === t).sort((a, b) => (a.place ?? 0) - (b.place ?? 0)));

  const valider = (m: Match) =>
    start(async () => {
      if (x === "" || y === "") { setInfo({ ok: false, message: "Entre les deux scores." }); return; }
      const r = await saisirScore(m.id, Number(x), Number(y), qui);
      setInfo(r);
      if (r.ok) { setOuvert(null); router.refresh(); }
    });

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
                const peut = editable && m.a && m.b && !exempt;
                return (
                  <div key={m.id} className={`tf-m${m.joue ? " joue" : ""}${ouvert === m.id ? " on" : ""}`}>
                    {[m.a, m.b].map((id, k) => (
                      <div key={k} className={`tf-j${w && id === w ? " w" : ""}${id && moi.includes(id) ? " moi" : ""}`}>
                        <span className="tf-nom">{nom(id) || (exempt ? "— exempt —" : "…")}</span>
                        <span className="tf-s num">{m.joue && !exempt ? (k === 0 ? m.buts_a : m.buts_b) : ""}</span>
                      </div>
                    ))}
                    {peut && ouvert !== m.id ? (
                      <button type="button" className="tf-edit" onClick={() => { setOuvert(m.id); setX(m.buts_a?.toString() ?? ""); setY(m.buts_b?.toString() ?? ""); setQui(m.vainqueur); setInfo(null); }}>{m.joue ? "✎" : "+ Score"}</button>
                    ) : null}
                    {ouvert === m.id ? (
                      <div className="tf-saisie">
                        <span className="ig-champs">
                          <input inputMode="numeric" value={x} onChange={(e) => setX(e.target.value.replace(/\D/g, "").slice(0, 2))} aria-label={`Buts de ${nom(m.a)}`} autoFocus />
                          <b>–</b>
                          <input inputMode="numeric" value={y} onChange={(e) => setY(e.target.value.replace(/\D/g, "").slice(0, 2))} aria-label={`Buts de ${nom(m.b)}`} />
                        </span>
                        {x !== "" && x === y ? (
                          <select className="input" value={qui || ""} onChange={(e) => setQui(e.target.value || null)} aria-label="Qui passe ?">
                            <option value="">Qui passe ? (prolongations / tirs)</option>
                            <option value={m.a!}>{nom(m.a)}</option>
                            <option value={m.b!}>{nom(m.b)}</option>
                          </select>
                        ) : null}
                        <span className="ig-btns">
                          <button type="button" className="btn primary" disabled={pending} onClick={() => valider(m)}>✓ Valider</button>
                          <button type="button" className="btn" onClick={() => setOuvert(null)}>✕</button>
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
    </div>
  );
}
