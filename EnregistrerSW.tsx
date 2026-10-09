"use client";

import { useEffect } from "react";

/** Registers the service worker (installable app + notifications). */
export default function EnregistrerSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
