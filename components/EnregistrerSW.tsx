"use client";

import { useEffect } from "react";
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
async function renouveler(reg: ServiceWorkerRegistration) {
  if (!CLE || !("PushManager" in window) || !("Notification" in window) || Notification.permission !== "granted") return;
  let dernier = 0;
  try { dernier = Number(localStorage.getItem(DERNIER) || 0); } catch { return; }
  if (Date.now() - dernier < TOUS_LES) return;
  const vieux = await reg.pushManager.getSubscription();
  if (!vieux) return;
  const ancien = vieux.endpoint;
  await vieux.unsubscribe();
  const neuf = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(CLE) });
  const r = await abonner(neuf.toJSON(), appareil());
  if (!r.ok) return; // not logged in: tried again at the next opening
  if (ancien !== neuf.endpoint) await desabonner(ancien);
  try { localStorage.setItem(DERNIER, String(Date.now())); } catch { /* storage unavailable */ }
}

/** Registers the service worker (installable app + notifications). */
export default function EnregistrerSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((r) => r.update())
      .catch(() => {});
    // A few seconds after opening, so the app shows first.
    const t = window.setTimeout(() => {
      navigator.serviceWorker.ready.then(renouveler).catch(() => {});
    }, 4000);
    return () => clearTimeout(t);
  }, []);
  return null;
}
