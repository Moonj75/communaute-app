"use client";

import { useEffect, useRef, useState, type PointerEvent as PE } from "react";

/**
 * Arrows instead of scroll bars, on every device.
 * - Any framed list or table that scrolls by itself gets ▲ ▼ (up/down) and ◀ ▶ (sideways) on its edges.
 * - On a computer, the page itself gets ▲ ▼ at the bottom right.
 * A short tap moves a little; holding the arrow scrolls, faster and faster the longer it is held.
 */
type Sens = { x: number; y: number };

function useMaintien() {
  const raf = useRef(0);
  const debut = useRef(0);
  const arreter = () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = 0; };
  const demarrer = (cible: () => HTMLElement | Window, s: Sens, pas: () => number) => (e: PE<HTMLButtonElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    arreter();
    debut.current = performance.now();
    let v = 3; // px per frame, grows while held
    const boucle = () => {
      const t = performance.now() - debut.current;
      if (t > 220) {
        v = Math.min(70, v * 1.045 + 0.35);
        cible().scrollBy({ left: s.x * v, top: s.y * v });
      }
      raf.current = requestAnimationFrame(boucle);
    };
    raf.current = requestAnimationFrame(boucle);
    const fin = () => {
      const court = performance.now() - debut.current <= 220;
      arreter();
      if (court) cible().scrollBy({ left: s.x * pas(), top: s.y * pas(), behavior: "smooth" });
      window.removeEventListener("pointerup", fin);
      window.removeEventListener("pointercancel", fin);
    };
    window.addEventListener("pointerup", fin);
    window.addEventListener("pointercancel", fin);
  };
  useEffect(() => arreter, []);
  return demarrer;
}

type Cadre = { el: HTMLElement; r: { l: number; r: number; t: number; b: number }; g: boolean; d: boolean; h: boolean; bas: boolean };
const SEL = ".scroll-x, .scroller, .mx-box";

function FlechesCadres() {
  const [cadres, setCadres] = useState<Cadre[]>([]);
  const maintien = useMaintien();
  useEffect(() => {
    let raf = 0;
    const maj = () => {
      raf = 0;
      const dock = document.querySelector<HTMLElement>(".dock")?.getBoundingClientRect().top ?? window.innerHeight;
      const ent = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--entete-h")) || 90;
      const l: Cadre[] = [];
      document.querySelectorAll<HTMLElement>(SEL).forEach((el) => {
        if (el.offsetParent === null || el.parentElement?.closest(SEL)) return;
        const hx = el.scrollWidth > el.clientWidth + 2, hy = el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflowY !== "visible";
        if (!hx && !hy) return;
        const R = el.getBoundingClientRect();
        const t = Math.max(R.top, ent + 50), b = Math.min(R.bottom, dock - 6);
        if (b - t < 70) return;
        l.push({
          el, r: { l: R.left, r: R.right, t, b },
          g: hx && el.scrollLeft > 2, d: hx && el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
          h: hy && el.scrollTop > 2, bas: hy && el.scrollTop + el.clientHeight < el.scrollHeight - 2,
        });
      });
      setCadres(l);
    };
    const dem = () => { if (!raf) raf = requestAnimationFrame(maj); };
    maj();
    window.addEventListener("scroll", dem, { passive: true });
    window.addEventListener("resize", dem);
    document.addEventListener("scroll", dem, { capture: true, passive: true });
    const t = window.setInterval(maj, 900);
    return () => { window.removeEventListener("scroll", dem); window.removeEventListener("resize", dem); document.removeEventListener("scroll", dem, { capture: true }); clearInterval(t); };
  }, []);
  return (
    <>
      {cadres.map((c, i) => {
        const el = c.el;
        const mi = (c.r.t + c.r.b) / 2;
        const pasX = () => Math.round(el.clientWidth * 0.6), pasY = () => Math.round(el.clientHeight * 0.6);
        return (
          <div key={i} className="fl-groupe">
            {c.g ? <button type="button" className="fl-b fl-cote" style={{ left: c.r.l + 4, top: mi }} onPointerDown={maintien(() => el, { x: -1, y: 0 }, pasX)} aria-label="Vers la gauche">◀</button> : null}
            {c.d ? <button type="button" className="fl-b fl-cote" style={{ left: c.r.r - 4, top: mi, transform: "translate(-100%, -50%)" }} onPointerDown={maintien(() => el, { x: 1, y: 0 }, pasX)} aria-label="Vers la droite">▶</button> : null}
            {c.h ? <button type="button" className="fl-b fl-v" style={{ left: c.r.r - 8, top: c.r.t + 8 }} onPointerDown={maintien(() => el, { x: 0, y: -1 }, pasY)} aria-label="Remonter dans la liste">▲</button> : null}
            {c.bas ? <button type="button" className="fl-b fl-v" style={{ left: c.r.r - 8, top: c.r.b - 8, transform: "translate(-100%, -100%)" }} onPointerDown={maintien(() => el, { x: 0, y: 1 }, pasY)} aria-label="Descendre dans la liste">▼</button> : null}
          </div>
        );
      })}
    </>
  );
}

function FlechesPage() {
  const [actif, setActif] = useState(false);
  const [p, setP] = useState({ h: false, b: false });
  const maintien = useMaintien();
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (min-width: 761px)");
    const m = () => { setActif(mq.matches); document.documentElement.classList.toggle("fleches", mq.matches); };
    m();
    mq.addEventListener("change", m);
    const maj = () => setP({ h: window.scrollY > 8, b: window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 8 });
    maj();
    window.addEventListener("scroll", maj, { passive: true });
    const t = window.setInterval(maj, 1000);
    return () => { mq.removeEventListener("change", m); window.removeEventListener("scroll", maj); clearInterval(t); };
  }, []);
  if (!actif || (!p.h && !p.b)) return null;
  const pas = () => Math.round(window.innerHeight * 0.6);
  return (
    <div className="fl-page">
      <button type="button" className="fl-b" disabled={!p.h} onPointerDown={maintien(() => window, { x: 0, y: -1 }, pas)} aria-label="Remonter">▲</button>
      <button type="button" className="fl-b" disabled={!p.b} onPointerDown={maintien(() => window, { x: 0, y: 1 }, pas)} aria-label="Descendre">▼</button>
    </div>
  );
}

export default function Fleches() {
  return (
    <>
      <FlechesCadres />
      <FlechesPage />
    </>
  );
}
