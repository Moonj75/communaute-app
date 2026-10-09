"use client";

import { useEffect } from "react";

/**
 * Links that jump to a row of a table (« Aller à ma ligne », « Classement complet → »…):
 * the row is brought to the MIDDLE of the visible table — between the fixed headers at the top
 * and the dock at the bottom — then briefly lit up. Also done when a page opens with such an address.
 */
function centrer(el: HTMLElement, doux = true, flash = true) {
  const cs = getComputedStyle(document.documentElement);
  const px = (v: string) => parseFloat(cs.getPropertyValue(v)) || 0;
  // Lowest fixed thing above the content (title line, tab band, column headers).
  let haut = px("--entete-h") + px("--bande-h");
  const table = el.closest("table");
  const th = table?.querySelector("thead th");
  if (th) {
    // Where the column headers WILL sit once the page has scrolled (they are fixed under the bands).
    const st = getComputedStyle(th);
    const fixe = st.position === "sticky" ? parseFloat(st.top) : NaN;
    haut = Math.max(haut, Number.isFinite(fixe) ? fixe + (th as HTMLElement).offsetHeight : th.getBoundingClientRect().bottom);
  }
  document.querySelectorAll<HTMLElement>(".bande-fixe, .bl-titre").forEach((b) => {
    const t = parseFloat(getComputedStyle(b).top);
    if (b.offsetHeight && Number.isFinite(t)) haut = Math.max(haut, t + b.offsetHeight);
  });
  const dock = document.querySelector<HTMLElement>(".dock");
  const bas = dock ? dock.getBoundingClientRect().top : window.innerHeight;
  const r = el.getBoundingClientRect();
  const milieu = (haut + bas) / 2;
  window.scrollBy({ top: r.top + r.height / 2 - milieu, behavior: doux ? "smooth" : "auto" });
  if (!flash) return;
  el.classList.remove("ligne-flash");
  void el.offsetWidth;
  el.classList.add("ligne-flash");
}

export default function Centrer() {
  useEffect(() => {
    const cible = (hash: string) => {
      if (!hash || hash.startsWith("#bloc-")) return null;
      try {
        const el = document.querySelector<HTMLElement>(decodeURIComponent(hash));
        return el && (el.tagName === "TR" || el.dataset.centrer !== undefined) ? el : null;
      } catch {
        return null;
      }
    };
    const clic = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const url = new URL(a.href, window.location.href);
      if (url.pathname !== window.location.pathname || url.search !== window.location.search) return;
      const el = cible(url.hash);
      if (!el) return;
      e.preventDefault();
      history.replaceState(null, "", url.hash);
      centrer(el);
    };
    document.addEventListener("click", clic);
    // Arriving with « #ma-ligne » in the address: wait for the layout, then centre.
    // The browser first jumps to the row by itself (row at the top): put it back in the middle.
    const arriver = (flash: boolean) => {
      const el = cible(window.location.hash);
      if (el) centrer(el, false, flash);
    };
    const t1 = setTimeout(() => arriver(false), 250);
    const t2 = setTimeout(() => arriver(true), 900);
    return () => { document.removeEventListener("click", clic); clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return null;
}
