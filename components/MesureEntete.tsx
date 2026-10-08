"use client";

import { useEffect } from "react";

/** Keeps --entete-h equal to the real height of the fixed top banner (logo + menu), so the rest of the page sits right under it. */
export default function MesureEntete() {
  useEffect(() => {
    const el = document.getElementById("entete");
    if (!el) return;
    const maj = () => document.documentElement.style.setProperty("--entete-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    maj();
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return null;
}
