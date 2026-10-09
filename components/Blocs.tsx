"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Icone from "./Icone";

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
 * Page layout: the titles of every part of the page sit in a fixed block under the top banner.
 * Clicking a title shows that part alone. Once the page is scrolled, the block compacts into a single
 * line « Page › Part » so you always know where you are; « Changer » unfolds the titles again.
 */
export default function Blocs({ blocs, initial, page }: { blocs: BlocDef[]; initial?: string | null; page?: string }) {
  const valides = blocs.filter(Boolean);
  const premier = valides[0]?.id;
  const [actif, setActif] = useState<string>(initial && valides.some((b) => b.id === initial) ? initial : premier);
  const [tout, setTout] = useState(false);
  const [colle, setColle] = useState(false);
  const [deplie, setDeplie] = useState(false);
  const [titrePage, setTitrePage] = useState(page || "");
  const repere = useRef<HTMLDivElement>(null);
  const bande = useRef<HTMLDivElement>(null);

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

  // Page name for the compact line: given, or read from the page heading.
  useEffect(() => {
    if (page) return;
    const h = document.querySelector(".hello h2")?.textContent?.trim();
    if (h) setTitrePage(h);
  }, [page]);

  // Compact once the block reaches the top banner (with a small margin so it does not flicker).
  useEffect(() => {
    let raf = 0;
    const verifier = () => {
      raf = 0;
      if (!repere.current) return;
      const haut = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--entete-h")) || 100;
      const y = repere.current.getBoundingClientRect().top;
      setColle((c) => (c ? y < haut + 40 : y < haut));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(verifier);
    };
    verifier();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  useEffect(() => {
    if (!colle) setDeplie(false);
  }, [colle]);

  // Height of the block, for the table headers that stay fixed under it.
  useEffect(() => {
    const el = bande.current;
    if (!el) return;
    const maj = () => document.documentElement.style.setProperty("--bande-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    maj();
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ouvrir = useCallback((id: string) => {
    setActif(id);
    setTout(false);
    setDeplie(false);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#bloc-${id}`);
    // Bring the part to the top of the screen, right under the fixed block.
    requestAnimationFrame(() => {
      const scene = document.getElementById("scene");
      const b = bande.current;
      if (!scene || !b) return;
      const haut = b.getBoundingClientRect().bottom;
      const y = scene.getBoundingClientRect().top;
      if (y < haut || y > window.innerHeight * 0.6) window.scrollBy({ top: y - haut - 10, behavior: "smooth" });
    });
  }, []);

  if (valides.length <= 1) return <div className="scene solo">{valides[0]?.contenu}</div>;
  const courant = valides.find((b) => b.id === actif) || valides[0];

  return (
    <div className={`blocs${tout ? " tout" : ""}`}>
      <div ref={repere} aria-hidden="true" />
      <div ref={bande} className={`onglets-bande${colle ? " colle" : ""}${deplie ? " deplie" : ""}`}>
        <div className="fil" aria-hidden={!colle}>
          <span className="fil-page">{titrePage}</span>
          <span className="fil-sep" aria-hidden="true">›</span>
          <span className="fil-sec">
            <span aria-hidden="true">{tout ? "▦" : courant.ic}</span> {tout ? "Tout" : courant.titre}
            {!tout && courant.badge ? <span className="onglet-b">{courant.badge}</span> : null}
          </span>
          <button type="button" className="fil-btn" onClick={() => setDeplie((d) => !d)} aria-expanded={deplie} tabIndex={colle ? 0 : -1}>
            {deplie ? "Fermer" : "Changer"}
            <span className={`fil-chev${deplie ? " haut" : ""}`}>
              <Icone n="chevron" taille={16} />
            </span>
          </button>
        </div>
        <nav className="onglets" id="onglets" aria-label="Parties de la page">
          {valides.map((b) => (
            <button
              key={b.id}
              type="button"
              data-bloc={b.id}
              className={`onglet${!tout && b.id === actif ? " on" : ""}`}
              aria-current={!tout && b.id === actif ? "true" : undefined}
              onClick={() => ouvrir(b.id)}
            >
              <span className="onglet-ic" aria-hidden="true">{b.ic}</span>
              <span className="onglet-t">{b.titre}</span>
              {b.badge !== undefined && b.badge !== null && b.badge !== "" ? <span className="onglet-b">{b.badge}</span> : null}
            </button>
          ))}
          <button
            type="button"
            className={`onglet onglet-tout${tout ? " on" : ""}`}
            onClick={() => {
              setTout((t) => !t);
              setDeplie(false);
            }}
            aria-pressed={tout}
          >
            <span className="onglet-ic" aria-hidden="true">{tout ? "◱" : "▦"}</span>
            <span className="onglet-t">{tout ? "Un à la fois" : "Tout"}</span>
          </button>
        </nav>
      </div>

      <div className="scene" id="scene">
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
