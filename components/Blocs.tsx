"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

export type BlocDef = {
  id: string;
  titre: string;
  ic: string;
  /** Small number or word shown on the thumbnail (e.g. « 3 »). */
  badge?: string | number | null;
  contenu: ReactNode;
  /** Lighter content for the miniature (long tables). Defaults to the content itself. */
  apercu?: ReactNode;
};

/**
 * Page layout: every block of the page appears as a miniature in a rail on the left
 * (a strip on top on phones). Clicking a miniature shows that block alone, full width.
 * « Tout afficher » shows every block one under the other.
 */
export default function Blocs({ blocs, initial }: { blocs: BlocDef[]; initial?: string | null }) {
  const valides = blocs.filter(Boolean);
  const premier = valides[0]?.id;
  const [actif, setActif] = useState<string>(initial && valides.some((b) => b.id === initial) ? initial : premier);
  const [tout, setTout] = useState(false);

  // The address keeps the open block (#bloc-…), so « back » and shared links work.
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

  const ouvrir = useCallback((id: string) => {
    setActif(id);
    setTout(false);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#bloc-${id}`);
    const scene = document.getElementById("scene");
    if (scene && scene.getBoundingClientRect().top < 0) scene.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const i = valides.findIndex((b) => b.id === actif);
  const suivant = (d: number) => {
    const n = valides[(i + d + valides.length) % valides.length];
    if (n) ouvrir(n.id);
  };

  if (valides.length <= 1) return <div className="scene solo">{valides[0]?.contenu}</div>;

  return (
    <div className={`blocs${tout ? " tout" : ""}`}>
      <nav className="rail" aria-label="Blocs de la page">
        <button type="button" className={`rail-tout${tout ? " on" : ""}`} onClick={() => setTout((t) => !t)} aria-pressed={tout}>
          {tout ? "◱ Un bloc à la fois" : "▦ Tout afficher"}
        </button>
        <ol>
          {valides.map((b, n) => (
            <li key={b.id}>
              <div
                role="button"
                tabIndex={0}
                className={`vig${!tout && b.id === actif ? " on" : ""}`}
                onClick={() => ouvrir(b.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    ouvrir(b.id);
                  }
                }}
                aria-current={!tout && b.id === actif ? "true" : undefined}
                aria-label={b.titre}
                title={b.titre}
              >
                <span className="vig-mini" aria-hidden="true">
                  <span className="vig-inner" inert>
                    {b.apercu ?? b.contenu}
                  </span>
                  <span className="vig-num">{String(n + 1).padStart(2, "0")}</span>
                  <span className="vig-hover">
                    <span aria-hidden="true">{b.ic}</span>
                    {b.titre}
                  </span>
                </span>
                <span className="vig-lbl">
                  <span className="vig-ic" aria-hidden="true">{b.ic}</span>
                  <span className="vig-t">{b.titre}</span>
                  {b.badge !== undefined && b.badge !== null && b.badge !== "" ? <span className="vig-badge">{b.badge}</span> : null}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </nav>

      <div className="scene" id="scene">
        {valides.map((b) => (
          <section key={b.id} className="scene-bloc" hidden={!tout && b.id !== actif} aria-label={b.titre}>
            <header className="scene-h">
              <h2>
                <span aria-hidden="true">{b.ic}</span> {b.titre}
              </h2>
              {!tout ? (
                <span className="scene-nav">
                  <button type="button" onClick={() => suivant(-1)} aria-label="Bloc précédent">
                    ‹
                  </button>
                  <span className="num">
                    {i + 1} / {valides.length}
                  </span>
                  <button type="button" onClick={() => suivant(1)} aria-label="Bloc suivant">
                    ›
                  </button>
                </span>
              ) : null}
            </header>
            <div className="scene-c">{b.contenu}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
