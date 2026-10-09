"use client";

import { useEffect } from "react";

/** Scrolls the element with data-focus="1" to the middle of its scroll container (without moving the page). */
export default function Centrer({ cle }: { cle?: string | null }) {
  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-focus='1']").forEach((el) => {
      const box = el.closest<HTMLElement>(".scroller");
      if (!box) return;
      const r = el.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      const top = box.scrollTop + (r.top - b.top) - box.clientHeight / 2 + r.height / 2;
      box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  }, [cle]);
  return null;
}
