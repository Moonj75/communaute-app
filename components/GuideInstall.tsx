"use client";

import { useEffect, useState } from "react";
import "./installer.css";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Cas = "installee" | "integre-android" | "integre-ios" | "chrome" | "samsung" | "android-autre" | "ios" | "ios-autre" | "ordi";

/** Which phone / browser is reading the page, and what it can do. */
function detecter(): Cas {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
  if (standalone) return "installee";
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  // Browsers built into other apps (Facebook, Messenger, Instagram, WhatsApp, Gmail, Snapchat…) cannot install.
  const integre = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|WhatsApp|Line\/|Snapchat|GSA\/|TikTok|musical_ly|LinkedInApp|Twitter|; wv\)/.test(ua);
  if (android && integre) return "integre-android";
  if (ios && integre) return "integre-ios";
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? "ios-autre" : "ios";
  if (android) return /SamsungBrowser/.test(ua) ? "samsung" : /Chrome/.test(ua) && !/Firefox|OPR|UCBrowser|MiuiBrowser|HuaweiBrowser|HeyTap|VivoBrowser/.test(ua) ? "chrome" : "android-autre";
  return "ordi";
}

/**
 * Page « Installer l'appli » (public, no account needed): one link to send to everybody.
 * It recognises the phone and the browser and shows ONLY what to do there; from inside Facebook, Messenger,
 * WhatsApp… (which can never install) a button jumps straight into Chrome (Android) or Safari (iPhone).
 */
export default function GuideInstall() {
  const [cas, setCas] = useState<Cas | null>(null);
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [copie, setCopie] = useState(false);
  const [lien, setLien] = useState("https://lions-eugies.vercel.app/installer");

  useEffect(() => {
    setCas(detecter());
    setLien(`${window.location.origin}/installer`);
    const prendre = () => { const e = (window as unknown as { __installEvt?: PromptEvent }).__installEvt; if (e) setEvt(e); };
    const h = (e: Event) => { e.preventDefault(); setEvt(e as PromptEvent); };
    const fait = () => setCas("installee");
    prendre();
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("install-pret", prendre);
    window.addEventListener("appinstalled", fait);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("install-pret", prendre); window.removeEventListener("appinstalled", fait); };
  }, []);

  const installer = async () => {
    if (!evt) return;
    await evt.prompt();
    const r = await evt.userChoice;
    setEvt(null);
    (window as unknown as { __installEvt?: PromptEvent }).__installEvt = undefined;
    if (r.outcome === "accepted") setCas("installee");
  };
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien);
    } catch {
      const t = document.createElement("textarea");
      t.value = lien;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand("copy"); } catch { /* nothing more to try */ }
      t.remove();
    }
    setCopie(true);
    window.setTimeout(() => setCopie(false), 2500);
  };

  if (!cas) return <div className="gi" aria-busy="true" />;
  const hote = lien.replace(/^https?:\/\//, "");
  const versChrome = `intent://${hote}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(lien)};end`;
  const versSafari = `x-safari-${lien}`;
  const boutonCopier = (
    <button type="button" className="gi-copier" onClick={copier}>{copie ? "✅ Lien copié" : "📋 Copier le lien"}</button>
  );

  let titre = "";
  let action: React.ReactNode = null;
  let pas: React.ReactNode[] = [];
  let note: React.ReactNode = null;

  switch (cas) {
    case "installee":
      titre = "L'appli est installée ✅";
      pas = [<>Ferme cette page.</>, <>Sur l&apos;écran d&apos;accueil de ton téléphone, touche l&apos;icône du <b>lion</b>.</>, <>Connecte-toi avec ton e-mail (voir plus bas).</>];
      break;
    case "integre-android":
      titre = "Ouvre d'abord la page dans Chrome";
      action = <a className="gi-go" href={versChrome}>🌐 Ouvrir dans Chrome</a>;
      pas = [<>Tu es dans Messenger, Facebook, WhatsApp, Gmail… Ces applis ne peuvent pas installer.</>, <>Touche le bouton doré ci-dessus : la page s&apos;ouvre dans Chrome.</>, <>Dans Chrome, cette page te montre le bouton <b>Installer</b>.</>];
      note = <>Rien ne se passe ? Touche les <b>3 points ⋮</b> en haut à droite, puis <b>« Ouvrir dans Chrome »</b> (ou « Ouvrir dans le navigateur »).</>;
      break;
    case "integre-ios":
      titre = "Ouvre d'abord la page dans Safari";
      action = <a className="gi-go" href={versSafari}>🧭 Ouvrir dans Safari</a>;
      pas = [<>Tu es dans Messenger, Facebook, Instagram, Gmail… Ces applis ne peuvent pas installer.</>, <>Touche le bouton doré ci-dessus : la page s&apos;ouvre dans <b>Safari</b>.</>, <>Dans Safari, suis les 3 étapes de cette page.</>];
      note = <>Rien ne se passe ? Touche <b>⋯</b> (ou la boussole 🧭) en haut ou en bas à droite, puis <b>« Ouvrir dans Safari »</b>. Ou copie le lien et colle-le dans Safari : {boutonCopier}</>;
      break;
    case "chrome":
      titre = "Installer avec Chrome";
      action = evt ? <button type="button" className="gi-go" onClick={installer}>📲 Installer l&apos;appli</button> : null;
      pas = evt
        ? [<>Touche le bouton doré <b>Installer l&apos;appli</b>.</>, <>Dans la fenêtre qui s&apos;ouvre, touche <b>Installer</b>.</>, <>L&apos;icône du lion arrive sur ton écran d&apos;accueil.</>]
        : [<>Touche les <b>3 points ⋮</b> en haut à droite de Chrome.</>, <>Choisis <b>« Installer l&apos;application »</b> ou <b>« Ajouter à l&apos;écran d&apos;accueil »</b>.</>, <>Touche <b>Installer</b>. L&apos;icône du lion arrive sur ton écran d&apos;accueil.</>];
      break;
    case "samsung":
      titre = "Installer avec Samsung Internet";
      action = evt ? <button type="button" className="gi-go" onClick={installer}>📲 Installer l&apos;appli</button> : null;
      pas = [<>Touche le menu <b>≡</b> en bas à droite.</>, <>Choisis <b>« Ajouter la page à »</b>, puis <b>« Écran d&apos;accueil »</b>.</>, <>Touche <b>Ajouter</b>. L&apos;icône du lion arrive sur ton écran d&apos;accueil.</>];
      note = <>Ça ne marche pas ? <a href={versChrome}>Ouvre la page dans Chrome</a> : c&apos;est le plus simple.</>;
      break;
    case "android-autre":
      titre = "Le plus simple : passer par Chrome";
      action = <a className="gi-go" href={versChrome}>🌐 Ouvrir dans Chrome</a>;
      pas = [<>Touche le bouton doré : la page s&apos;ouvre dans Chrome.</>, <>Dans Chrome, touche <b>Installer l&apos;appli</b> (ou ⋮ puis « Installer l&apos;application »).</>, <>L&apos;icône du lion arrive sur ton écran d&apos;accueil.</>];
      note = <>Tu préfères rester ici ? Cherche dans le menu de ton navigateur « Installer » ou « Ajouter à l&apos;écran d&apos;accueil ».</>;
      break;
    case "ios":
      titre = "Installer sur iPhone";
      pas = [<>Touche le bouton <b>Partager</b> <span className="gi-ic">⬆️</span> en bas de l&apos;écran (sur iPad : en haut).</>, <>Fais défiler vers le bas et choisis <b>« Sur l&apos;écran d&apos;accueil »</b> <span className="gi-ic">➕</span>.</>, <>Touche <b>Ajouter</b> en haut à droite. L&apos;icône du lion arrive sur ton écran d&apos;accueil.</>];
      note = <>Tu ne vois pas « Sur l&apos;écran d&apos;accueil » ? Tout en bas de la liste, touche <b>« Modifier les actions »</b> et ajoute-le.</>;
      break;
    case "ios-autre":
      titre = "Installer sur iPhone";
      action = <a className="gi-go" href={versSafari}>🧭 Ouvrir dans Safari</a>;
      pas = [<>Le plus sûr : touche le bouton doré pour passer dans <b>Safari</b>.</>, <>Dans Safari, touche <b>Partager</b> <span className="gi-ic">⬆️</span>, puis <b>« Sur l&apos;écran d&apos;accueil »</b>.</>, <>Touche <b>Ajouter</b>. L&apos;icône du lion arrive sur ton écran d&apos;accueil.</>];
      note = <>Avec Chrome sur iPhone, ça marche aussi : bouton <b>Partager</b> ⬆️ en haut à droite, puis « Ajouter à l&apos;écran d&apos;accueil ».</>;
      break;
    case "ordi":
      titre = "Installer l'appli sur ton téléphone";
      action = evt ? <button type="button" className="gi-go gi-sec" onClick={installer}>💻 L&apos;installer aussi sur cet ordinateur</button> : null;
      pas = [<>Ouvre l&apos;appareil photo de ton téléphone.</>, <>Vise le carré ci-dessous et touche le lien qui apparaît.</>, <>La page s&apos;ouvre sur ton téléphone avec les étapes pour lui.</>];
      break;
  }

  return (
    <div className="gi">
      <section className="gi-carte">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="gi-logo" src="/icon-192.png" alt="" width={72} height={72} />
        <p className="gi-k">L&apos;appli des Lions · gratuite</p>
        <h2 className="gi-t">{titre}</h2>
        {action}
        <ol className="gi-pas">
          {pas.map((p, i) => <li key={i}><span className="gi-n">{i + 1}</span><span>{p}</span></li>)}
        </ol>
        {note ? <p className="gi-note">{note}</p> : null}
        {cas === "ordi" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="gi-qr" src="/qr-installer.svg" alt={`QR code vers ${hote}`} width={180} height={180} />
        ) : null}
      </section>

      <section className="gi-carte gi-apres">
        <h3>Ensuite, pour te connecter</h3>
        <ol className="gi-pas">
          <li><span className="gi-n">1</span><span>Ouvre l&apos;appli avec l&apos;icône du <b>lion</b> (pas depuis le navigateur).</span></li>
          <li><span className="gi-n">2</span><span>Entre l&apos;e-mail que tu as donné au club.</span></li>
          <li><span className="gi-n">3</span><span>Tu reçois un mail avec un <b>code à 6 chiffres</b> : tape-le dans l&apos;appli. N&apos;ouvre pas le lien du mail, il ouvrirait le navigateur au lieu de l&apos;appli.</span></li>
        </ol>
      </section>

      <section className="gi-partage">
        <span>Pour l&apos;envoyer à un autre membre :</span>
        <b>{hote}</b>
        {boutonCopier}
      </section>
    </div>
  );
}
