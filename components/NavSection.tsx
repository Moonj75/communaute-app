"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

export type PageSection = {
  id: string;
  titre: string;
  ic: ReactNode;
  /** Another page of the same section (e.g. another ranking). */
  href?: string;
  /** A part of the current page. */
  onClick?: () => void;
  /** Dotted thumbnail (e.g. « Tout afficher »): not reached by the arrows. */
  special?: boolean;
};

/** Colour of each section (same as in the main menu). The longest matching address wins. */
const COULEURS: [string, string][] = [
  ["/staff/inscriptions", "bleu"],
  ["/staff/planning", "violet"],
  ["/staff/evenements", "canard"],
  ["/staff/logistique", "rose"],
  ["/staff/notifications", "orange"],
  ["/staff/classements", "canard"],
  ["/staff/internes", "magenta"],
  ["/internes", "magenta"],
  ["/admin/finances", "or"],
  ["/admin/communication", "or"],
  ["/admin/valideurs", "magenta"],
  ["/admin", "bronze"],
  ["/club/classements", "indigo"],
  ["/palmares", "or"],
  ["/calendrier", "canard"],
  ["/inscriptions", "orange"],
  ["/fiche", "violet"],
  ["/profil", "violet"],
  ["/courrier", "or"],
  ["/club", "rouge"],
  ["/", "rouge"],
];
export function couleurSection(path: string) {
  const ok = COULEURS.filter(([p]) => (p === "/" ? path === "/" : path === p || path.startsWith(p + "/"))).sort((a, b) => b[0].length - a[0].length)[0];
  return ok ? ok[1] : "or";
}

function Chevron({ d }: { d: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path d={d ? "M9 4.5 16.5 12 9 19.5" : "M15 4.5 7.5 12 15 19.5"} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Bottom bar of a section: the pages of the section as small see-through thumbnails, side by side;
 * the page being shown is bigger and lit up. Arrows on each side go to the previous / next page,
 * and never leave the section.
 */
export default function NavSection({ pages, actuel, couleur, className = "" }: { pages: PageSection[]; actuel: string; couleur?: string; className?: string }) {
  const path = usePathname() || "/";
  const c = couleur || couleurSection(path);
  const piste = useRef<HTMLDivElement>(null);
  const normales = pages.filter((p) => !p.special);
  const ix = normales.findIndex((p) => p.id === actuel);
  const prec = ix > 0 ? normales[ix - 1] : null;
  const suiv = ix >= 0 && ix < normales.length - 1 ? normales[ix + 1] : null;

  // The current thumbnail is brought to the middle of the strip.
  useEffect(() => {
    const el = piste.current;
    const on = el?.querySelector<HTMLElement>(".ns-p.on");
    if (!el || !on) return;
    el.scrollTo({ left: on.offsetLeft - el.clientWidth / 2 + on.offsetWidth / 2, behavior: "smooth" });
  }, [actuel, pages.length]);

  const fleche = (p: PageSection | null, droite: boolean) => {
    const label = p ? `${droite ? "Suivant" : "Précédent"} : ${p.titre}` : droite ? "Pas de page suivante" : "Pas de page précédente";
    const cls = `ns-fl${droite ? " d" : ""}`;
    if (p?.href) return <Link href={p.href} prefetch className={cls} aria-label={label} title={p.titre}><Chevron d={droite} /></Link>;
    return (
      <button type="button" className={cls} disabled={!p} onClick={() => p?.onClick?.()} aria-label={label} title={p?.titre}>
        <Chevron d={droite} />
      </button>
    );
  };

  return (
    <nav className={`secnav ns d-${c} ${className}`} aria-label="Pages de la section">
      <div className="ns-barre">
        {fleche(prec, false)}
        <div className="ns-piste" ref={piste}>
          {pages.map((p) => {
            const on = p.id === actuel;
            const dedans = (
              <>
                <span className="ns-feuille" aria-hidden="true">
                  <span className="ns-bord" />
                  <span className="ns-ic">{p.ic}</span>
                  <span className="ns-lg" />
                  <span className="ns-lg c" />
                </span>
                <span className="ns-t">{p.titre}</span>
              </>
            );
            const cls = `ns-p${on ? " on" : ""}${p.special ? " sp" : ""}`;
            return p.href ? (
              <Link key={p.id} href={p.href} prefetch className={cls} aria-current={on ? "page" : undefined} title={p.titre}>{dedans}</Link>
            ) : (
              <button key={p.id} type="button" className={cls} aria-current={on ? "page" : undefined} title={p.titre} onClick={() => p.onClick?.()}>{dedans}</button>
            );
          })}
        </div>
        {fleche(suiv, true)}
      </div>
    </nav>
  );
}
