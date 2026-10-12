"use client";

import { useEffect, useState } from "react";

/** Our row (« ma-ligne ») brought to the middle of the screen, without the fixed bars hiding it. */
function centrer(douce: boolean) {
  const ligne = document.getElementById("ma-ligne");
  if (!ligne) return;
  const bloc = ligne.closest<HTMLElement>(".scroll-x");
  const comportement: ScrollBehavior = douce ? "smooth" : "auto";
  // 1. Inside the table (when it scrolls on its own): the row in the middle of the table.
  if (bloc && bloc.scrollHeight > bloc.clientHeight + 1) {
    const b = bloc.getBoundingClientRect();
    const l = ligne.getBoundingClientRect();
    bloc.scrollBy({ top: l.top - b.top - (bloc.clientHeight - l.height) / 2, behavior: comportement });
  }
  // 2. On the page: the row in the middle of the space left between the fixed top and the bottom bar.
  const cs = getComputedStyle(document.documentElement);
  const haut = parseFloat(cs.getPropertyValue("--haut-fixe")) || (parseFloat(cs.getPropertyValue("--entete-h")) || 100) + (parseFloat(cs.getPropertyValue("--bande-h")) || 0);
  const bas = parseFloat(cs.getPropertyValue("--dock-h")) || 84;
  const milieu = haut + (window.innerHeight - haut - bas) / 2;
  window.setTimeout(() => {
    const l = ligne.getBoundingClientRect();
    window.scrollBy({ top: l.top + l.height / 2 - milieu, behavior: comportement });
  }, douce ? 250 : 0);
}

/**
 * When the player (or the club) is in the ranking, the page opens with that row in the middle, highlighted.
 * The « Aller à ma ligne » button only shows when the row is no longer on screen.
 */
export default function AllerLigne({ texte, bouton = true }: { texte: string; bouton?: boolean }) {
  const [visible, setVisible] = useState(true);

  // At opening, after the table has its final size (font adjusted to the screen).
  useEffect(() => {
    const t = window.setTimeout(() => centrer(false), 350);
    return () => window.clearTimeout(t);
  }, []);

  // Is the row on screen (not hidden under the fixed bars)?
  useEffect(() => {
    const ligne = document.getElementById("ma-ligne");
    if (!ligne) return;
    const cs = getComputedStyle(document.documentElement);
    const haut = Math.round(parseFloat(cs.getPropertyValue("--haut-fixe")) || 160) + 40;
    const bas = Math.round(parseFloat(cs.getPropertyValue("--dock-h")) || 84);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: `-${haut}px 0px -${bas}px 0px`, threshold: 0.6 });
    io.observe(ligne);
    return () => io.disconnect();
  }, []);

  if (!bouton) return null;
  return (
    <button type="button" className={`cl-aller${visible ? " cache" : ""}`} onClick={() => centrer(true)} aria-hidden={visible} tabIndex={visible ? -1 : 0}>
      <span aria-hidden="true">🎯</span> {texte}
    </button>
  );
}
