"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icone from "./Icone";

type Item = { href: string; label: string; ic: string; opt?: boolean; desc?: string; c?: string };

const JOUEUR: Item[] = [
  { href: "/", label: "Accueil", ic: "accueil", c: "rouge" },
  { href: "/calendrier", label: "Calendrier", ic: "calendrier", c: "canard" },
  { href: "/inscriptions", label: "Inscriptions", ic: "drapeau", c: "orange" },
  { href: "/club/classements", label: "Classements", ic: "podium", opt: true, desc: "Belges et mondiaux", c: "indigo" },
  { href: "/fiche", label: "Ma fiche", ic: "joueur", c: "violet" },
];
const STAFF: Item[] = [
  { href: "/staff/inscriptions", label: "Tableau de bord", ic: "tableau", desc: "Inscriptions, relances, logistique", c: "bleu" },
  { href: "/staff/planning", label: "Planning", ic: "planning", desc: "Tâches et feuille de route", c: "violet" },
  { href: "/staff/logistique", label: "Fiches logistiques", ic: "valise", desc: "Remplir et publier", c: "rose" },
  { href: "/staff/notifications", label: "Notifications", ic: "cloche", desc: "Prévenir les joueurs", c: "orange" },
  { href: "/staff/classements", label: "Mise à jour des classements", ic: "maj", desc: "FBFTS + FISTF, import manuel", c: "canard" },
  { href: "/admin", label: "Joueurs & accès", ic: "dossier", desc: "Synchro Notion, comptes", c: "bronze" },
];

/**
 * Floating dock at the bottom of the screen (always visible): main pages, then a round button
 * that opens the staff pages / « Plus » and log out.
 */
export default function BarreBas({ isAdmin, nom, inactif = false }: { isAdmin: boolean; nom?: string; inactif?: boolean }) {
  const path = usePathname() || "/";
  const [ouvert, setOuvert] = useState(false);
  const actif = (h: string) => (h === "/" ? path === "/" : path === h || path.startsWith(h + "/"));
  const staffActif = STAFF.some((s) => actif(s.href));
  // Discovery space (member not active): no answers to competitions; calendar is on the home page.
  const items = inactif
    ? [JOUEUR[0], { href: "/#bloc-calendrier", label: "Calendrier", ic: "calendrier", c: "canard" }, { ...JOUEUR[3], opt: false }, JOUEUR[4]]
    : JOUEUR;

  useEffect(() => setOuvert(false), [path]);
  useEffect(() => {
    if (!ouvert) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [ouvert]);

  // Current page, for the default bottom bar (pages without parts).
  const page = [...items, ...STAFF].find((i) => actif(i.href)) || items[0];

  return (
    <>
      {/* Main menu: hidden; a small button at the top left opens it from the left side. */}
      <button type="button" className={`menu-bouton${ouvert ? " ouvert" : ""}`} aria-expanded={ouvert} aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setOuvert((o) => !o)}>
        <Icone n={ouvert ? "fermer" : "menu"} />
      </button>
      {ouvert ? <button type="button" className="menu-fond" aria-label="Fermer le menu" onClick={() => setOuvert(false)} /> : null}
      <nav className={`menu-tiroir${ouvert ? " on" : ""}`} aria-label="Menu principal" aria-hidden={!ouvert}>
        <div className="mt-tete">
          <span className="feuille-av" aria-hidden="true">{(nom || "?").slice(0, 1).toUpperCase()}</span>
          <span>
            <b>{nom}</b>
            <small>{isAdmin ? "Administrateur" : inactif ? "Membre non actif" : "Joueur"}</small>
          </span>
        </div>
        <div className="mt-liste">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className={`mt-l d-${i.c}${actif(i.href) ? " on" : ""}`} tabIndex={ouvert ? 0 : -1} onClick={() => setOuvert(false)}>
              <span className="mt-ic"><Icone n={i.ic} taille={19} /></span>
              <span className="mt-t">{i.label}</span>
            </Link>
          ))}
          {isAdmin ? (
            <>
              <p className="mt-sec"><Icone n="etoile" taille={13} /> Espace staff</p>
              {STAFF.map((i) => (
                <Link key={i.href} href={i.href} className={`mt-l d-${i.c} staff${actif(i.href) ? " on" : ""}`} tabIndex={ouvert ? 0 : -1} onClick={() => setOuvert(false)}>
                  <span className="mt-ic"><Icone n={i.ic} taille={19} /></span>
                  <span className="mt-t">{i.label}<small>{i.desc}</small></span>
                </Link>
              ))}
            </>
          ) : null}
          <form action="/auth/signout" method="post" className="mt-sortie">
            <button type="submit" className="mt-l" tabIndex={ouvert ? 0 : -1}>
              <span className="mt-ic"><Icone n="sortie" taille={18} /></span>
              <span className="mt-t">Se déconnecter</span>
            </button>
          </form>
        </div>
      </nav>

      {/* Default bottom bar (replaced by the page's own parts when it has some): the page in the middle. */}
      <nav className="secnav defaut" aria-label="Navigation">
        <div className="sn-barre">
          <button type="button" className="sn-fl" onClick={() => window.history.back()} aria-label="Retour">
            <span aria-hidden="true">◀</span><span className="sn-fl-t">Retour</span>
          </button>
          <span className={`sn-centre d-${page.c}`}>
            <span className="sn-mini" aria-hidden="true"><Icone n={page.ic} taille={18} /></span>
            <span className="sn-ct"><b>{page.label}</b><small>1 / 1</small></span>
          </span>
          <button type="button" className="sn-fl d" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Haut de page">
            <span className="sn-fl-t">Haut</span><span aria-hidden="true">▲</span>
          </button>
        </div>
      </nav>
    </>
  );
}
