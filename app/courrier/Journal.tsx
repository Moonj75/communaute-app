"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Envoi } from "@/lib/courrier";
import { effacerMessages, type EtatMessage } from "./actions";

const IC = { relance: "⏰", notification: "🔔", message: "✉️" } as const;
const LIB = { relance: "Relance", notification: "Notification", message: "Message" } as const;
const FILTRES = [
  { id: "", txt: "Tout" },
  { id: "relance", txt: "⏰ Relances" },
  { id: "notification", txt: "🔔 Notifications" },
  { id: "message", txt: "✉️ Messages" },
] as const;

/**
 * Staff journal: every message and notification the club sent, one line per sending, with who read it.
 * The staff can erase a sending (all its copies) or, in one go, everything already read by everyone.
 */
export default function Journal({ envois, noms }: { envois: Envoi[]; noms: [string, string][] }) {
  const router = useRouter();
  const nom = useMemo(() => new Map(noms), [noms]);
  const [filtre, setFiltre] = useState("");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);
  const [retour, setRetour] = useState<EtatMessage | null>(null);
  const [pending, start] = useTransition();

  const vus = envois.filter((e) => !filtre || e.type === filtre);
  const tousLus = vus.filter((e) => e.destinataires.every((d) => d.lu));
  const effacer = (ids: string[]) =>
    start(async () => {
      const r = await effacerMessages(ids);
      setRetour(r);
      setAConfirmer(null);
      if (r.ok) router.refresh();
    });

  return (
    <div className="jr">
      <div className="jr-barre">
        <div className="jr-filtres">
          {FILTRES.map((f) => (
            <button key={f.id} type="button" className={`chip${filtre === f.id ? " on" : ""}`} onClick={() => setFiltre(f.id)}>{f.txt}</button>
          ))}
        </div>
        {tousLus.length ? (
          aConfirmer === "tous" ? (
            <span className="jr-conf">
              Effacer {tousLus.length} envoi(s) lus par tous ?
              <button type="button" className="btn jr-oui" disabled={pending} onClick={() => effacer(tousLus.flatMap((e) => e.ids))}>Oui, effacer</button>
              <button type="button" className="btn" onClick={() => setAConfirmer(null)}>Non</button>
            </span>
          ) : (
            <button type="button" className="btn jr-tout" onClick={() => setAConfirmer("tous")}>🧹 Effacer les {tousLus.length} lus par tous</button>
          )
        ) : null}
      </div>
      {retour ? <p className={`notice ${retour.ok ? "ok" : "err"}`}>{retour.message}</p> : null}

      {!vus.length ? <p className="vide">Le journal est vide.</p> : null}
      <ul className="jr-l">
        {vus.map((e) => {
          const lus = e.destinataires.filter((d) => d.lu).length;
          const n = e.destinataires.length;
          const on = ouvert === e.cle;
          const pc = n ? Math.round((lus / n) * 100) : 0;
          return (
            <li key={e.cle} className={`jr-e t-${e.type}${lus === n ? " lu" : ""}${on ? " on" : ""}`}>
              <button type="button" className="jr-tete" onClick={() => setOuvert(on ? null : e.cle)} aria-expanded={on}>
                <span className="jr-ic" aria-hidden="true">{IC[e.type]}</span>
                <span className="jr-t">
                  <small>{LIB[e.type]} · {new Date(e.cree_le).toLocaleString("fr-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" })} · {e.pour_staff ? `de ${e.de_nom || "?"} → staff` : e.de_nom ? `de ${e.de_nom}` : "automatique"}</small>
                  <b>{e.titre}</b>
                </span>
                <span className="jr-lus" title={`Lu par ${lus} sur ${n}`}>
                  <span className="num">{lus}/{n}</span>
                  <span className="jr-bar"><i style={{ width: `${pc}%` }} /></span>
                </span>
              </button>
              {on ? (
                <div className="jr-corps">
                  {e.texte ? <p className="pre">{e.texte}</p> : null}
                  <p className="jr-k">Destinataires</p>
                  <div className="jr-dest">
                    {e.destinataires.map((d, i) => (
                      <span key={i} className={`jr-d${d.lu ? " lu" : ""}`}>{d.lu ? "✓" : "•"} {d.email === "staff" ? "Le staff" : nom.get(d.email) || d.email}</span>
                    ))}
                  </div>
                  <div className="jr-act">
                    {aConfirmer === e.cle ? (
                      <span className="jr-conf">
                        {lus < n ? `${n - lus} personne(s) ne l'ont pas encore lu. ` : ""}Effacer cet envoi ?
                        <button type="button" className="btn jr-oui" disabled={pending} onClick={() => effacer(e.ids)}>Oui, effacer</button>
                        <button type="button" className="btn" onClick={() => setAConfirmer(null)}>Non</button>
                      </span>
                    ) : (
                      <button type="button" className="btn" onClick={() => setAConfirmer(e.cle)}>🗑️ Effacer cet envoi</button>
                    )}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
