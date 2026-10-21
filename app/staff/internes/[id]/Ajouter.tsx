"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ajouterJoueur } from "../actions";

/** Staff: add a late player (active or not) to a group of the stage in progress. */
export default function Ajouter({ id, groupes, joueurs }: { id: string; groupes: { id: string; nom: string }[]; joueurs: { id: string; nom: string; actif: boolean }[] }) {
  const router = useRouter();
  const [qui, setQui] = useState("");
  const [ou, setOu] = useState(groupes[0]?.id || "");
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  if (!groupes.length) return null;
  const actifs = joueurs.filter((j) => j.actif), autres = joueurs.filter((j) => !j.actif);
  const go = () =>
    start(async () => {
      const j = joueurs.find((x) => x.id === qui);
      if (!j) { setInfo({ ok: false, message: "Choisis un joueur." }); return; }
      const r = await ajouterJoueur(id, ou, { id: j.id, nom: j.nom });
      setInfo(r);
      if (r.ok) { setQui(""); router.refresh(); }
    });
  return (
    <div className="aj">
      <p className="mini-t">➕ Ajouter un joueur en cours de route</p>
      <div className="as-ligne">
        <label className="f">Joueur (liste étendue)
          <select className="input" value={qui} onChange={(e) => setQui(e.target.value)}>
            <option value="">— Choisir —</option>
            <optgroup label="Actifs">{actifs.map((j) => <option key={j.id} value={j.id}>{j.nom}</option>)}</optgroup>
            {autres.length ? <optgroup label="Non actifs">{autres.map((j) => <option key={j.id} value={j.id}>{j.nom}</option>)}</optgroup> : null}
          </select>
        </label>
        <label className="f as-court">Dans
          <select className="input" value={ou} onChange={(e) => setOu(e.target.value)}>{groupes.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}</select>
        </label>
        <button type="button" className="btn primary" disabled={pending || !qui} onClick={go}>{pending ? "…" : "Ajouter"}</button>
      </div>
      <p className="muted small">Il reçoit un match contre chaque joueur de la poule.</p>
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
    </div>
  );
}
