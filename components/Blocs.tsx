"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";

export type BlocDef = {
  id: string;
  titre: string;
  ic: string;
  /** Small number or word shown next to the title (e.g. « 3 »). */
  badge?: string | number | null;
  contenu: ReactNode;
  /** Opens another page instead of showing a part here (e.g. « Classements » → the rankings page). */
  href?: string;
  /** Short word under the icon while the side rail is folded (e.g. « U20 »), when icons look alike. */
  court?: string;
  /** Marks a link entry as the current page (rail of the Classements page). */
  actuel?: boolean;
  /** Kept for compatibility (miniatures no longer exist). */
  apercu?: ReactNode;
};

/**
 * Page layout: a thin side rail (titles written vertically) lists every part of the page.
 * Clicking a title shows that part alone, next to the rail; the rail stays in place while scrolling.
 */
export default function Blocs({ blocs, initial, page, actions }: { blocs: BlocDef[]; initial?: string | null; page?: string; /** Buttons at the right of the fixed title line (e.g. refresh from Notion). */ actions?: ReactNode }) {
  const tous = blocs.filter(Boolean);
  const valides = tous.filter((b) => !b.href);
  const premier = valides[0]?.id;
  const [actif, setActif] = useState<string>(initial && valides.some((b) => b.id === initial) ? initial : premier);
  const [tout, setTout] = useState(false);
  const scene = useRef<HTMLDivElement>(null);
  const barre = useRef<HTMLDivElement>(null);
  const [titrePage, setTitrePage] = useState(page || "");
  const [titreHtml, setTitreHtml] = useState<string | null>(null);
  const place = useRef<HTMLDivElement>(null);
  const volet = useRef<HTMLElement>(null);
  // The side rail is folded (icons only); a tap on « ☰ » unfolds it with the titles written across.
  const [deplie, setDeplie] = useState(false);
  const [appui, setAppui] = useState<string | null>(null);

  // Page name for the fixed title: given, or read from the page heading.
  useEffect(() => {
    const el = document.querySelector(".hello h2");
    // Keep the coloured first name (« Bonsoir, Mongi ») as in the page heading.
    if (el && el.querySelector(".perso")) setTitreHtml(el.innerHTML);
    if (page) return;
    const h = el?.textContent?.trim();
    if (h) setTitrePage(h);
  }, [page]);

  // The address keeps the open part (#bloc-…), so « back » and shared links work.
  useEffect(() => {
    const lire = () => {
      const h = decodeURIComponent(window.location.hash.replace(/^#bloc-/, ""));
      if (h && valides.some((b) => b.id === h)) {
        setActif(h);
        setTout(false);
      }
    };
    lire(); // a part named in the address (#bloc-…) wins over the page's default
    window.addEventListener("hashchange", lire);
    return () => window.removeEventListener("hashchange", lire);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const h = window.location.hash.replace(/^#bloc-/, "");
    if (h && valides.some((b) => b.id === h)) return;
    if (initial && valides.some((b) => b.id === initial)) setActif(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // The side rail is fixed on screen: it never moves. Its left edge follows its place in the layout.
  useEffect(() => {
    // Its top sits right under the title line (lower at first when a message is shown above the page).
    let raf = 0;
    const caler = () => {
      raf = 0;
      if (!place.current || !volet.current) return;
      volet.current.style.left = `${Math.round(place.current.getBoundingClientRect().left)}px`;
      const b = barre.current?.getBoundingClientRect();
      if (b) volet.current.style.top = `${Math.round(b.bottom + 8)}px`;
    };
    const demander = () => { if (!raf) raf = requestAnimationFrame(caler); };
    caler();
    window.addEventListener("resize", demander);
    window.addEventListener("scroll", demander, { passive: true });
    const t = setTimeout(caler, 300);
    return () => { window.removeEventListener("resize", demander); window.removeEventListener("scroll", demander); clearTimeout(t); };
  }, []);

  // Height of the fixed title bar, so fixed table headers sit right under it.
  useEffect(() => {
    const el = barre.current;
    const maj = () => document.documentElement.style.setProperty("--bande-h", `${el ? Math.round(el.getBoundingClientRect().height) : 0}px`);
    maj();
    if (!el) return;
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Inside the open part, sub-titles and column headers stay fixed under the title line too.
  // Each table header is placed right under the sub-title that is fixed above it.
  useEffect(() => {
    const sc = scene.current;
    if (!sc) return;
    const auDessus = (el: Element): number => {
      let x: Element | null = el;
      while (x && x !== sc) {
        const p: Element | null = x.parentElement;
        if (p?.classList.contains("panel")) {
          const hd = p.querySelector(":scope > .hd");
          if (hd && hd !== x) return (hd as HTMLElement).offsetHeight;
        }
        let s = x.previousElementSibling;
        while (s) {
          if (s.matches(".sec-title")) return (s as HTMLElement).offsetHeight;
          s = s.previousElementSibling;
        }
        x = p;
      }
      return 0;
    };
    let raf = 0;
    const caler = () => {
      raf = 0;
      // A tab band of the open part (e.g. National · Clubs belges · International Open…) stays fixed
      // under the title line; everything else that is fixed goes right under it.
      const bf = [...sc.querySelectorAll<HTMLElement>(".bande-fixe")].find((b) => b.offsetParent !== null);
      sc.style.setProperty("--sous-bande", `${bf ? bf.offsetHeight : 0}px`);
      sc.querySelectorAll<HTMLElement>(".scroll-x").forEach((b) => b.classList.toggle("x-ok", b.scrollWidth <= b.clientWidth + 1));
      sc.querySelectorAll<HTMLElement>("table, .nos-h, .cc-cols").forEach((t) => {
        t.style.setProperty("--sous-h", `${auDessus(t)}px`);
      });
    };
    const demander = () => { if (!raf) raf = requestAnimationFrame(caler); };
    caler();
    const ro = new ResizeObserver(demander);
    ro.observe(sc);
    window.addEventListener("resize", demander);
    return () => { ro.disconnect(); window.removeEventListener("resize", demander); if (raf) cancelAnimationFrame(raf); };
  }, [actif, tout]);

  useEffect(() => {
    if (!deplie) return;
    const dehors = (e: PointerEvent) => { if (volet.current && !volet.current.contains(e.target as Node)) setDeplie(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setDeplie(false);
    document.addEventListener("pointerdown", dehors);
    window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", dehors); window.removeEventListener("keydown", esc); };
  }, [deplie]);

  // Finger on an entry (phone): its title shows in large, across, for a moment.
  const montrer = (id: string, e: ReactPointerEvent) => {
    if (e.pointerType === "mouse" || deplie) return;
    setAppui(id);
    window.setTimeout(() => setAppui((x) => (x === id ? null : x)), 1100);
  };

  const ouvrir = useCallback((id: string) => {
    setDeplie(false);
    setActif(id);
    setTout(false);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#bloc-${id}`);
    // If the part starts above the screen, bring its top under the top banner.
    requestAnimationFrame(() => {
      const el = scene.current;
      if (!el) return;
      const cs = getComputedStyle(document.documentElement);
      const haut = (parseFloat(cs.getPropertyValue("--entete-h")) || 100) + (parseFloat(cs.getPropertyValue("--bande-h")) || 0);
      const y = el.getBoundingClientRect().top;
      if (y < haut) window.scrollBy({ top: y - haut - 10, behavior: "smooth" });
    });
  }, []);

  // A single part: no side rail, but the same fixed title line « Page › Partie » on top.
  if (tous.length <= 1)
    return (
      <div className="blocs seul">
        <div className="bl-col">
          <div ref={barre} className="bl-titre" aria-live="polite">
            {titreHtml ? <span className="bl-page bl-page-html" dangerouslySetInnerHTML={{ __html: titreHtml }} /> : titrePage ? <span className="bl-page">{titrePage}</span> : null}
            {titrePage && valides[0] ? <span className="bl-sep" aria-hidden="true">›</span> : null}
            {valides[0] ? <span className="bl-part"><span aria-hidden="true">{valides[0].ic}</span> {valides[0].titre}{valides[0].badge ? <span className="bl-b">{valides[0].badge}</span> : null}</span> : null}
            {actions ? <span className="bl-actions">{actions}</span> : null}
          </div>
          <div className="scene solo" id="scene" ref={scene}>{valides[0]?.contenu}</div>
        </div>
      </div>
    );
  const courantB = valides.find((b) => b.id === actif) || valides[0];

  return (
    <div className={`blocs volet-ok${tout ? " tout" : ""}`}>
      <div ref={place} className="volet-place" aria-hidden="true" />
      <nav ref={volet} className={`volet v2${deplie ? " deplie" : ""}`} id="onglets" aria-label="Parties de la page">
        <button type="button" className="vl-pli" onClick={() => setDeplie((d) => !d)} aria-expanded={deplie} title={deplie ? "Replier" : "Déplier le menu"}>
          <span aria-hidden="true">{deplie ? "«" : "☰"}</span>
          <span className="vl-pli-t">{deplie ? "Replier" : ""}</span>
        </button>
        {tous.map((b) => {
          const on = b.href ? Boolean(b.actuel) : !tout && b.id === actif;
          const badge = b.badge !== undefined && b.badge !== null && b.badge !== "" ? b.badge : null;
          const dedans = (
            <>
              <span className="vl-ic" aria-hidden="true">{b.ic}</span>
              {b.court ? <span className="vl-c" aria-hidden="true">{b.court}</span> : null}
              <span className="vl-t">{b.titre}</span>
              {badge && String(badge).length <= 3 ? <span className="vl-b">{badge}</span> : null}
              <span className="vl-bulle" aria-hidden="true">{b.titre}{badge && String(badge).length > 3 ? ` · ${badge}` : ""}</span>
            </>
          );
          const cls = `vl-i${on ? " on" : ""}${appui === b.id ? " appui" : ""}`;
          if (b.href)
            return (
              <Link key={b.id} href={b.href} title={b.titre} aria-label={b.titre} className={`${cls} vl-lien`} aria-current={on ? "page" : undefined} onPointerDown={(e) => montrer(b.id, e)} onClick={() => setDeplie(false)}>
                {dedans}
              </Link>
            );
          return (
            <button
              key={b.id}
              type="button"
              data-bloc={b.id}
              aria-label={b.titre}
              className={cls}
              aria-current={on ? "true" : undefined}
              onPointerDown={(e) => montrer(b.id, e)}
              onClick={() => ouvrir(b.id)}
            >
              {dedans}
            </button>
          );
        })}
        {valides.length > 1 ? (
          <button type="button" className={`vl-i vl-tout${tout ? " on" : ""}${appui === "_tout" ? " appui" : ""}`} onPointerDown={(e) => montrer("_tout", e)} onClick={() => { setTout((t) => !t); setDeplie(false); }} aria-pressed={tout} aria-label={tout ? "Un à la fois" : "Tout afficher"}>
            <span className="vl-ic" aria-hidden="true">{tout ? "◱" : "▦"}</span>
            <span className="vl-t">{tout ? "Un à la fois" : "Tout afficher"}</span>
            <span className="vl-bulle" aria-hidden="true">{tout ? "Un à la fois" : "Tout afficher"}</span>
          </button>
        ) : null}
      </nav>

      <div className="bl-col">
      <div ref={barre} className="bl-titre" aria-live="polite">
        {titreHtml ? <span className="bl-page bl-page-html" dangerouslySetInnerHTML={{ __html: titreHtml }} /> : titrePage ? <span className="bl-page">{titrePage}</span> : null}
        {titrePage ? <span className="bl-sep" aria-hidden="true">›</span> : null}
        <span className="bl-part">
          <span aria-hidden="true">{tout ? "▦" : courantB?.ic}</span> {tout ? "Tout" : courantB?.titre}
          {!tout && courantB?.badge ? <span className="bl-b">{courantB.badge}</span> : null}
        </span>
        {actions ? <span className="bl-actions">{actions}</span> : null}
      </div>
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
    </div>
  );
}
