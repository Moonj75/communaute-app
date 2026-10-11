"use client";

import { useEffect } from "react";

/**
 * The app keeps the same size on phones: two-finger zoom is blocked (iPhone ignores the viewport
 * setting, so its gestures are stopped here); double-tap zoom is blocked by the CSS (touch-action). Scrolling and tapping still work.
 */
export default function BloquerZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const deuxDoigts = (e: TouchEvent) => { if (e.touches.length > 1 && !(e.target as HTMLElement)?.closest?.(".crop-frame")) e.preventDefault(); };
    document.addEventListener("gesturestart", stop, { passive: false } as AddEventListenerOptions);
    document.addEventListener("gesturechange", stop, { passive: false } as AddEventListenerOptions);
    document.addEventListener("touchmove", deuxDoigts, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("touchmove", deuxDoigts);
    };
  }, []);
  return null;
}
