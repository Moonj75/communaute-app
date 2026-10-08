"use client";

import { useEffect, useState, useTransition } from "react";
import { abonner, desabonner, mEnvoyerUnTest } from "@/app/notifs/actions";

const CLE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function versOctets(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type Etat = "chargement" | "indispo" | "ios" | "refuse" | "off" | "on" | "nonconfig";

function appareil() {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Autre";
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return `${os}${nav ? " · " + nav : ""}`;
}

/** « Activer les notifications » switch for the current device. */
export default function Notifs() {
  const [etat, setEtat] = useState<Etat>("chargement");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      if (!CLE) return setEtat("nonconfig");
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setEtat(ios && !standalone ? "ios" : "indispo");
      if (Notification.permission === "denied") return setEtat("refuse");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setEtat(sub ? "on" : "off");
    })().catch(() => setEtat("indispo"));
  }, []);

  const activer = () =>
    start(async () => {
      setMsg(null);
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return setEtat(perm === "denied" ? "refuse" : "off");
        const reg = await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(CLE) }));
        const r = await abonner(sub.toJSON(), appareil());
        if (!r.ok) {
          await sub.unsubscribe();
          setMsg(r.message || "Erreur");
          return;
        }
        setEtat("on");
        const t = await mEnvoyerUnTest();
        setMsg(t.ok ? "C'est activé ! Une notification de test vient d'être envoyée." : t.message || null);
      } catch {
        setMsg("L'activation n'a pas fonctionné sur cet appareil.");
      }
    });

  const couper = () =>
    start(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await desabonner(sub.endpoint);
        await sub.unsubscribe();
      }
      setEtat("off");
      setMsg("Notifications coupées sur cet appareil.");
    });

  if (etat === "chargement") return <p className="vide">Chargement…</p>;
  if (etat === "nonconfig") return <p className="vide">🔔 Les notifications seront bientôt activées par le club. Tu pourras les allumer ici.</p>;
  return (
    <section className={`panel notif-box${etat === "on" ? " on" : ""}`}>
      <div className="bd">
        <div className="notif-row">
          <span className="notif-ic" aria-hidden="true">{etat === "on" ? "🔔" : "🔕"}</span>
          <div className="notif-txt">
            <b>{etat === "on" ? "Notifications activées sur cet appareil" : "Notifications du club"}</b>
            <span className="muted small">
              {etat === "ios"
                ? "Sur iPhone : installe d'abord l'appli (Safari → Partager → « Sur l'écran d'accueil »), puis ouvre-la depuis l'icône et reviens ici."
                : etat === "refuse"
                  ? "Les notifications sont bloquées pour ce site : autorise-les dans les réglages du navigateur, puis recharge la page."
                  : etat === "indispo"
                    ? "Ce navigateur ne gère pas les notifications. Essaie avec Chrome, Edge ou l'appli installée."
                    : "Ouverture des inscriptions, rappels avant la date limite, veille de compétition."}
            </span>
          </div>
          {etat === "off" ? (
            <button type="button" className="btn primary" onClick={activer} disabled={pending}>
              {pending ? "…" : "🔔 Activer"}
            </button>
          ) : etat === "on" ? (
            <button type="button" className="btn" onClick={couper} disabled={pending}>
              Couper
            </button>
          ) : null}
        </div>
        {msg ? <p className="small notif-msg">{msg}</p> : null}
      </div>
    </section>
  );
}
