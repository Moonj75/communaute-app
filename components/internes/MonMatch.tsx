"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AJouer } from "@/lib/internes";
import { proposerScore } from "@/app/internes/actions";

/**
 * One of my matches to play: I type the score (my goals – his goals). Validated by itself when my
 * opponent typed the same; one tap confirms the score he already typed.
 */
export default function MonMatch({ m, joueurId, joueurNom }: { m: AJouer; joueurId: string; joueurNom: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [x, setX] = useState(m.moi ? String(m.moi.m) : "");
  const [y, setY] = useState(m.moi ? String(m.moi.s) : "");
  const [qui, setQui] = useState<string | null>(m.moi?.v || null);
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const envoyer = (a: number, b: number, v: string | null) =>
    start(async () => {
      const r = await proposerScore(m.id, joueurId, a, b, v);
      setInfo(r);
      if (r.ok) { setOuvert(false); router.refresh(); }
    });
  const valider = () => {
    if (x === "" || y === "") { setInfo({ ok: false, message: "Entre les deux scores." }); return; }
    envoyer(Number(x), Number(y), m.ko && x === y ? qui : null);
  };

  // Where it stands.
  const accord = m.moi && m.lui && m.moi.m === m.lui.m && m.moi.s === m.lui.s;
  const etat = !m.moi && !m.lui ? "aucun" : m.moi && !m.lui ? "attente" : !m.moi && m.lui ? "confirmer" : accord ? "attente" : "desaccord";

  return (
    <li className={`mo e-${etat}`}>
      <div className="mo-ligne">
        <span className="mo-t"><span className="mm-vs">contre</span> <b>{m.contre}</b></span>
        {etat === "aucun" && !ouvert ? <button type="button" className="mo-btn" onClick={() => setOuvert(true)}><span className="mo-btn-ic" aria-hidden="true">⚽</span><span className="mo-btn-t">Mettre le score</span><span className="mo-btn-fl" aria-hidden="true">›</span></button> : null}
        {etat === "attente" ? <span className="mo-et">⏳ Ton score : <b className="num">{m.moi!.m}–{m.moi!.s}</b> · en attente de {m.contre.split(" ")[0]}</span> : null}
        {etat === "desaccord" ? <span className="mo-et">⚠️ Toi <b className="num">{m.moi!.m}–{m.moi!.s}</b> · lui <b className="num">{m.lui!.m}–{m.lui!.s}</b> : le staff va trancher</span> : null}
      </div>
      {etat === "confirmer" && !ouvert ? (
        <div className="mo-conf">
          <span>✋ {m.contre.split(" ")[0]} a mis le score : <b>toi <span className="num">{m.lui!.m}</span> – <span className="num">{m.lui!.s}</span> {m.contre.split(" ")[0]}</b>{m.lui!.v ? ` (${m.lui!.v === joueurId ? "tu passes" : "il passe"})` : ""}. Tu confirmes ?</span>
          <span className="mo-act">
            <button type="button" className="btn primary" disabled={pending} onClick={() => envoyer(m.lui!.m, m.lui!.s, m.lui!.v)}>{pending ? "…" : "✓ C'est juste"}</button>
            <button type="button" className="btn" onClick={() => { setOuvert(true); setX(""); setY(""); }}>Ce n&apos;est pas ça</button>
          </span>
        </div>
      ) : null}
      {(etat === "attente" || etat === "desaccord") && !ouvert ? <button type="button" className="mo-lien" onClick={() => setOuvert(true)}>Corriger mon score</button> : null}
      {ouvert ? (
        <div className="mo-saisie">
          <div className="ig-duel">
            <span className="ig-j">{joueurNom.split(" ")[0]}<small> (toi)</small></span>
            <span className="ig-champs">
              <input inputMode="numeric" aria-label="Mes buts" value={x} onChange={(e) => setX(e.target.value.replace(/\D/g, "").slice(0, 2))} autoFocus />
              <b>–</b>
              <input inputMode="numeric" aria-label={`Buts de ${m.contre}`} value={y} onChange={(e) => setY(e.target.value.replace(/\D/g, "").slice(0, 2))} onKeyDown={(e) => e.key === "Enter" && valider()} />
            </span>
            <span className="ig-j">{m.contre.split(" ")[0]}</span>
          </div>
          {m.ko && x !== "" && x === y ? (
            <select className="input" value={qui || ""} onChange={(e) => setQui(e.target.value || null)} aria-label="Qui passe ?">
              <option value="">Match nul : qui passe ? (prolongations / tirs)</option>
              <option value={joueurId}>Moi</option>
              <option value={m.contreId}>{m.contre}</option>
            </select>
          ) : null}
          <span className="ig-btns">
            <button type="button" className="btn primary" disabled={pending} onClick={valider}>{pending ? "…" : "✓ Envoyer"}</button>
            <button type="button" className="btn" onClick={() => setOuvert(false)}>Annuler</button>
          </span>
        </div>
      ) : null}
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
    </li>
  );
}
