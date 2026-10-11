"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Urgence } from "@/lib/urgences";

/** The urgent items scroll from right to left; a tap opens the right page. Hover pauses it. */
export default function Defilant({ items }: { items: Urgence[] }) {
  const ref = useRef<HTMLDivElement>(null);
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
  const duree = Math.max(18, items.reduce((n, i) => n + i.txt.length, 0) * 0.22);
  const liste = (cle: string) =>
    items.map((u, k) => (
      <Link key={cle + k} href={u.href} className={`urg-i ${u.niveau}`} tabIndex={cle === "b" ? -1 : 0}>
        <span aria-hidden="true">{u.ic}</span> {u.txt}
      </Link>
    ));
  return (
    <div ref={ref} className="urg" role="region" aria-label="À faire maintenant">
      <span className="urg-k">⚠ À faire</span>
      <div className="urg-v">
        <div className="urg-p" style={{ animationDuration: `${duree}s` }}>
          {liste("a")}
          <span aria-hidden="true" className="urg-copie">{liste("b")}</span>
        </div>
      </div>
    </div>
  );
}
