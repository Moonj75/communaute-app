"use client";

import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Cas = "bouton" | "ios" | "ios-autre" | "android" | "integre";

/**
 * « Installer l'appli » banner, shown on every page until the app is installed or the banner is closed.
 * - Android / computer with Chrome or Edge: the « Installer » button (native prompt);
 * - iPhone in Safari: Share ⬆️ then « Sur l'écran d'accueil »;
 * - phone without the native prompt (Samsung, Firefox, prompt not ready yet): instructions from the menu;
 * - link opened inside Gmail, WhatsApp, Facebook, Messenger…: open it in the real browser first.
 */
export default function Installer() {
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [cas, setCas] = useState<Cas | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (standalone) return;
    try {
      if (localStorage.getItem("installer-ferme") === "1") return;
    } catch {}
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const android = /Android/.test(ua);
    // Browsers built into other apps cannot install anything.
    const integre = /FBAN|FBAV|FB_IAB|Instagram|Messenger|WhatsApp|Line\/|Snapchat|GSA\/|; wv\)/.test(ua);
    if ((ios || android) && integre) setCas("integre");
    else if (ios) setCas(/CriOS|FxiOS|EdgiOS/.test(ua) ? "ios-autre" : "ios");
    else if (android) setCas("android"); // replaced by the button as soon as the browser offers it
    const h = (e: Event) => {
      e.preventDefault();
      setEvt(e as PromptEvent);
      setCas("bouton");
    };
    const fait = () => setCas(null);
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("appinstalled", fait);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("appinstalled", fait); };
  }, []);

  if (!cas) return null;
  const fermer = () => {
    setCas(null);
    try {
      localStorage.setItem("installer-ferme", "1");
    } catch {}
  };
  const texte: Record<Cas, string> = {
    bouton: "Sur ton écran d'accueil, en un clic, comme une vraie appli.",
    ios: "Dans Safari : bouton Partager ⬆️ en bas, puis « Sur l'écran d'accueil ».",
    "ios-autre": "Bouton Partager ⬆️ (en haut à droite), puis « Sur l'écran d'accueil ». Sinon, ouvre ce lien dans Safari.",
    android: "Menu ⋮ du navigateur (en haut à droite), puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».",
    integre: "Tu es dans le navigateur d'une autre appli (mail, WhatsApp…). Menu ⋮ ou ⋯ puis « Ouvrir dans Chrome » / « Ouvrir dans Safari », et installe depuis là.",
  };
  return (
    <div className="wrap install-wrap">
      <section className="install" role="note">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={44} height={44} />
        <div className="install-txt">
          <b>Installe l&apos;appli Lions Eugies</b>
          <span className="small">{texte[cas]}</span>
        </div>
        {evt ? (
          <button
            type="button"
            className="btn primary"
            onClick={async () => {
              await evt.prompt();
              const r = await evt.userChoice;
              setEvt(null);
              setCas(r.outcome === "accepted" ? null : "android");
            }}
          >
            📲 Installer
          </button>
        ) : null}
        <button type="button" className="install-x" onClick={fermer} aria-label="Ne plus afficher">
          ✕
        </button>
      </section>
    </div>
  );
}
