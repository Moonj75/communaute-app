"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Nav = "chrome" | "samsung" | "firefox" | "android" | "ios" | "ios-autre" | "integre" | "ordi";

/**
 * « Télécharger l'application » banner, on every page until the app is installed or the banner is closed.
 * One big button. When the browser can install by itself (Chrome / Edge, Android or computer), it opens
 * the install window. Otherwise it opens a full-screen guide made for that browser, with an arrow pointing
 * at the button to press (menu ⋮ at the top for Chrome, menu ≡ at the bottom for Samsung, Share ⬆️ for iPhone).
 */
export default function Installer() {
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [nav, setNav] = useState<Nav | null>(null);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (standalone) return;
    try {
      if (localStorage.getItem("installer-ferme") === "1") return;
    } catch {}
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const android = /Android/.test(ua);
    const integre = /FBAN|FBAV|FB_IAB|Instagram|Messenger|WhatsApp|Line\/|Snapchat|GSA\/|; wv\)/.test(ua);
    if ((ios || android) && integre) setNav("integre");
    else if (ios) setNav(/CriOS|FxiOS|EdgiOS/.test(ua) ? "ios-autre" : "ios");
    else if (android) setNav(/SamsungBrowser/.test(ua) ? "samsung" : /Firefox/.test(ua) ? "firefox" : /Chrome/.test(ua) ? "chrome" : "android");
    else setNav("ordi");
    // The browser may offer the install before this banner is ready: the page keeps it for us (see layout).
    const prendre = () => { const e = (window as unknown as { __installEvt?: PromptEvent }).__installEvt; if (e) setEvt(e); };
    const h = (e: Event) => { e.preventDefault(); setEvt(e as PromptEvent); };
    const fait = () => { setNav(null); setGuide(false); };
    prendre();
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("install-pret", prendre);
    window.addEventListener("appinstalled", fait);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("install-pret", prendre); window.removeEventListener("appinstalled", fait); };
  }, []);

  // A computer without the install window: no banner (the app is meant for phones).
  if (!nav || (nav === "ordi" && !evt)) return null;

  const fermer = () => {
    setNav(null);
    try { localStorage.setItem("installer-ferme", "1"); } catch {}
  };
  const telecharger = async () => {
    if (!evt) { setGuide(true); return; }
    await evt.prompt();
    const r = await evt.userChoice;
    setEvt(null);
    (window as unknown as { __installEvt?: PromptEvent }).__installEvt = undefined;
    if (r.outcome === "accepted") setNav(null);
  };

  const etapes: Record<Nav, { fleche: "haut" | "bas" | "bas-d" | null; titre: string; pas: string[] }> = {
    chrome: { fleche: "haut", titre: "Avec Chrome", pas: ["Appuie sur les 3 points ⋮ en haut à droite de l'écran.", "Choisis « Installer l'application » (ou « Ajouter à l'écran d'accueil »).", "Appuie sur « Installer ». L'icône du lion arrive sur ton téléphone."] },
    samsung: { fleche: "bas-d", titre: "Avec Samsung Internet", pas: ["Appuie sur le menu ≡ en bas à droite de l'écran.", "Choisis « Ajouter la page à », puis « Écran d'accueil ».", "Appuie sur « Ajouter ». L'icône du lion arrive sur ton téléphone."] },
    firefox: { fleche: "haut", titre: "Avec Firefox", pas: ["Appuie sur les 3 points ⋮ en haut (ou en bas) à droite.", "Choisis « Installer » ou « Ajouter à l'écran d'accueil ».", "Confirme. L'icône du lion arrive sur ton téléphone."] },
    android: { fleche: "haut", titre: "Sur Android", pas: ["Appuie sur le menu ⋮ du navigateur (en haut à droite).", "Choisis « Installer l'application » ou « Ajouter à l'écran d'accueil ».", "Confirme. Si tu ne trouves pas, ouvre ce site dans Chrome."] },
    ios: { fleche: "bas", titre: "Sur iPhone (Safari)", pas: ["Appuie sur le bouton Partager ⬆️ en bas de l'écran.", "Fais défiler et choisis « Sur l'écran d'accueil ».", "Appuie sur « Ajouter » en haut à droite."] },
    "ios-autre": { fleche: "haut", titre: "Sur iPhone", pas: ["Appuie sur le bouton Partager ⬆️ (en haut à droite).", "Choisis « Sur l'écran d'accueil », puis « Ajouter ».", "Si tu ne le vois pas : ouvre ce site dans Safari et recommence."] },
    integre: { fleche: "haut", titre: "D'abord, ouvre le vrai navigateur", pas: ["Tu es dans l'appli Mail, WhatsApp ou Facebook : elle ne peut pas installer.", "Appuie sur ⋮ ou ⋯ en haut, puis « Ouvrir dans Chrome » (ou Safari).", "Dans le navigateur, appuie à nouveau sur « Télécharger »."] },
    ordi: { fleche: null, titre: "", pas: [] },
  };
  const g = etapes[nav];

  return (
    <div className="wrap install-wrap">
      <section className="install dl" role="button" tabIndex={0} onClick={telecharger} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && telecharger()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={40} height={40} />
        <div className="install-txt">
          <b>L&apos;appli Lions Eugies</b>
          <span className="small">Gratuite · sur ton écran d&apos;accueil</span>
        </div>
        <span className="install-go" aria-hidden="true">📲 Télécharger</span>
        <button type="button" className="install-x" onClick={(e) => { e.stopPropagation(); fermer(); }} aria-label="Ne plus afficher">✕</button>
      </section>

      {guide ? createPortal(
        <div className="dl-guide" role="dialog" aria-modal="true" aria-label="Installer l'appli" onClick={() => setGuide(false)}>
          {g.fleche ? <span className={`dl-fleche ${g.fleche}`} aria-hidden="true">{g.fleche === "haut" ? "⬆" : "⬇"}</span> : null}
          <div className="dl-carte" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="" width={64} height={64} />
            <h3>Installer l&apos;appli</h3>
            <p className="dl-sous">{g.titre} · 3 étapes</p>
            <ol>
              {g.pas.map((t, i) => <li key={i}>{t}</li>)}
            </ol>
            <button type="button" className="btn primary" onClick={() => setGuide(false)}>J&apos;ai compris</button>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
