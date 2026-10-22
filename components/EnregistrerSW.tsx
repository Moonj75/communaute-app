"use client";

import { useEffect, useState } from "react";
import { abonner, desabonner } from "@/app/notifs/actions";

const CLE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const DERNIER = "push-renouvele";
/** Every 3 days the device's notification registration is renewed (off then on again). */
const TOUS_LES = 3 * 864e5;

function versOctets(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
function appareil() {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Autre";
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return `${os}${nav ? " · " + nav : ""}`;
}

/**
 * A phone's registration can get stale without anyone noticing (notifications accepted by the server
 * but never shown). When the member opens the app, a device that has notifications on is quietly
 * switched off and on again, at most every 3 days. A device whose member switched them off is left alone.
 */
async function renouveler(reg: ServiceWorkerRegistration, dire: (t: string) => void) {
  // « ?renouveler » in the address forces it at once and says what happened (to check that it works).
  const force = new URLSearchParams(location.search).has("renouveler");
  const info = (t: string) => { if (force) dire(t); };
  if (!CLE) return info("🔔 Notifications pas configurées (clé manquante).");
  if (!("PushManager" in window) || !("Notification" in window)) return info("🔔 Ce navigateur ne gère pas les notifications.");
  if (Notification.permission !== "granted") return info(`🔔 Notifications non autorisées sur ce navigateur (${Notification.permission}).`);
  let dernier = 0;
  try { dernier = Number(localStorage.getItem(DERNIER) || 0); } catch { /* storage unavailable */ }
  if (!force && Date.now() - dernier < TOUS_LES) return;
  const vieux = await reg.pushManager.getSubscription();
  if (!vieux) return info("🔔 Notifications coupées sur cet appareil : rien à renouveler. Active-les dans Ma fiche.");
  const ancien = vieux.endpoint;
  await vieux.unsubscribe();
  const neuf = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(CLE) });
  const r = await abonner(neuf.toJSON(), appareil());
  if (!r.ok) return info(`🔔 Réinscription refusée : ${r.message || "erreur"}`); // not logged in: tried again at the next opening
  if (ancien !== neuf.endpoint) await desabonner(ancien);
  try { localStorage.setItem(DERNIER, String(Date.now())); } catch { /* storage unavailable */ }
  info(`✅ Notifications réinscrites sur cet appareil (${appareil()}).`);
}

/** Registers the service worker (installable app + notifications). */
export default function EnregistrerSW() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((r) => r.update())
      .catch(() => {});
    // A few seconds after opening, so the app shows first.
    const t = window.setTimeout(() => {
      navigator.serviceWorker.ready
        .then((reg) => renouveler(reg, setMsg))
        .catch((e) => { if (new URLSearchParams(location.search).has("renouveler")) setMsg(`🔔 Échec : ${e instanceof Error ? e.message : e}`); });
    }, 4000);
    return () => clearTimeout(t);
  }, []);
  if (!msg) return null;
  return (
    <button type="button" onClick={() => setMsg(null)} style={{ position: "fixed", left: "50%", bottom: 90, transform: "translateX(-50%)", zIndex: 9999, maxWidth: "calc(100vw - 32px)", padding: "12px 16px", borderRadius: 14, border: "1px solid #c9a227", background: "#161311", color: "#f7dd6b", font: "600 14px/1.3 Barlow, system-ui, sans-serif", boxShadow: "0 10px 24px -8px rgba(0,0,0,.5)", cursor: "pointer" }}>
      {msg}
    </button>
  );
}
