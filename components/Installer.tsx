"use client";

import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** « Installer l'appli » banner: native prompt on Android/computer, instructions on iPhone. Hidden once installed. */
export default function Installer() {
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [masque, setMasque] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (standalone) return;
    let ferme = false;
    try {
      ferme = localStorage.getItem("installer-ferme") === "1";
    } catch {}
    if (ferme) return;
    const estIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
    setIos(estIos);
    if (estIos) setMasque(false);
    const h = (e: Event) => {
      e.preventDefault();
      setEvt(e as PromptEvent);
      setMasque(false);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  if (masque) return null;
  const fermer = () => {
    setMasque(true);
    try {
      localStorage.setItem("installer-ferme", "1");
    } catch {}
  };
  return (
    <section className="install">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={44} height={44} />
      <div className="install-txt">
        <b>Installe l&apos;appli Lions Eugies</b>
        <span className="small">
          {ios ? "Dans Safari : bouton Partager ⬆️ puis « Sur l'écran d'accueil »." : "Sur ton écran d'accueil, en un clic, comme une vraie appli."}
        </span>
      </div>
      {evt ? (
        <button
          type="button"
          className="btn primary"
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice;
            setEvt(null);
            setMasque(true);
          }}
        >
          📲 Installer
        </button>
      ) : null}
      <button type="button" className="install-x" onClick={fermer} aria-label="Masquer">
        ✕
      </button>
    </section>
  );
}
