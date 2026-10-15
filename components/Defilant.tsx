"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Urgence } from "@/lib/urgences";

/**
 * The things still to do, one at a time: each one slides in slowly from the right, stops in the middle
 * (large, with its icon) for a few seconds, then leaves to the left and the next one comes in.
 * A tap opens the right page. A finger or the mouse on it holds it in place.
 */
export default function Defilant({ items }: { items: Urgence[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const texte = useRef<HTMLSpanElement>(null);
  const [ix, setIx] = useState(0);
  const [tour, setTour] = useState(0);

  // Its height is added to the fixed top so titles stay right under it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const maj = () => document.documentElement.style.setProperty("--urg-h", `${el.offsetHeight}px`);
    maj();
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    return () => { ro.disconnect(); document.documentElement.style.setProperty("--urg-h", "0px"); };
  }, []);

  // Never on two lines: the text gets smaller (down to 12 px) until it fits.
  useLayoutEffect(() => {
    const t = texte.current, z = zone.current;
    if (!t || !z) return;
    t.style.fontSize = "";
    let fs = parseFloat(getComputedStyle(t).fontSize) || 16;
    const place = z.clientWidth - 80;
    while (t.scrollWidth > place && fs > 12) { fs -= 0.5; t.style.fontSize = `${fs}px`; }
  }, [ix, tour]);

  if (!items.length) return null;
  const u = items[ix % items.length];
  const suivant = () => {
    if (items.length === 1) setTour((t) => t + 1);
    else setIx((i) => (i + 1) % items.length);
  };

  return (
    <div ref={ref} className="urg urg2" role="region" aria-label="À faire maintenant" aria-live="polite">
      <span className="urg-k">⚠ À faire{items.length > 1 ? <small>{(ix % items.length) + 1}/{items.length}</small> : null}</span>
      <div className="urg-v" ref={zone}>
        <Link key={`${ix}-${tour}`} href={u.href} className={`urg-a ${u.niveau}`} onAnimationEnd={(e) => { if (e.target === e.currentTarget) suivant(); }}>
          <span className="urg-ic" aria-hidden="true">{u.ic}</span>
          <span className="urg-txt">
            {u.detail ? <small className="urg-d">{u.detail}</small> : null}
            <span className="urg-t" ref={texte}>{u.quoi || u.txt}</span>
          </span>
          <span className="urg-go" aria-hidden="true">›</span>
          <span className="urg-temps" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
