"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type Tuile = {
  id: string;
  /** Colour of this ranking. */
  k: string;
  /** « Ma place » / « Le club ». */
  quoi: string;
  /** Name of the ranking, written big (e.g. « Classement national »). */
  titre: string;
  /** Small logo before the name (flag, FISTF…). */
  ic: ReactNode;
  /** The place (null = not ranked). */
  n: number | null;
  s: string;
  href: string;
};

const DUREE = 2800;

/** The place, shown at once (it grows in with the frame): « 1er », « 12ème ». */
function Place({ n }: { n: number | null }) {
  if (!n) return <b className="dfl-v vide">—</b>;
  // « 1er », « 281ème »: the ending small and a little apart.
  return <b className="dfl-v num">{n}<sup>{n === 1 ? "er" : "ème"}</sup></b>;
}

/**
 * One frame on the home page: the rankings one after the other. The name of the ranking is written big,
 * the place grows in; a bar shows when the next one comes. Swipe or dots to choose; touching pauses.
 */
export default function Defile({ tuiles }: { tuiles: Tuile[] }) {
  const [i, setI] = useState(0);
  const [pause, setPause] = useState(false);
  const [tour, setTour] = useState(0);
  const x0 = useRef<number | null>(null);
  const n = tuiles.length;
  useEffect(() => {
    if (pause || n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => { setI((v) => (v + 1) % n); setTour((x) => x + 1); }, DUREE);
    return () => clearTimeout(t);
  }, [pause, n, i, tour]);
  if (!n) return null;
  const choisir = (k: number) => { setI(((k % n) + n) % n); setTour((x) => x + 1); };
  const t = tuiles[i];
  const podium = t.n && t.n <= 3 ? ["🥇", "🥈", "🥉"][t.n - 1] : null;

  return (
    <div
      className={`dfl${pause ? " pause" : ""}`}
      style={{ "--k": t.k } as React.CSSProperties}
      aria-roledescription="carrousel"
      aria-label="Classements"
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
      onTouchStart={(e) => { setPause(true); x0.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const d = x0.current === null ? 0 : e.changedTouches[0].clientX - x0.current;
        if (Math.abs(d) > 40) choisir(i + (d < 0 ? 1 : -1));
        x0.current = null;
        window.setTimeout(() => setPause(false), 5000);
      }}
    >
      <Link key={`${t.id}-${tour}`} href={t.href} className="dfl-cadre">
        <span className="dfl-halo" aria-hidden="true" />
        <span className="dfl-tete">
          <span className="dfl-q">{t.quoi}</span>
          <span className="dfl-titre">{t.ic}<span>{t.titre}</span></span>
        </span>
        <span className="dfl-coeur">
          {podium ? <span className="dfl-med" aria-hidden="true">{podium}</span> : null}
          <Place n={t.n} />
        </span>
        <span className="dfl-s">{t.s}</span>
        <span className="dfl-barre" aria-hidden="true"><i style={{ animationDuration: `${DUREE}ms` }} /></span>
      </Link>
      <div className="dfl-pts" role="tablist" aria-label="Choisir un classement">
        {tuiles.map((x, k) => (
          <button key={x.id} type="button" role="tab" aria-selected={k === i} aria-label={x.titre} title={x.titre} className={k === i ? "on" : undefined} style={{ "--k": x.k } as React.CSSProperties} onClick={() => choisir(k)} />
        ))}
      </div>
    </div>
  );
}
