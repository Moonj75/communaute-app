"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type BlocDef = {
  id: string;
  titre: string;
  ic: string;
  /** Small number or word shown next to the title (e.g. « 3 »). */
  badge?: string | number | null;
  contenu: ReactNode;
  /** Kept for compatibility (miniatures no longer exist). */
  apercu?: ReactNode;
};

/**
 * Page layout: a thin side rail (titles written vertically) lists every part of the page.
 * Clicking a title shows that part alone, next to the rail; the rail stays in place while scrolling.
 */
export default function Blocs({ blocs, initial }: { blocs: BlocDef[]; initial?: string | null; page?: string }) {
  const valides = blocs.filter(Boolean);
  const premier = valides[0]?.id;
  const [actif, setActif] = useState<string>(initial && valides.some((b) => b.id === initial) ? initial : premier);
  const [tout, setTout] = useState(false);
  const scene = useRef<HTMLDivElement>(null);

  // The address keeps the open part (#bloc-…), so « back » and shared links work.
  useEffect(() => {
    const lire = () => {
      const h = decodeURIComponent(window.location.hash.replace(/^#bloc-/, ""));
      if (h && valides.some((b) => b.id === h)) {
        setActif(h);
        setTout(false);
      }
    };
    if (!initial) lire();
    window.addEventListener("hashchange", lire);
    return () => window.removeEventListener("hashchange", lire);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initial && valides.some((b) => b.id === initial)) setActif(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // No band on top any more: fixed table headers sit right under the top banner.
  useEffect(() => {
    document.documentElement.style.setProperty("--bande-h", "0px");
  }, []);

  const ouvrir = useCallback((id: string) => {
    setActif(id);
    setTout(false);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#bloc-${id}`);
    // If the part starts above the screen, bring its top under the top banner.
    requestAnimationFrame(() => {
      const el = scene.current;
      if (!el) return;
      const haut = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--entete-h")) || 100;
      const y = el.getBoundingClientRect().top;
      if (y < haut) window.scrollBy({ top: y - haut - 10, behavior: "smooth" });
    });
  }, []);

  if (valides.length <= 1) return <div className="scene solo">{valides[0]?.contenu}</div>;

  return (
    <div className={`blocs volet-ok${tout ? " tout" : ""}`}>
      <nav className="volet" id="onglets" aria-label="Parties de la page">
        {valides.map((b) => {
          const on = !tout && b.id === actif;
          const badge = b.badge !== undefined && b.badge !== null && b.badge !== "" ? b.badge : null;
          return (
            <button
              key={b.id}
              type="button"
              data-bloc={b.id}
              title={b.titre}
              className={`vl-i${on ? " on" : ""}`}
              aria-current={on ? "true" : undefined}
              onClick={() => ouvrir(b.id)}
            >
              <span className="vl-ic" aria-hidden="true">{b.ic}</span>
              <span className="vl-t">{b.titre}</span>
              {badge ? <span className="vl-b">{badge}</span> : null}
            </button>
          );
        })}
        <button type="button" className={`vl-i vl-tout${tout ? " on" : ""}`} onClick={() => setTout((t) => !t)} aria-pressed={tout} title={tout ? "Un à la fois" : "Tout afficher"}>
          <span className="vl-ic" aria-hidden="true">{tout ? "◱" : "▦"}</span>
          <span className="vl-t">{tout ? "Un à la fois" : "Tout"}</span>
        </button>
      </nav>

      <div className="scene" id="scene" ref={scene}>
        {valides.map((b) => (
          <section key={b.id} className="scene-bloc" hidden={!tout && b.id !== actif} aria-label={b.titre}>
            {tout ? (
              <header className="scene-h">
                <h2>
                  <span aria-hidden="true">{b.ic}</span> {b.titre}
                </h2>
              </header>
            ) : null}
            <div className="scene-c">{b.contenu}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
