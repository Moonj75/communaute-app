"use client";

import { useEffect } from "react";

/** The red number on the phone's app icon = unread mail in the app (cleared when everything is read). */
export default function PastilleAppli({ n }: { n: number }) {
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    try {
      if (n > 0) nav.setAppBadge?.(n)?.catch(() => {});
      else nav.clearAppBadge?.()?.catch(() => {});
    } catch {}
  }, [n]);
  return null;
}
