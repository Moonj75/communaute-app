"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROLES, limiteDe, limiteTitulaires, phase, statutEffectif, type Exercice, type RoleSeance, type SeanceE } from "@/lib/entrainements-types";
import { changerStatut, choisirPoste, enregistrerProgramme, validerPoste, type Retour } from "@/app/entrainements/actions";
import "./entrainements.css";

/** roles: holder lists the fiche is on; supps: roles it can take as a substitute. */
export type MaFiche = { id: string; nom: string; roles: RoleSeance[]; supps: RoleSeance[] };
export const dateLongue = (d: string) => new Date(d.slice(0, 10) + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const jm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function Pastille({ s }: { s: SeanceE }) {
  const st = statutEffectif(s);
  return <span className={`en-st ${st === "Confirmé" ? "ok" : st === "Annulé" ? "ko" : "prevu"}`}>{st === "Confirmé" ? "✅ Confirmé" : st === "Annulé" ? "❌ Annulé" : "⏳ Prévu"}</span>;
}

/** The next session: its four roles (with « I confirm » for the person concerned), and the programme of the day. */
export default function Seance({ s, noms, mesFiches, admin, entraineur, exercices }: {
  s: SeanceE; noms: Record<string, string>; mesFiches: MaFiche[]; admin: boolean; entraineur: boolean; exercices: Exercice[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [info, setInfo] = useState<Retour | null>(null);
  const [edit, setEdit] = useState(false);
  const [prog, setProg] = useState<string[]>(s.exercices);
  const [motif, setMotif] = useState("");
  const ph = phase(s.date);
  const ferme = ph === "clos" || s.annule;
  const lim = limiteDe(s.date);
  const limT = limiteTitulaires(s.date);
  const miens = new Set(mesFiches.map((f) => f.id));
  const agir = (f: () => Promise<Retour>) => start(async () => { const r = await f(); setInfo(r); if (r.ok) router.refresh(); });
  const parId = new Map(exercices.map((e) => [e.id, e]));
  const programme = s.exercices.map((id) => parId.get(id)).filter((e): e is Exercice => Boolean(e));
  const total = programme.reduce((a, e) => a + (e.duree || 0), 0);

  return (
    <div className="en">
      <section className="en-carte">
        <header className="en-tete">
          <div>
            <p className="en-k">Prochain entraînement</p>
            <h3 className="en-date">{dateLongue(s.date)}</h3>
            <p className="en-h">{[s.debut && s.fin ? `${s.debut} – ${s.fin}` : s.debut, s.lieu].filter(Boolean).join(" · ")}</p>
          </div>
          <Pastille s={s} />
        </header>
        {s.annule && s.motif ? <p className="en-motif">{s.motif}</p> : null}
        <ul className="en-roles">
          {ROLES.map((r) => {
            const p = s.postes[r.id];
            const id = p.ids[0];
            const moi = id && miens.has(id);
            const remplacant = !ferme && ph === "suppleants" && !p.ok && !moi ? mesFiches.find((f) => f.supps.includes(r.id) || f.roles.includes(r.id)) : undefined;
            return (
              <li key={r.id} className={`${p.ok ? "ok" : id ? "attente" : "vide"}${moi ? " moi" : ""}`}>
                <span className="en-ric" aria-hidden="true">{r.ic}</span>
                <span className="en-rn">{r.nom}{r.requis ? "" : <small> · facultatif</small>}</span>
                <b className="en-qui">{id ? noms[id] || "?" : "À pourvoir"}</b>
                <span className="en-etat">{p.ok ? "✅ validé" : id ? "⏳ à valider" : "—"}</span>
                {moi && !ferme ? (
                  <button type="button" className={`btn${p.ok ? "" : " primary"} en-mini`} disabled={pending} onClick={() => agir(() => validerPoste(s.id, r.id, !p.ok))}>{p.ok ? "Annuler" : "Je valide"}</button>
                ) : remplacant ? (
                  <button type="button" className="btn primary en-mini" disabled={pending} onClick={() => agir(() => choisirPoste(s.id, r.id, remplacant.id, true))}>🙋 Je prends la place</button>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="muted small en-lim">
          {ferme
            ? "Validation close (lundi 21h00 passé)."
            : ph === "titulaires"
              ? `Les personnes prévues valident jusqu'au vendredi ${jm(limT.jour)} à 21h00. Ensuite, les places non confirmées sont proposées aux suppléants jusqu'au lundi ${jm(lim.jour)} à 21h00.`
              : `Places non confirmées ouvertes aux suppléants jusqu'au lundi ${jm(lim.jour)} à 21h00. Sans entraîneur, ouvreur et fermeur confirmés, l'entraînement est annulé.`}
        </p>
        {admin ? (
          <div className="en-admin">
            <input className="input" placeholder="Motif (si annulation)" value={motif} onChange={(e) => setMotif(e.target.value)} />
            <button type="button" className="btn" disabled={pending} onClick={() => agir(() => changerStatut(s.id, "Confirmé", ""))}>Confirmer</button>
            <button type="button" className="btn" disabled={pending} onClick={() => agir(() => changerStatut(s.id, "Annulé", motif))}>Annuler</button>
            <button type="button" className="btn" disabled={pending} onClick={() => agir(() => changerStatut(s.id, "Prévu", ""))}>Remettre en prévu</button>
          </div>
        ) : null}
        {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      </section>

      <section className="en-carte">
        <header className="en-tete">
          <div>
            <p className="en-k">Programme du jour</p>
            <h3 className="en-date">{programme.length ? `${programme.length} exercice${programme.length > 1 ? "s" : ""}${total ? ` · ${total} min` : ""}` : "Pas encore préparé"}</h3>
          </div>
          {entraineur && !edit ? <button type="button" className="btn en-mini" onClick={() => setEdit(true)}>✏️ Préparer</button> : null}
        </header>
        {edit ? (
          <div className="en-prog-edit">
            <ol className="en-prog">
              {prog.map((id, i) => {
                const e = parId.get(id);
                return (
                  <li key={id}>
                    <span className="en-code">{e?.code || "?"}</span>
                    <span className="en-pt">{e?.titre || "?"}</span>
                    <span className="en-btns">
                      <button type="button" className="btn en-mini" disabled={i === 0} onClick={() => setProg((p) => { const c = [...p]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; })} aria-label="Monter">↑</button>
                      <button type="button" className="btn en-mini" disabled={i === prog.length - 1} onClick={() => setProg((p) => { const c = [...p]; [c[i + 1], c[i]] = [c[i], c[i + 1]]; return c; })} aria-label="Descendre">↓</button>
                      <button type="button" className="btn en-mini" onClick={() => setProg((p) => p.filter((x) => x !== id))} aria-label="Retirer">✕</button>
                    </span>
                  </li>
                );
              })}
            </ol>
            <select className="input" value="" onChange={(e) => { const v = e.target.value; if (v) setProg((p) => [...p, v]); }}>
              <option value="">+ Ajouter un exercice…</option>
              {exercices.filter((e) => !prog.includes(e.id)).map((e) => <option key={e.id} value={e.id}>{e.code || "—"} · {e.titre}{e.duree ? ` (${e.duree} min)` : ""}</option>)}
            </select>
            <span className="en-btns">
              <button type="button" className="btn primary" disabled={pending} onClick={() => agir(async () => { const r = await enregistrerProgramme(s.id, prog); if (r.ok) setEdit(false); return r; })}>Enregistrer le programme</button>
              <button type="button" className="btn" onClick={() => { setProg(s.exercices); setEdit(false); }}>Annuler</button>
            </span>
          </div>
        ) : programme.length ? (
          <ol className="en-prog">
            {programme.map((e) => (
              <li key={e.id}>
                <span className="en-code">{e.code || "—"}</span>
                <Link className="en-pt" href={`/entrainements?ex=${e.id}`}>{e.titre}</Link>
                <span className="muted small">{e.duree ? `${e.duree} min` : ""}{e.video ? " · 🎬" : ""}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted small">L&apos;entraîneur n&apos;a pas encore choisi les exercices.</p>
        )}
      </section>
    </div>
  );
}

/** One role cell of the monthly planning: a drop-down list for the volunteers of that role. */
export function CellulePoste({ s, role, noms, mesFiches, admin, pool }: {
  s: SeanceE; role: RoleSeance; noms: Record<string, string>; mesFiches: MaFiche[]; admin: boolean; pool: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const p = s.postes[role];
  const id = p.ids[0] || "";
  const miens = mesFiches.filter((f) => f.roles.includes(role));
  const moi = id && mesFiches.some((f) => f.id === id);
  const ph = phase(s.date);
  const ferme = ph === "clos" || s.annule;
  const libre = !id;
  // After the Friday before: an unconfirmed role can be taken by a substitute.
  const supps = ph === "suppleants" && !p.ok && !moi ? mesFiches.filter((f) => f.supps.includes(role) || f.roles.includes(role)) : [];
  const choix = admin ? pool : supps.length ? supps : miens;
  const peutChoisir = !ferme && (admin || (choix.length > 0 && (libre || moi || supps.length > 0)));
  const changer = (v: string) => start(async () => { const r = await choisirPoste(s.id, role, v || null); setErr(r.ok ? null : r.message); if (r.ok) router.refresh(); });
  const valider = () => start(async () => { const r = await validerPoste(s.id, role, !p.ok); setErr(r.ok ? null : r.message); if (r.ok) router.refresh(); });

  const r = ROLES.find((x) => x.id === role)!;
  return (
    <div className={`en-li ${p.ok ? "ok" : id ? "attente" : "vide"}${moi ? " moi" : ""}`}>
      <span className="en-li-r"><span aria-hidden="true">{r.ic}</span> {r.nom}</span>
      {peutChoisir ? (
        <select className="en-sel" value={id} disabled={pending} onChange={(e) => changer(e.target.value)} aria-label={`${ROLES.find((r) => r.id === role)!.nom} du ${s.date}`}>
          {libre || moi || admin ? <option value="">{libre ? "— Libre —" : admin && !moi ? "— Libre —" : "— Me retirer —"}</option> : null}
          {id && !choix.some((c) => c.id === id) ? <option value={id}>{noms[id] || "?"}</option> : null}
          {choix.map((c) => <option key={c.id} value={c.id}>{admin ? c.nom : supps.length ? `🙋 Moi en suppléant (${c.nom.split(" ")[0]})` : `Moi (${c.nom.split(" ")[0]})`}</option>)}
        </select>
      ) : (
        <span className="en-nom">{id ? noms[id] || "?" : "—"}</span>
      )}
      <span className="en-li-e">
        {id ? (
          moi && !ferme ? (
            <button type="button" className={`en-ok${p.ok ? " on" : ""}`} disabled={pending} onClick={valider} title={p.ok ? "Retirer ma validation" : "Je valide"}>{p.ok ? "✅ Validé" : "Valider"}</button>
          ) : (
            <span className={`en-chip ${p.ok ? "ok" : "att"}`}>{p.ok ? "✅ Validé" : "⏳ À valider"}</span>
          )
        ) : (
          <span className="en-chip vide">{r.requis ? "À pourvoir" : "Facultatif"}</span>
        )}
      </span>
      {err ? <small className="en-err">{err}</small> : null}
    </div>
  );
}
