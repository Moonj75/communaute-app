"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Message } from "@/lib/courrier";
import { marquerLu } from "./actions";

const GENRES = {
  relance: { ic: "⏰", nom: "Relance du club", c: "relance" },
  notification: { ic: "🔔", nom: "Notification du club", c: "notif" },
  message: { ic: "✉️", nom: "Message", c: "msg" },
} as const;

/** The right words for the main button, from where the message leads. */
function bouton(lien: string) {
  if (lien.startsWith("/inscriptions")) return "📝 Répondre au formulaire";
  if (lien.startsWith("/calendrier")) return "📅 Voir l'évènement";
  if (lien.startsWith("/staff/planning")) return "✅ Ouvrir le planning";
  if (lien.startsWith("/staff")) return "🛡️ Ouvrir l'espace staff";
  if (lien.startsWith("/fiche")) return "🦁 Ouvrir ma fiche";
  if (lien.startsWith("/club/classements")) return "🏆 Voir le classement";
  return "👉 Y aller";
}

const sans = (t: string) => t.replace(/^[^\p{L}\p{N}]+/u, "").trim();

/**
 * Opened from a phone notification (the service worker opens /courrier?ouvrir=…): the message is shown
 * in a window over the Courrier, with its whole text, who sent it, when, and the button that leads on.
 * It is marked as read. Also opens from a message of the list (?m=<id>).
 */
export default function Fenetre({ messages }: { messages: Message[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const ouvrir = sp.get("ouvrir");
  const id = sp.get("m");
  const [ferme, setFerme] = useState(false);
  const [pret, setPret] = useState(false);
  useEffect(() => setPret(true), []);
  useEffect(() => setFerme(false), [ouvrir, id]);

  // The message of the notification: the newest one with that title (with or without its emoji).
  const m = useMemo(() => {
    if (id) return messages.find((x) => x.id === id) || null;
    if (!ouvrir) return null;
    const cle = sans(ouvrir);
    return messages.find((x) => x.titre === ouvrir || sans(x.titre) === cle) || null;
  }, [messages, ouvrir, id]);

  useEffect(() => {
    if (m && !m.lu) marquerLu(m.id).catch(() => {});
  }, [m]);

  const fermer = () => {
    setFerme(true);
    router.replace("/courrier", { scroll: false });
  };
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pret || ferme || (!ouvrir && !id)) return null;

  // Not found in the mailbox (e.g. a test): what the notification itself carried.
  const titre = m?.titre || ouvrir || "Message";
  const texte = m ? m.texte : sp.get("texte");
  const lienBrut = m?.lien || sp.get("lien") || "";
  // Only a page of the app (« /… »): a link to another site, slipped into an address, is ignored.
  const interne = lienBrut.startsWith("/") && !lienBrut.startsWith("//") && !lienBrut.includes("\\");
  const lien = interne && !lienBrut.startsWith("/courrier") && lienBrut !== "/" ? lienBrut : "";
  const g = GENRES[m?.type || (titre.startsWith("📬") ? "message" : "notification")];
  const quand = m ? new Date(m.cree_le).toLocaleString("fr-BE", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" }) : "À l'instant";
  const de = m?.de_nom || "SC Lions d'Eugies";

  return createPortal(
    <div className="fm-fond" role="dialog" aria-modal="true" aria-label={titre} onClick={fermer}>
      <article className={`fm g-${g.c}`} onClick={(e) => e.stopPropagation()}>
        <header className="fm-tete">
          <span className="fm-ic" aria-hidden="true">{g.ic}</span>
          <span className="fm-genre">{g.nom}</span>
          <button type="button" className="fm-x" onClick={fermer} aria-label="Fermer">✕</button>
        </header>
        <div className="fm-corps">
          <h3 className="fm-titre">{titre}</h3>
          <p className="fm-meta">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/crest.png" alt="" width={22} height={22} />
            <span><b>{de}</b> · <span className="fm-quand">{quand}</span></span>
          </p>
          {texte ? <div className="fm-texte">{texte.split(/\n+/).map((l, i) => <p key={i}>{l}</p>)}</div> : null}
        </div>
        <footer className="fm-pied">
          {lien ? <Link className="btn primary fm-go" href={lien}>{bouton(lien)}</Link> : null}
          {m?.type === "message" ? <a className="btn fm-rep" href={`#m-${m.id}`} onClick={() => setFerme(true)}>↩️ Répondre</a> : null}
          <button type="button" className="btn fm-ok" onClick={fermer}>{lien ? "Plus tard" : "Fermer"}</button>
        </footer>
      </article>
    </div>,
    document.body,
  );
}
