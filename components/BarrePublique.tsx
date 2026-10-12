"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icone from "./Icone";
import NavSection from "./NavSection";

/* Same floating dock as the members' space, for visitors (no login):
   the parts of the public club page, the rankings, and a gold button to log in. */
const ITEMS = [
  { href: "/club#bloc-club", bloc: "club", label: "Le club", ic: "accueil", c: "rouge" },
  { href: "/club#bloc-calendrier", bloc: "calendrier", label: "Calendrier", ic: "calendrier", c: "canard" },
  { href: "/club#bloc-entrainements", bloc: "entrainements", label: "Entraîn.", ic: "cible", c: "orange" },
  { href: "/club/classements", bloc: null, label: "Classements", ic: "podium", c: "indigo" },
];

export default function BarrePublique({ connecte = false }: { connecte?: boolean }) {
  const path = usePathname() || "/";
  const [hash, setHash] = useState("");
  useEffect(() => {
    const lire = () => setHash(window.location.hash.replace(/^#bloc-/, ""));
    lire();
    window.addEventListener("hashchange", lire);
    // Blocs changes the address without a « hashchange » event: check again after a click.
    const clic = () => setTimeout(lire, 60);
    document.addEventListener("click", clic);
    return () => { window.removeEventListener("hashchange", lire); document.removeEventListener("click", clic); };
  }, [path]);
  const actif = (i: (typeof ITEMS)[number]) =>
    i.bloc ? path === "/club" && (hash === i.bloc || (!hash && i.bloc === "club")) : path === i.href || path.startsWith(i.href + "/");
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => setOuvert(false), [path, hash]);
  // The menu closes by itself after a few seconds without being touched.
  const minuteur = useRef<number | null>(null);
  const relancer = () => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => setOuvert(false), 6000);
  };
  useEffect(() => {
    if (!ouvert) { if (minuteur.current) clearTimeout(minuteur.current); return; }
    relancer();
    return () => { if (minuteur.current) clearTimeout(minuteur.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert]);
  // Choosing a section: the menu closes and the section opens on its first part.
  const choisir = (href: string) => {
    setOuvert(false);
    const cible = new URL(href, window.location.href);
    if (cible.pathname === window.location.pathname && !cible.hash) {
      window.dispatchEvent(new Event("blocs-premier"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const page = ITEMS.find((i) => actif(i)) || ITEMS[0];

  return (
    <>
      <button type="button" className={`menu-bouton${ouvert ? " ouvert" : ""}`} aria-expanded={ouvert} aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setOuvert((o) => !o)}>
        <Icone n={ouvert ? "fermer" : "menu"} />
      </button>
      {ouvert ? <button type="button" className="menu-fond" aria-label="Fermer le menu" onClick={() => setOuvert(false)} /> : null}
      <nav onPointerMove={relancer} onPointerDown={relancer} onWheel={relancer} className={`menu-tiroir${ouvert ? " on" : ""}`} aria-label="Menu principal" aria-hidden={!ouvert}>
        <div className="mt-tete"><span className="feuille-av" aria-hidden="true">🦁</span><span><b>Espace visiteur</b><small>SC Lions d&apos;Eugies</small></span></div>
        <div className="mt-liste">
          {ITEMS.map((i) => {
            const cls = `mt-l d-${i.c}${actif(i) ? " on" : ""}`;
            const dedans = (<><span className="mt-ic"><Icone n={i.ic} taille={19} /></span><span className="mt-t">{i.label === "Entraîn." ? "Entraînements" : i.label}</span></>);
            return i.bloc ? (
              <a key={i.href} href={i.href} className={cls} tabIndex={ouvert ? 0 : -1} onClick={() => setOuvert(false)}>{dedans}</a>
            ) : (
              <Link key={i.href} href={i.href} className={cls} tabIndex={ouvert ? 0 : -1} onClick={() => choisir(i.href)}>{dedans}</Link>
            );
          })}
          <Link href={connecte ? "/" : "/login"} className="mt-l staff" tabIndex={ouvert ? 0 : -1}>
            <span className="mt-ic"><Icone n={connecte ? "joueur" : "entree"} taille={19} /></span>
            <span className="mt-t">{connecte ? "Mon espace" : "Se connecter"}</span>
          </Link>
        </div>
      </nav>
      <NavSection className="defaut" couleur={page.c} actuel="ici" pages={[{ id: "ici", titre: page.label === "Entraîn." ? "Entraînements" : page.label, ic: <Icone n={page.ic} taille={18} /> }]} />
    </>
  );
}
