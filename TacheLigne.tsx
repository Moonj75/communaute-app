"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changerEcheance, changerStatut } from "@/app/staff/actions";
import { STATUTS_TACHE } from "@/lib/club-types";

export type TacheVue = {
  id: string;
  url: string;
  titre: string;
  statut: string;
  priorite: string | null;
  type: string | null;
  echeance: string | null;
  quand: string;
  retard: boolean;
  evenement: { id: string; nom: string; m: string } | null;
  responsables: string;
  lie: boolean;
};

export default function TacheLigne({ t }: { t: TacheVue }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [vue, maj] = useOptimistic(t, (s, p: Partial<TacheVue>) => ({ ...s, ...p }));
  const router = useRouter();
  const fait = vue.statut === "Fait";

  const lancer = (patch: Partial<TacheVue>, f: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      setErr(null);
      maj(patch);
      const r = await f();
      if (!r.ok) setErr(r.message || "Erreur");
      router.refresh();
    });

  return (
    <li className={`tk${fait ? " done" : ""}${vue.retard && !fait ? " late" : ""}${t.lie ? " lie" : ""}${pending ? " busy" : ""}`}>
      <button
        type="button"
        className="chk"
        aria-pressed={fait}
        aria-label={fait ? "Marquer à faire" : "Marquer comme fait"}
        disabled={pending}
        onClick={() => lancer({ statut: fait ? "À faire" : "Fait" }, () => changerStatut(t.id, fait ? "À faire" : "Fait"))}
      >
        {fait ? "✓" : ""}
      </button>
      <div className="tk-main">
        <span className="tk-t">
          {vue.type === "⏰ Rappel" ? "⏰ " : ""}
          {vue.titre}
        </span>
        <span className="tk-meta">
          {vue.priorite && vue.priorite !== "Normal" ? <span className={`prio ${vue.priorite === "Urgent" ? "u" : "f"}`}>{vue.priorite}</span> : null}
          {vue.type && vue.type !== "⏰ Rappel" ? <span className="muted">{vue.type}</span> : null}
          {vue.evenement ? (
            <Link href={`/staff/planning?e=${vue.evenement.id}&m=${vue.evenement.m}`} scroll={false} className="tk-ev">
              🏁 {vue.evenement.nom}
            </Link>
          ) : null}
          {vue.responsables ? <span className="muted">👤 {vue.responsables}</span> : null}
        </span>
        {err ? <span className="tk-err">{err}</span> : null}
      </div>
      <div className="tk-side">
        <span className={`tk-when${vue.retard && !fait ? " late" : ""}`}>{vue.quand}</span>
        <input
          type="date"
          className="tk-date"
          aria-label="Échéance"
          defaultValue={vue.echeance || ""}
          disabled={pending}
          onChange={(ev) => {
            const v = ev.currentTarget.value || null;
            lancer({ echeance: v }, () => changerEcheance(t.id, v));
          }}
        />
        <select
          className="tk-st"
          aria-label="Statut"
          value={vue.statut}
          disabled={pending}
          onChange={(ev) => {
            const v = ev.currentTarget.value;
            lancer({ statut: v }, () => changerStatut(t.id, v));
          }}
        >
          {(STATUTS_TACHE.includes(vue.statut) ? STATUTS_TACHE : [vue.statut, ...STATUTS_TACHE]).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <a className="tk-open" href={t.url} target="_blank" rel="noopener" aria-label="Ouvrir dans Notion">↗</a>
      </div>
    </li>
  );
}
