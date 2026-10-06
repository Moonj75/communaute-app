"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; ic: string };

const JOUEUR: Item[] = [
  { href: "/", label: "Accueil", ic: "🏠" },
  { href: "/calendrier", label: "Calendrier", ic: "📅" },
  { href: "/inscriptions", label: "Mes inscriptions", ic: "🏁" },
  { href: "/fiche", label: "Ma fiche", ic: "👤" },
];
const STAFF: Item[] = [
  { href: "/staff/inscriptions", label: "Tableau de bord", ic: "📊" },
  { href: "/staff/planning", label: "Planning", ic: "🗓️" },
  { href: "/admin", label: "Joueurs", ic: "🗂️" },
];

export default function Nav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname() || "/";
  const actif = (h: string) => (h === "/" ? path === "/" : path === h || path.startsWith(h + "/"));
  const lien = (i: Item) => (
    <Link key={i.href} href={i.href} className={actif(i.href) ? "on" : undefined} aria-current={actif(i.href) ? "page" : undefined}>
      <span className="ni" aria-hidden="true">{i.ic}</span>
      {i.label}
    </Link>
  );
  return (
    <nav className="nav" aria-label="Navigation principale">
      <div className="wrap">
        {JOUEUR.map(lien)}
        {isAdmin ? (
          <>
            <span className="nav-sep" aria-hidden="true">Staff</span>
            {STAFF.map(lien)}
          </>
        ) : null}
      </div>
    </nav>
  );
}
