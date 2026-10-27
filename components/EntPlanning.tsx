"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROLES, type RoleSeance, type SeanceE } from "@/lib/entrainements-types";
import { completerMois, creerMois, publierMois, type Retour } from "@/app/entrainements/actions";
import { CellulePoste, Pastille, type MaFiche } from "./EntSeance";
import "./entrainements.css";

const nomMois = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("fr-BE", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Monthly planning of the Friday trainings: one line per session, one column per role.
 * Volunteers of a role (Notion → Rôles) put themselves on a free date with the drop-down list;
 * the staff fills in, completes automatically and publishes the month.
 */
export default function Planning({ mois, seances, noms, mesFiches, admin, equipe = admin, pools }: {
  mois: string[]; seances: SeanceE[]; noms: Record<string, string>; mesFiches: MaFiche[]; admin: boolean; /** Training crew: creates, completes and publishes the month itself. */ equipe?: boolean; pools: Record<RoleSeance, { id: string; nom: string }[]>;
}) {
  const router = useRouter();
  const [m, setM] = useState(mois[0]);
  const [pending, start] = useTransition();
  const [info, setInfo] = useState<Retour | null>(null);
  const liste = seances.filter((s) => s.date.startsWith(m));
  const agir = (f: () => Promise<Retour>) => start(async () => { const r = await f(); setInfo(r); if (r.ok) router.refresh(); });
  const mesRoles = new Set(mesFiches.flatMap((f) => [...f.roles, ...f.supps]));
  const publie = liste.length > 0 && liste.every((s) => s.publie);

  return (
    <div className="en">
      <div className="en-mois" role="tablist" aria-label="Mois">
        {mois.map((x) => (
          <button key={x} type="button" role="tab" aria-selected={x === m} className={x === m ? "on" : undefined} onClick={() => { setM(x); setInfo(null); }}>{nomMois(x)}</button>
        ))}
      </div>
      {!admin && !mesRoles.size ? <p className="muted small">Planning des vendredis. Pour rejoindre l&apos;équipe (entraîneur, ouvreur, fermeur, buvette ou suppléant), demande au staff de t&apos;ajouter à la liste.</p> : null}
      {!admin && mesRoles.size ? <p className="muted small">Choisis « Moi » sur une date libre et valide au plus tard le vendredi d&apos;avant à 21h00 (tu peux valider tout de suite). Ensuite, la place non confirmée est proposée aux suppléants. Le planning est géré par l&apos;équipe : chacun peut créer les vendredis, compléter et publier.</p> : null}
      {liste.length ? (
        <div className="en-tab-cadre">
          <table className="en-tab">
            <thead>
              <tr>
                <th>Vendredi</th>
                {ROLES.map((r) => <th key={r.id} title={r.nom}>{r.ic} <span className="en-thn">{r.nom}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {liste.map((s) => (
                <tr key={s.id}>
                  <th className="en-d">
                    <b>{s.date.slice(8, 10)}/{s.date.slice(5, 7)}</b>
                    <Pastille s={s} />
                  </th>
                  {ROLES.map((r) => <CellulePoste key={r.id} s={s} role={r.id} noms={noms} mesFiches={mesFiches} admin={admin} pool={pools[r.id]} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="vide">Pas encore de séances en {nomMois(m)}.{equipe ? " Crée les vendredis ci-dessous." : ""}</p>
      )}
      {equipe ? (
        <div className="en-admin">
          <button type="button" className="btn" disabled={pending} onClick={() => agir(() => creerMois(m))}>📅 Créer les vendredis</button>
          <button type="button" className="btn" disabled={pending || !liste.length} onClick={() => agir(() => completerMois(m))}>🔄 Compléter automatiquement</button>
          <button type="button" className="btn primary" disabled={pending || !liste.length} onClick={() => agir(() => publierMois(m))}>{publie ? "📣 Publier à nouveau" : "📣 Publier le planning"}</button>
        </div>
      ) : null}
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      <p className="muted small">✅ validé · ⏳ à valider · vendredi d&apos;avant 21h00 : places non confirmées proposées aux suppléants · lundi 21h00 : confirmé si entraîneur, ouvreur et fermeur, sinon annulé.</p>
    </div>
  );
}
