"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { estMail, type Message } from "@/lib/courrier";
import type { ContenuMail } from "@/lib/mail-modele";
import { effacerMessages, marquerLu } from "./actions";
import Ecrire from "./Ecrire";
import MailCarte from "@/components/MailCarte";
import CarteCourrier from "@/components/CarteCourrier";
import Demande from "./Demande";
import "./demande.css";

const IC: Record<string, string> = { message: "✉️", relance: "⏰", notification: "🔔" };
const LIB: Record<string, string> = { message: "Message", relance: "Relance", notification: "Notification" };

/** A list of mail: tap a line to open it (it is marked as read); messages can be answered. */
export default function Liste({ messages, vide, repondre, comptes, effacable = false }: { messages: Message[]; vide: string; repondre: "staff" | "auteur" | null; comptes?: { email: string; nom: string }[]; /** Staff: read mail can be erased. */ effacable?: boolean }) {
  const router = useRouter();
  const [partis, setPartis] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [enCours, start] = useTransition();
  const effacer = (ids: string[]) =>
    start(async () => {
      const r = await effacerMessages(ids);
      setInfo(r.message || null);
      if (r.ok) { setPartis((p) => [...p, ...ids]); router.refresh(); }
    });
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [lus, setLus] = useState<string[]>([]);
  // A link from the top band (#m-…) opens that message directly.
  useEffect(() => {
    const voir = () => {
      const id = window.location.hash.replace("#m-", "");
      const m = messages.find((x) => x.id === id);
      if (m) { setOuvert(m.id); if (!m.lu) { setLus((l) => [...l, m.id]); marquerLu(m.id); } }
    };
    voir();
    // Also when « Répondre » in the message window points here.
    window.addEventListener("hashchange", voir);
    return () => window.removeEventListener("hashchange", voir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ouvrir = (m: Message) => {
    setOuvert((o) => (o === m.id ? null : m.id));
    if (!m.lu && !lus.includes(m.id)) { setLus((l) => [...l, m.id]); marquerLu(m.id); }
  };
  const restants = messages.filter((m) => !partis.includes(m.id));
  if (!restants.length) return <>{info ? <p className="notice ok">{info}</p> : null}<p className="vide">{vide}</p></>;
  const dejaLus = restants.filter((m) => m.lu || lus.includes(m.id));
  return (
    <>
    {effacable && dejaLus.length ? (
      <div className="cr-menage">
        <button type="button" className="btn" disabled={enCours} onClick={() => effacer(dejaLus.map((m) => m.id))}>🧹 Effacer les {dejaLus.length} déjà lus</button>
        {info ? <span className="small muted">{info}</span> : null}
      </div>
    ) : null}
    <ul className="cr-liste">
      {restants.map((m) => {
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
                {estMail(m.carte) ? <MailCarte carte={m.carte as ContenuMail} /> : <CarteCourrier type={m.type} titre={m.titre} texte={m.texte} de={m.de_nom} />}
                {/* A request from the login help pages (staff): open the access in one tap. */}
                {repondre === "auteur" && m.pour_staff && ((m.carte as { demande?: unknown } | null)?.demande || /^(🔑|👋|👨‍👩‍👧|⏳|🔄|📭) /u.test(m.titre)) ? <Demande m={m} /> : null}
                {m.lien && m.lien.endsWith(".pdf") ? <a className="btn primary" href={m.lien} target="_blank" rel="noopener">📘 Ouvrir le guide (PDF)</a> : m.lien && m.lien !== "/courrier" ? <Link className="btn primary" href={m.lien}>{m.lien.includes("guide=") ? "📘 Ouvrir le guide" : "Ouvrir →"}</Link> : null}
                {effacable ? <button type="button" className="btn cr-eff" disabled={enCours} onClick={() => effacer([m.id])}>🗑️ Effacer</button> : null}
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
    </>
  );
}
