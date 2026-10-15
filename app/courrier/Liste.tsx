"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Message } from "@/lib/courrier";
import { marquerLu } from "./actions";
import Ecrire from "./Ecrire";

const IC: Record<string, string> = { message: "✉️", relance: "⏰", notification: "🔔" };
const LIB: Record<string, string> = { message: "Message", relance: "Relance", notification: "Notification" };

/** A list of mail: tap a line to open it (it is marked as read); messages can be answered. */
export default function Liste({ messages, vide, repondre, comptes }: { messages: Message[]; vide: string; repondre: "staff" | "auteur" | null; comptes?: { email: string; nom: string }[] }) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [lus, setLus] = useState<string[]>([]);
  // A link from the top band (#m-…) opens that message directly.
  useEffect(() => {
    const id = window.location.hash.replace("#m-", "");
    const m = messages.find((x) => x.id === id);
    if (m) { setOuvert(m.id); if (!m.lu) { setLus((l) => [...l, m.id]); marquerLu(m.id); } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ouvrir = (m: Message) => {
    setOuvert((o) => (o === m.id ? null : m.id));
    if (!m.lu && !lus.includes(m.id)) { setLus((l) => [...l, m.id]); marquerLu(m.id); }
  };
  if (!messages.length) return <p className="vide">{vide}</p>;
  return (
    <ul className="cr-liste">
      {messages.map((m) => {
        const nonLu = !m.lu && !lus.includes(m.id);
        const on = ouvert === m.id;
        return (
          <li key={m.id} id={`m-${m.id}`} className={`cr-m t-${m.type}${nonLu ? " nonlu" : ""}${on ? " on" : ""}`}>
            <button type="button" className="cr-tete" onClick={() => ouvrir(m)} aria-expanded={on}>
              <span className="cr-ic" aria-hidden="true">{IC[m.type] || "✉️"}</span>
              <span className="cr-t">
                <small>{LIB[m.type]} · {m.de_nom || "SC Lions d'Eugies"} · {new Date(m.cree_le).toLocaleDateString("fr-BE", { day: "numeric", month: "short", timeZone: "Europe/Brussels" })}</small>
                <b>{m.titre}</b>
              </span>
              {nonLu ? <span className="cr-pt" aria-label="Non lu" /> : null}
            </button>
            {on ? (
              <div className="cr-corps">
                {m.texte ? <p className="pre">{m.texte}</p> : null}
                {m.lien && m.lien !== "/courrier" ? <Link className="btn primary" href={m.lien}>Ouvrir →</Link> : null}
                {repondre && m.type === "message" ? (
                  repondre === "staff" ? (
                    <Ecrire mode="staff" parent={m.id} titreInit={`Re : ${m.titre}`} compact />
                  ) : m.de_email ? (
                    <Ecrire mode="admin" parent={m.id} titreInit={`Re : ${m.titre}`} comptes={comptes || []} pour={[m.de_email]} compact />
                  ) : null
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
