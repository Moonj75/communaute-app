"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AValider as Item, Proposition } from "@/lib/internes";
import { validerMatch } from "@/app/internes/actions";

type Choix = { item: Item; a: number; b: number; v: string | null };

/**
 * Validators: the scores typed by the players and not validated yet. One tap on a score, a confirmation,
 * and the match counts in the standings. A validator never validates his own match.
 */
export default function AValider({ items, miens }: { items: Item[]; miens: string[] }) {
  const router = useRouter();
  const [choix, setChoix] = useState<Choix | null>(null);
  const [autre, setAutre] = useState<Record<string, { a: string; b: string }>>({});
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [faits, setFaits] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const liste = items.filter((x) => !faits.includes(x.match.id));
  const confirmer = () =>
    start(async () => {
      if (!choix) return;
      if (choix.item.ko && choix.a === choix.b && !choix.v) { setInfo({ ok: false, message: "Match nul : choisis qui passe." }); return; }
      const r = await validerMatch(choix.item.match.id, choix.a, choix.b, choix.item.ko && choix.a === choix.b ? choix.v : null);
      setInfo(r);
      if (r.ok) { setFaits((f) => [...f, choix.item.match.id]); setChoix(null); router.refresh(); }
    });

  if (!liste.length) return <div className="av-vide"><span aria-hidden="true">✅</span><b>Aucun score à valider</b><small>Tout est à jour. Les nouveaux scores mis par les joueurs apparaîtront ici.</small>{info?.ok ? <p className="notice ok">{info.message}</p> : null}</div>;

  return (
    <div className="av">
      <p className="muted small">Scores mis par les joueurs, en attente. Choisis le bon score : une confirmation est toujours demandée avant de valider. Tu ne peux pas valider un match que tu joues.</p>
      {info && !choix ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      <ul className="av-l">
        {liste.map((it) => {
          const { match: m, a, b } = it;
          const moi = miens.includes(a.id) || miens.includes(b.id);
          const props = [m.prop_a ? { qui: a, p: m.prop_a } : null, m.prop_b ? { qui: b, p: m.prop_b } : null].filter(Boolean) as { qui: { id: string; nom: string }; p: Proposition }[];
          const saisie = autre[m.id] || { a: "", b: "" };
          return (
            <li key={m.id} className={`av-c${it.desaccord ? " desac" : ""}${moi ? " moi" : ""}`}>
              <p className="av-ou">{it.compet} · {it.etape}{it.groupe ? ` · ${it.groupe}` : ""}</p>
              <p className="av-duel"><b>{a.nom}</b><i>contre</i><b>{b.nom}</b></p>
              <p className={`av-etat${it.desaccord ? " desac" : ""}`}>{it.desaccord ? "⚠️ Les deux joueurs ont mis des scores différents" : "⏳ Un joueur a mis le score, l'autre n'a pas encore confirmé"}</p>
              {moi ? <p className="av-moi">🙅 C&apos;est ton match : un autre valideur doit le valider.</p> : (
                <div className="av-props">
                  {props.map(({ qui, p }) => (
                    <button key={qui.id} type="button" className="av-prop" onClick={() => { setInfo(null); setChoix({ item: it, a: p.a, b: p.b, v: p.v }); }}>
                      <small>Score mis par {qui.nom.split(" ")[0]}</small>
                      <span><b className="num">{p.a}–{p.b}</b>{p.v ? <em> · {p.v === a.id ? a.nom.split(" ")[0] : b.nom.split(" ")[0]} passe</em> : null}</span>
                      <strong>Valider ce score</strong>
                    </button>
                  ))}
                  <span className="av-autre">
                    <small>Autre score</small>
                    <span className="ig-champs">
                      <input inputMode="numeric" aria-label={`Buts de ${a.nom}`} value={saisie.a} onChange={(e) => setAutre((x) => ({ ...x, [m.id]: { ...saisie, a: e.target.value.replace(/\D/g, "").slice(0, 2) } }))} />
                      <b>–</b>
                      <input inputMode="numeric" aria-label={`Buts de ${b.nom}`} value={saisie.b} onChange={(e) => setAutre((x) => ({ ...x, [m.id]: { ...saisie, b: e.target.value.replace(/\D/g, "").slice(0, 2) } }))} />
                    </span>
                    <button type="button" className="btn" disabled={saisie.a === "" || saisie.b === ""} onClick={() => { setInfo(null); setChoix({ item: it, a: Number(saisie.a), b: Number(saisie.b), v: null }); }}>Valider</button>
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {choix ? (
        <div className="ig-fond" onClick={() => !pending && setChoix(null)}>
          <div className="ig-saisie av-conf" role="dialog" aria-label="Confirmer la validation" onClick={(e) => e.stopPropagation()}>
            <p className="ig-qui">Confirmer la validation</p>
            <p className="av-conf-s"><b>{choix.item.a.nom}</b><span className="num">{choix.a}–{choix.b}</span><b>{choix.item.b.nom}</b></p>
            {choix.item.ko && choix.a === choix.b ? (
              <select className="input" value={choix.v || ""} onChange={(e) => setChoix({ ...choix, v: e.target.value || null })} aria-label="Qui passe ?">
                <option value="">Match nul : qui passe ?</option>
                <option value={choix.item.a.id}>{choix.item.a.nom}</option>
                <option value={choix.item.b.id}>{choix.item.b.nom}</option>
              </select>
            ) : null}
            <p className="muted small">Ce score comptera aussitôt dans le classement. Les deux joueurs seront prévenus.</p>
            <span className="ig-btns">
              <button type="button" className="btn primary" disabled={pending} onClick={confirmer}>{pending ? "…" : "✓ Oui, valider"}</button>
              <button type="button" className="btn" disabled={pending} onClick={() => setChoix(null)}>Annuler</button>
            </span>
            {info && !info.ok ? <p className="notice err">{info.message}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
