"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Computer only (mouse): the scroll bars are hidden and replaced by arrows.
 * - the page: ▲ / ▼ at the bottom right, just above the footer;
 * - a table that scrolls by itself: ◀ ▲ ▼ ▶ in its bottom-right corner while the mouse is over it.
 * Each click moves by most of a screen (or of the table's frame). Mouse wheel and keyboard still work.
 */
type Etat = { haut: boolean; bas: boolean };
type Cadre = { el: HTMLElement; x: number; y: number; g: boolean; d: boolean; h: boolean; b: boolean };

const SEL = ".scroll-x, .scroller, .mx-box";

export default function Fleches() {
  const [actif, setActif] = useState(false);
  const [page, setPage] = useState<Etat>({ haut: false, bas: false });
  const [cadre, setCadre] = useState<Cadre | null>(null);
  const cible = useRef<HTMLElement | null>(null);
  const minuteur = useRef<number | null>(null);

  // Only with a mouse on a wide screen (phones keep their usual finger scrolling).
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (min-width: 761px)");
    const maj = () => {
      setActif(mq.matches);
      document.documentElement.classList.toggle("fleches", mq.matches);
    };
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, []);

  const placer = useCallback(() => {
    const d = document.documentElement;
    setPage({ haut: window.scrollY > 8, bas: window.scrollY + window.innerHeight < d.scrollHeight - 8 });
    const el = cible.current;
    if (!el || !el.isConnected) return setCadre(null);
    const r = el.getBoundingClientRect();
    const dock = document.querySelector<HTMLElement>(".dock")?.getBoundingClientRect().top ?? window.innerHeight;
    const bas = Math.min(r.bottom, dock) - 8;
    if (bas - r.top < 60) return setCadre(null);
    setCadre({
      el, x: Math.min(r.right, window.innerWidth) - 8, y: bas,
      g: el.scrollLeft > 2, d: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
      h: el.scrollTop > 2, b: el.scrollTop + el.clientHeight < el.scrollHeight - 2,
    });
  }, []);

  useEffect(() => {
    if (!actif) return;
    const survol = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest?.(".fl-cadre")) { if (minuteur.current) clearTimeout(minuteur.current); return; }
      const box = t.closest?.(SEL) as HTMLElement | null;
      const defile = box && (box.scrollWidth > box.clientWidth + 2 || box.scrollHeight > box.clientHeight + 2);
      if (defile) {
        if (minuteur.current) clearTimeout(minuteur.current);
        if (cible.current !== box) { cible.current = box; placer(); }
      } else if (cible.current) {
        if (minuteur.current) clearTimeout(minuteur.current);
        minuteur.current = window.setTimeout(() => { cible.current = null; setCadre(null); }, 500);
      }
    };
    const bouge = () => requestAnimationFrame(placer);
    document.addEventListener("mouseover", survol);
    window.addEventListener("scroll", bouge, { passive: true });
    window.addEventListener("resize", bouge);
    document.addEventListener("scroll", bouge, { capture: true, passive: true });
    placer();
    const t = window.setInterval(placer, 1200); // the page may grow (data, opened parts)
    return () => {
      document.removeEventListener("mouseover", survol);
      window.removeEventListener("scroll", bouge);
      window.removeEventListener("resize", bouge);
      document.removeEventListener("scroll", bouge, { capture: true });
      clearInterval(t);
    };
  }, [actif, placer]);

  if (!actif) return null;
  const pas = () => Math.round(window.innerHeight * 0.75);
  const dans = (dx: number, dy: number) => {
    const el = cadre?.el;
    if (!el) return;
    el.scrollBy({ left: dx * Math.round(el.clientWidth * 0.7), top: dy * Math.round(el.clientHeight * 0.75), behavior: "smooth" });
  };
  return (
    <>
      <div className="fl-page" aria-hidden={!page.haut && !page.bas}>
        <button type="button" className="fl-b" disabled={!page.haut} onClick={() => window.scrollBy({ top: -pas(), behavior: "smooth" })} aria-label="Remonter" title="Remonter">▲</button>
        <button type="button" className="fl-b" disabled={!page.bas} onClick={() => window.scrollBy({ top: pas(), behavior: "smooth" })} aria-label="Descendre" title="Descendre">▼</button>
      </div>
      {cadre && (cadre.g || cadre.d || cadre.h || cadre.b) ? (
        <div className="fl-cadre" style={{ left: cadre.x, top: cadre.y }}>
          {cadre.g || cadre.d ? <button type="button" className="fl-b" disabled={!cadre.g} onClick={() => dans(-1, 0)} aria-label="Vers la gauche">◀</button> : null}
          {cadre.h || cadre.b ? <button type="button" className="fl-b" disabled={!cadre.h} onClick={() => dans(0, -1)} aria-label="Vers le haut">▲</button> : null}
          {cadre.h || cadre.b ? <button type="button" className="fl-b" disabled={!cadre.b} onClick={() => dans(0, 1)} aria-label="Vers le bas">▼</button> : null}
          {cadre.g || cadre.d ? <button type="button" className="fl-b" disabled={!cadre.d} onClick={() => dans(1, 0)} aria-label="Vers la droite">▶</button> : null}
        </div>
      ) : null}
    </>
  );
}
