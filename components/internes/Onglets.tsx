"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Vue = "cl" | "mx";

/**
 * Fixed band of a competition (stages, groups as tabs) and the chosen group below it.
 * On a computer the standings and the matches are side by side, on one screen;
 * on a phone they do not fit together: two pages, « Classement » and « Matchs », switched in the band.
 */
export default function Onglets({ cle, onglets, tete, deuxVues = false }: {
  cle: string;
  onglets: { id: string; nom: string; info: string; classe: string; moi: boolean; contenu: ReactNode }[];
  /** Stages and dates, shown in the fixed band above the tabs. */
  tete?: ReactNode;
  /** Standings + matches: two pages on a small screen. */
  deuxVues?: boolean;
}) {
  const defaut = onglets.find((o) => o.moi)?.id || onglets[0]?.id;
  const [actif, setActif] = useState(defaut);
  const [vue, setVue] = useState<Vue>("cl");
  useEffect(() => {
    try {
      const v = sessionStorage.getItem(`poule-${cle}`);
      if (v && onglets.some((o) => o.id === v)) setActif(v);
      const w = sessionStorage.getItem("ci-vue");
      if (w === "cl" || w === "mx") setVue(w);
    } catch { /* not available */ }
  }, [cle, onglets]);
  const choisir = (id: string) => {
    setActif(id);
    try { sessionStorage.setItem(`poule-${cle}`, id); } catch { /* not available */ }
  };
  // Exact height of the group's screen: from under the fixed band down to the bottom bar.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const maj = () => {
      const ec = el.querySelector<HTMLElement>(".ci-ecran");
      if (!ec) return;
      // Where it really is on screen (once stuck under the band, it stays there).
      const haut = Math.max(parseFloat(getComputedStyle(ec).top) || 0, ec.getBoundingClientRect().top);
      // The bar fixed at the bottom of the screen (section navigation, or the dock).
      const barres = [...document.querySelectorAll<HTMLElement>(".secnav, .dock")].filter((b) => b.getBoundingClientRect().height > 0 && getComputedStyle(b).position === "fixed");
      const bas = Math.min(window.innerHeight, ...barres.map((b) => b.getBoundingClientRect().top));
      el.style.setProperty("--ecran-js", `${Math.max(220, Math.floor(bas - haut - 10))}px`);
    };
    maj();
    const t = window.setTimeout(maj, 400);
    // Banners that appear or close above it (install the app…) move it: checked again regularly.
    const iv = window.setInterval(maj, 1000);
    const ro = new ResizeObserver(maj);
    ro.observe(document.body);
    window.addEventListener("resize", maj);
    window.addEventListener("scroll", maj, { passive: true });
    return () => { window.clearTimeout(t); window.clearInterval(iv); ro.disconnect(); window.removeEventListener("resize", maj); window.removeEventListener("scroll", maj); };
  }, [actif, vue]);
  const voir = (v: Vue) => {
    setVue(v);
    try { sessionStorage.setItem("ci-vue", v); } catch { /* not available */ }
  };
  const o = onglets.find((x) => x.id === actif) || onglets[0];
  if (!o) return <div className="bande-fixe ci-bande">{tete}</div>;
  return (
    <div ref={ref} className={`og${deuxVues ? ` ci-2v v-${vue}` : ""}`}>
      <div className="bande-fixe ci-bande">
        {tete}
        {onglets.length > 1 || deuxVues ? (
          <div className="ci-bande-l2">
            {onglets.length > 1 ? (
              <nav className="og-tabs" role="tablist" aria-label="Poules">
                {onglets.map((x) => (
                  <button key={x.id} type="button" role="tab" aria-selected={x.id === o.id} className={`og-tab${x.classe}${x.id === o.id ? " on" : ""}`} onClick={() => choisir(x.id)}>
                    <b>{x.nom}{x.moi ? <i className="og-moi" title="Ta poule">●</i> : null}</b>
                    <small>{x.info}</small>
                  </button>
                ))}
              </nav>
            ) : <span className="og-seul"><b>{o.nom}</b><small>{o.info}</small></span>}
            {deuxVues ? (
              <div className="ci-vues" role="tablist" aria-label="Page">
                <button type="button" role="tab" aria-selected={vue === "cl"} className={vue === "cl" ? "on" : undefined} onClick={() => voir("cl")}>📊 Classement</button>
                <button type="button" role="tab" aria-selected={vue === "mx"} className={vue === "mx" ? "on" : undefined} onClick={() => voir("mx")}>⚔️ Matchs</button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div role="tabpanel" key={o.id} className="og-panel">{o.contenu}</div>
    </div>
  );
}
