"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROLES, statutEffectif, type RoleSeance, type SeanceE } from "@/lib/entrainements-types";
import { actualiserNotion, type Retour } from "@/app/entrainements/actions";
import { CellulePoste, Pastille, type MaFiche } from "./EntSeance";
import "./entrainements.css";

const jourLong = (d: string) => new Date(d.slice(0, 10) + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const nomMois = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("fr-BE", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Monthly planning of the Friday trainings: one line per session, one column per role.
 * Volunteers of a role (Notion → Rôles) put themselves on a free date with the drop-down list.
 * The Fridays are created by themselves, always one month ahead; nothing to publish.
 */
export default function Planning({ mois, seances, noms, mesFiches, admin, pools }: {
  mois: string[]; seances: SeanceE[]; noms: Record<string, string>; mesFiches: MaFiche[]; admin: boolean; pools: Record<RoleSeance, { id: string; nom: string }[]>;
}) {
  const router = useRouter();
  // Once the last Friday of this month is decided (confirmed or cancelled), the planning opens on next month.
  const [m, setM] = useState(() => {
    const ceMois = seances.filter((s) => s.date.startsWith(mois[0]));
    const derniere = ceMois[ceMois.length - 1];
    return mois[1] && (!derniere || statutEffectif(derniere) !== "Prévu") ? mois[1] : mois[0];
  });
  const [pending, start] = useTransition();
  const [info, setInfo] = useState<Retour | null>(null);
  const liste = seances.filter((s) => s.date.startsWith(m));
  const agir = (f: () => Promise<Retour>) => start(async () => { const r = await f(); setInfo(r); if (r.ok) router.refresh(); });
  const mesRoles = new Set(mesFiches.flatMap((f) => [...f.roles, ...f.supps]));

  return (
    <div className="en">
      <div className="en-mois" role="tablist" aria-label="Mois">
        {mois.map((x) => (
          <button key={x} type="button" role="tab" aria-selected={x === m} className={x === m ? "on" : undefined} onClick={() => { setM(x); setInfo(null); }}>{nomMois(x)}</button>
        ))}
      </div>
      {!admin && !mesRoles.size ? <p className="muted small">Planning des vendredis. Pour rejoindre l&apos;équipe (entraîneur, ouvreur, fermeur, buvette ou suppléant), demande au staff de t&apos;ajouter à la liste.</p> : null}
      {!admin && mesRoles.size ? <p className="muted small">Choisis « Moi » sur une date libre et valide au plus tard le vendredi d&apos;avant à 21h00 (tu peux valider tout de suite). Ensuite, la place non confirmée est proposée aux suppléants.</p> : null}
      {liste.length ? (
        <div className="en-grille">
          {liste.map((s) => (
            <section key={s.id} className="en-ven">
              <header className="en-ven-t">
                <b className="en-ven-d">{jourLong(s.date)}</b>
                <Pastille s={s} />
              </header>
              {ROLES.map((r) => <CellulePoste key={r.id} s={s} role={r.id} noms={noms} mesFiches={mesFiches} admin={admin} pool={pools[r.id]} />)}
            </section>
          ))}
        </div>
      ) : (
        <p className="vide">Pas encore de séances en {nomMois(m)} : les vendredis arrivent tout seuls, un mois à l&apos;avance.</p>
      )}
      {admin || mesRoles.size ? <a className="btn" href="/entrainements?guide=1">📘 Guide de l&apos;équipe</a> : null}
      {admin ? (
        <div className="en-admin">
          <button type="button" className="btn" disabled={pending} onClick={() => agir(actualiserNotion)}>🔄 Mettre à jour depuis Notion</button>
          <a className="btn" href="/staff/notifications?cible=ent%3Atous#bloc-envoyer">📣 Notifier l&apos;équipe</a>
        </div>
      ) : null}
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      <p className="muted small">✅ validé · ⏳ à valider · vendredi d&apos;avant 21h00 : places non confirmées proposées aux suppléants · lundi 21h00 : confirmé si entraîneur, ouvreur et fermeur, sinon annulé.</p>
    </div>
  );
}
