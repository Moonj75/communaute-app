"use client";

import { useEffect } from "react";

/** Keeps --entete-h equal to the real height of the fixed top banner (logo + menu), so the rest of the page sits right under it. */
export default function MesureEntete() {
  useEffect(() => {
    const el = document.getElementById("entete");
    if (!el) return;
    const maj = () => document.documentElement.style.setProperty("--entete-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    maj();
    // Pages laid out to the screen (home) are shown once the real heights are known: nothing jumps.
    let r2 = 0;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => document.documentElement.classList.add("mesure-ok")); });
    const secours = window.setTimeout(() => document.documentElement.classList.add("mesure-ok"), 600);
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(r1); cancelAnimationFrame(r2); clearTimeout(secours); };
  }, []);
  return null;
}
