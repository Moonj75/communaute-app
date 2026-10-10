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

  return (
    <>
      {ouvert ? <button type="button" className="feuille-fond" aria-label="Fermer le menu" onClick={() => setOuvert(false)} /> : null}
      <div className={`feuille${ouvert ? " on" : ""}`} role="dialog" aria-label={isAdmin ? "Staff" : "Plus"} aria-hidden={!ouvert}>
        <div className="feuille-tete">
          <span className="feuille-av" aria-hidden="true">{(nom || "?").slice(0, 1).toUpperCase()}</span>
          <span>
            <b>{nom}</b>
            <small>{isAdmin ? "Administrateur" : inactif ? "Membre non actif" : "Joueur"}</small>
          </span>
        </div>
        <div className="feuille-liste">
          {items.filter((i) => i.opt).map((i) => (
            <Link key={i.href} href={i.href} className={`feuille-l opt${actif(i.href) ? " on" : ""}`} tabIndex={ouvert ? 0 : -1}>
              <span className={`fl-ic c-${i.c}`}><Icone n={i.ic} taille={19} /></span>
              <span className="fl-tx"><b>{i.label}</b><small>{i.desc}</small></span>
              <span className="fl-go" aria-hidden="true">›</span>
            </Link>
          ))}
          {isAdmin ? (
            <>
              <p className="feuille-t"><Icone n="etoile" taille={13} /> Espace staff</p>
              {STAFF.map((i) => (
                <Link key={i.href} href={i.href} className={`feuille-l${actif(i.href) ? " on" : ""}`} tabIndex={ouvert ? 0 : -1}>
                  <span className={`fl-ic c-${i.c}`}><Icone n={i.ic} taille={19} /></span>
                  <span className="fl-tx"><b>{i.label}</b><small>{i.desc}</small></span>
                  <span className="fl-go" aria-hidden="true">›</span>
                </Link>
              ))}
            </>
          ) : null}
          <form action="/auth/signout" method="post" className="feuille-sortie">
            <button type="submit" className="feuille-l" tabIndex={ouvert ? 0 : -1}>
              <Icone n="sortie" taille={18} /> Se déconnecter
            </button>
          </form>
        </div>
      </div>

      <nav className="dock" aria-label="Navigation principale">
        <div className="dock-in">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className={`dock-i d-${i.c}${i.opt ? " opt" : ""}${actif(i.href) ? " on" : ""}`} aria-current={actif(i.href) ? "page" : undefined}>
              <span className="dock-ic">
                <Icone n={i.ic} />
              </span>
              <span className="dock-t">{i.label}</span>
            </Link>
          ))}
          <span className="dock-sep" aria-hidden="true" />
          <button
            type="button"
            className={`dock-rond${ouvert ? " ouvert" : ""}${staffActif ? " on" : ""}${isAdmin ? "" : " joueur"}`}
            aria-expanded={ouvert}
            aria-label={isAdmin ? "Espace staff" : "Plus"}
            onClick={() => setOuvert((o) => !o)}
          >
            <Icone n={ouvert ? "fermer" : isAdmin ? "etoile" : "menu"} />
            <span className="dock-t">{isAdmin ? "Staff" : "Plus"}</span>
          </button>
          <form action="/auth/signout" method="post" className="dock-sortie">
            <button type="submit" className="dock-i" title="Se déconnecter" aria-label="Se déconnecter">
              <span className="dock-ic">
                <Icone n="sortie" />
              </span>
              <span className="dock-t">Sortir</span>
            </button>
          </form>
        </div>
      </nav>
    </>
  );
}
