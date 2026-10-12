"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import NavSection, { type PageSection } from "./NavSection";

export type BlocDef = {
  id: string;
  titre: string;
  ic: ReactNode;
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
export default function Blocs({ blocs, initial, page, actions, pages, pageActuelle }: { blocs: BlocDef[]; initial?: string | null; page?: string; /** Buttons at the right of the fixed title line (e.g. refresh from Notion). */ actions?: ReactNode; /** Pages of the section (e.g. the rankings), shown in the bottom bar when the page has a single part. */ pages?: PageSection[]; pageActuelle?: string }) {
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
  // Computer with a wide screen: a real side menu, pinned open (titles written across). « Réduire » folds it back.
  const [grand, setGrand] = useState(false);
  const [epingle, setEpingle] = useState(true);
  useEffect(() => {
    try { setEpingle(localStorage.getItem("volet-epingle") !== "0"); } catch {}
    const mq = window.matchMedia("(min-width: 1100px) and (pointer: fine)");
    const maj = () => setGrand(mq.matches);
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, []);
  const ep = grand && epingle;
  const basculer = () => {
    if (!grand) return setDeplie((d) => !d);
    setEpingle((v) => {
      try { localStorage.setItem("volet-epingle", v ? "0" : "1"); } catch {}
      return !v;
    });
  };
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
      sc.style.setProperty("--sous-bande", `${bf ? bf.offsetHeight + (bf.classList.contains("duo-choix") ? 8 : 0) : 0}px`);
      // A table wider than the screen first gets a smaller font (down to 10 px) so that, as far as possible,
      // everything is visible without scrolling sideways; only then does it scroll (name column fixed).
      sc.querySelectorAll<HTMLElement>(".scroll-x").forEach((b) => {
        const t = b.querySelector<HTMLElement>("table");
        if (!t || b.offsetParent === null) return;
        t.style.fontSize = "";
        t.classList.remove("serre", "nm2");
        b.classList.add("x-mesure");
        const base = parseFloat(getComputedStyle(t).fontSize) || 14;
        const tient = () => b.scrollWidth <= b.clientWidth + 1;
        const ajuster = () => {
          let bas = 10, haut = base, ok = bas;
          for (let i = 0; i < 6; i++) {
            const m = (bas + haut) / 2;
            t.style.fontSize = `${m.toFixed(2)}px`;
            if (tient()) { ok = m; bas = m; } else haut = m;
          }
          t.style.fontSize = `${ok.toFixed(2)}px`;
        };
        if (!tient()) {
          t.classList.add("serre");
          ajuster();
        }
        b.classList.remove("x-mesure");
      });
      sc.querySelectorAll<HTMLElement>(".scroll-x").forEach((b) => b.classList.toggle("x-ok", b.scrollWidth <= b.clientWidth + 1));
      sc.querySelectorAll<HTMLElement>("table, .nos-h, .cc-cols").forEach((t) => {
        t.style.setProperty("--sous-h", `${auDessus(t)}px`);
      });
      // Everything on one screen: when the open part is just a little too tall for the space between the
      // fixed top and the bottom bar, it is shrunk a little (down to 76 %) so it fits without scrolling.
      // Long lists (much taller) are left as they are: they scroll.
      const contenu = [...sc.querySelectorAll<HTMLElement>(":scope > .scene-bloc:not([hidden]) > .scene-c")][0] || (sc.classList.contains("solo") ? sc : null);
      if (contenu && !sc.closest(".tout")) {
        contenu.style.zoom = "";
        const cs = getComputedStyle(document.documentElement);
        const bas = (parseFloat(cs.getPropertyValue("--dock-h")) || 84) + 14;
        const haut = contenu.getBoundingClientRect().top + window.scrollY;
        const dispo = window.innerHeight - haut - bas;
        const besoin = contenu.scrollHeight;
        if (dispo > 200 && besoin > dispo && besoin <= dispo / 0.76) contenu.style.zoom = String(Math.floor((dispo / besoin) * 100) / 100);
      }
    };
    const demander = () => { if (!raf) raf = requestAnimationFrame(caler); };
    caler();
    const ro = new ResizeObserver(demander);
    ro.observe(sc);
    window.addEventListener("resize", demander);
    return () => { ro.disconnect(); window.removeEventListener("resize", demander); if (raf) cancelAnimationFrame(raf); };
  }, [actif, tout]);

  // Section chosen again from the main menu: back to its first part.
  useEffect(() => {
    const premierePartie = () => {
      setActif(premier);
      setTout(false);
      setDeplie(false);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    };
    window.addEventListener("blocs-premier", premierePartie);
    return () => window.removeEventListener("blocs-premier", premierePartie);
  }, [premier]);

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
        {pages && pages.length ? <NavSection pages={pages} actuel={pageActuelle || pages[0].id} className="blocs-nav" /> : null}
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
    <div className={`blocs volet-ok nv${tout ? " tout" : ""}`}>
      {/* Bottom bar: the parts of the section as thumbnails, the one shown bigger; arrows on each side. */}
      <NavSection
        className="blocs-nav"
        actuel={tout ? "__tout" : courantB?.id || ""}
        pages={[
          ...tous.map((b): PageSection => ({ id: b.id, titre: b.titre, ic: b.ic, href: b.href, onClick: b.href ? undefined : () => ouvrir(b.id) })),
          ...(valides.length > 1 ? [{ id: "__tout", titre: tout ? "Une à la fois" : "Tout", ic: "▦", special: true, onClick: () => setTout((t) => !t) }] : []),
        ]}
      />

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
