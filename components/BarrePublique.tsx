"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icone from "./Icone";

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
  const page = ITEMS.find((i) => actif(i)) || ITEMS[0];

  return (
    <>
      <button type="button" className={`menu-bouton${ouvert ? " ouvert" : ""}`} aria-expanded={ouvert} aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setOuvert((o) => !o)}>
        <Icone n={ouvert ? "fermer" : "menu"} />
      </button>
      {ouvert ? <button type="button" className="menu-fond" aria-label="Fermer le menu" onClick={() => setOuvert(false)} /> : null}
      <nav className={`menu-tiroir${ouvert ? " on" : ""}`} aria-label="Menu principal" aria-hidden={!ouvert}>
        <div className="mt-tete"><span className="feuille-av" aria-hidden="true">🦁</span><span><b>Espace visiteur</b><small>SC Lions d&apos;Eugies</small></span></div>
        <div className="mt-liste">
          {ITEMS.map((i) => {
            const cls = `mt-l d-${i.c}${actif(i) ? " on" : ""}`;
            const dedans = (<><span className="mt-ic"><Icone n={i.ic} taille={19} /></span><span className="mt-t">{i.label === "Entraîn." ? "Entraînements" : i.label}</span></>);
            return i.bloc ? (
              <a key={i.href} href={i.href} className={cls} tabIndex={ouvert ? 0 : -1} onClick={() => setOuvert(false)}>{dedans}</a>
            ) : (
              <Link key={i.href} href={i.href} className={cls} tabIndex={ouvert ? 0 : -1}>{dedans}</Link>
            );
          })}
          <Link href={connecte ? "/" : "/login"} className="mt-l staff" tabIndex={ouvert ? 0 : -1}>
            <span className="mt-ic"><Icone n={connecte ? "joueur" : "entree"} taille={19} /></span>
            <span className="mt-t">{connecte ? "Mon espace" : "Se connecter"}</span>
          </Link>
        </div>
      </nav>
      <nav className="secnav defaut" aria-label="Navigation">
        <div className="sn-barre">
          <button type="button" className="sn-fl" onClick={() => window.history.back()} aria-label="Retour"><span aria-hidden="true">◀</span><span className="sn-fl-t">Retour</span></button>
          <span className={`sn-centre d-${page.c}`}><span className="sn-mini" aria-hidden="true"><Icone n={page.ic} taille={18} /></span><span className="sn-ct"><b>{page.label}</b><small>1 / 1</small></span></span>
          <button type="button" className="sn-fl d" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Haut de page"><span className="sn-fl-t">Haut</span><span aria-hidden="true">▲</span></button>
        </div>
      </nav>
    </>
  );
}
