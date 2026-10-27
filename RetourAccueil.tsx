"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** After this long in the background, the app comes back on the home screen. */
const DELAI = 5 * 60 * 1000;
const CLE = "lions-derniere-activite";
/** Pages never left automatically (a form being filled in, a notification just opened). */
const GARDER = ["/inscriptions/repondre", "/login", "/auth", "/installer", "/notif"];

const lire = () => { try { return Number(localStorage.getItem(CLE)) || 0; } catch { return 0; } };
const noter = () => { try { localStorage.setItem(CLE, String(Date.now())); } catch { /* storage unavailable */ } };

/**
 * When the app comes back after a long pause (phone asleep, app in the background or reopened),
 * it goes back to the home screen instead of the page left behind.
 */
export default function RetourAccueil() {
  const path = usePathname() || "/";
  const router = useRouter();

  useEffect(() => {
    const garder = () => path === "/" || GARDER.some((g) => path.startsWith(g));
    const retour = () => {
      const t = lire();
      if (t && Date.now() - t > DELAI && !garder()) router.replace("/");
      noter();
    };
    // Every opening of the app (it was closed, or the phone reloaded it): home screen first.
    // Only once per opening, so moving between pages afterwards is not affected.
    let ouverte = false;
    try { ouverte = sessionStorage.getItem("lions-ouverte") === "1"; sessionStorage.setItem("lions-ouverte", "1"); } catch { /* storage unavailable */ }
    // Installed app only: a link opened in the browser (shared page, mail) still lands where it points.
    const appli = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!ouverte && appli && !garder()) router.replace("/");
    noter();
    const vis = () => (document.visibilityState === "visible" ? retour() : noter());
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("pagehide", noter);
    window.addEventListener("pageshow", retour);
    const iv = window.setInterval(() => { if (document.visibilityState === "visible") noter(); }, 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("pagehide", noter);
      window.removeEventListener("pageshow", retour);
      clearInterval(iv);
    };
  }, [path, router]);
  return null;
}
