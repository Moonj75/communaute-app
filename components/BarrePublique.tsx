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
  const surLogin = path === "/login";

  return (
    <nav className="dock dock-public" aria-label="Navigation">
      <div className="dock-in">
        {ITEMS.map((i) => {
          const cls = `dock-i d-${i.c}${actif(i) ? " on" : ""}`;
          const dedans = (
            <>
              <span className="dock-ic"><Icone n={i.ic} /></span>
              <span className="dock-t">{i.label}</span>
            </>
          );
          // Parts of the club page: a plain link, so the page switches part like the side rail does.
          return i.bloc ? (
            <a key={i.href} href={i.href} className={cls} aria-current={actif(i) ? "page" : undefined}>{dedans}</a>
          ) : (
            <Link key={i.href} href={i.href} className={cls} aria-current={actif(i) ? "page" : undefined}>{dedans}</Link>
          );
        })}
        <span className="dock-sep" aria-hidden="true" />
        <Link href={connecte ? "/" : "/login"} className={`dock-rond${surLogin ? " on" : ""}`} aria-label={connecte ? "Mon espace" : "Se connecter"}>
          <Icone n={connecte ? "joueur" : "entree"} />
          <span className="dock-t">{connecte ? "Mon espace" : "Connexion"}</span>
        </Link>
      </div>
    </nav>
  );
}
