"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Message } from "@/lib/courrier";
import { ouvrirMessage } from "./actions";
import CarteCourrier from "@/components/CarteCourrier";
import MailCarte from "@/components/MailCarte";

type Genre = "relance" | "notification" | "message";
const GENRES = {
  relance: { ic: "⏰", nom: "Relance du club", c: "relance" },
  notification: { ic: "🔔", nom: "Notification du club", c: "notif" },
  message: { ic: "✉️", nom: "Message", c: "msg" },
} as const;

function bouton(lien: string) {
  if (lien.startsWith("/inscriptions")) return "📝 Répondre au formulaire";
  if (lien.startsWith("/calendrier")) return "📅 Voir l'évènement";
  if (lien.startsWith("/staff/planning")) return "✅ Ouvrir le planning";
  if (lien.startsWith("/staff")) return "🛡️ Ouvrir l'espace staff";
  if (lien.startsWith("/fiche")) return "🦁 Ouvrir ma fiche";
  if (lien.startsWith("/club/classements")) return "🏆 Voir le classement";
  return "👉 Y aller";
}

/**
 * The window of a notification, shown at once from what the notification itself carried
 * (title, text, link). The full message (sender, date, whole text) is fetched in the background
 * and fills it in; the message is marked as read.
 */
export default function FenetreNotif() {
  const sp = useSearchParams();
  const router = useRouter();
  const [m, setM] = useState<Message | null>(null);
  const titreUrl = sp.get("titre") || "";
  const id = sp.get("m");

  useEffect(() => {
    let vivant = true;
    ouvrirMessage({ id, titre: titreUrl }).then((r) => vivant && r && setM(r)).catch(() => {});
    return () => { vivant = false; };
  }, [id, titreUrl]);

  const fermer = () => router.replace("/");
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const type = (m?.type || sp.get("type") || "notification") as Genre;
  const g = GENRES[type] || GENRES.notification;
  const titre = m?.titre || titreUrl || "Message du club";
  const texte = m?.texte || sp.get("texte") || "";
  const lienBrut = m?.lien || sp.get("lien") || "";
  // Only a page of the app (« /… »): a link to another site, slipped into an address, is ignored.
  const interne = lienBrut.startsWith("/") && !lienBrut.startsWith("//") && !lienBrut.includes("\\");
  const lien = interne && !lienBrut.startsWith("/courrier") && !lienBrut.startsWith("/notif") && lienBrut !== "/" ? lienBrut : "";
  const quand = m ? new Date(m.cree_le).toLocaleString("fr-BE", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" }) : "À l'instant";

  return (
    <div className="fm-fond fm-page" role="dialog" aria-modal="true" aria-label={titre}>
      <article className={`fm g-${g.c}`}>
        <header className="fm-tete">
          <span className="fm-ic" aria-hidden="true">{g.ic}</span>
          <span className="fm-genre">{g.nom}</span>
          <button type="button" className="fm-x" onClick={fermer} aria-label="Fermer">✕</button>
        </header>
        <div className="fm-corps">
          <p className="fm-meta">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/crest.png" alt="" width={22} height={22} />
            <span><b>{m?.de_nom || "SC Lions d'Eugies"}</b> · <span className="fm-quand">{quand}</span></span>
          </p>
          {m?.carte ? <MailCarte carte={m.carte} /> : <CarteCourrier type={type} titre={titre} texte={texte} de={m?.de_nom} />}
        </div>
        <footer className="fm-pied">
          {lien ? <Link className="btn primary fm-go" href={lien}>{bouton(lien)}</Link> : null}
          {type === "message" ? <Link className="btn" href={m ? `/courrier#m-${m.id}` : "/courrier"}>↩️ Répondre</Link> : <Link className="btn" href="/courrier">📬 Mon courrier</Link>}
          <button type="button" className="btn fm-ok" onClick={fermer}>{lien ? "Plus tard" : "Fermer"}</button>
        </footer>
      </article>
    </div>
  );
}
