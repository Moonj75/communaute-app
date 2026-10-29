"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "./navigation.css";
import { useEffect, useRef, useState } from "react";
import Icone from "./Icone";
import NavSection from "./NavSection";

type Item = { href: string; label: string; ic: string; opt?: boolean; desc?: string; c?: string; /** Heading of the menu it is listed under. */ g?: string };

/** Player side: Home, then two headings (competitions, me). */
const JOUEUR: Item[] = [
  { href: "/", label: "Accueil", ic: "accueil", c: "rouge" },
  { href: "/calendrier", label: "Calendrier", ic: "calendrier", c: "canard", g: "Compétitions" },
  { href: "/inscriptions", label: "Inscriptions", ic: "drapeau", c: "orange", g: "Compétitions" },
  { href: "/internes", label: "Compétitions du club", ic: "coupe", c: "magenta", g: "Compétitions" },
  { href: "/palmares", label: "Palmarès", ic: "etoile", desc: "Titres et résultats du club", c: "or", g: "Compétitions" },
  { href: "/club/classements", label: "Classements", ic: "podium", opt: true, desc: "Belges et mondiaux", c: "indigo", g: "Compétitions" },
  // Its own section, alone (no heading): the arrows of the bottom bar never lead into it from another page.
  { href: "/entrainements", label: "Entraînements", ic: "cible", c: "canard" },
  { href: "/fiche", label: "Ma fiche", ic: "joueur", c: "violet", g: "Moi" },
  { href: "/profil", label: "Mon profil", ic: "carte", c: "violet", g: "Moi" },
  { href: "/courrier", label: "Courrier", ic: "mail", c: "or", g: "Moi" },
];
/** Staff side: six headings, each page in one place only. */
const STAFF: Item[] = [
  { href: "/staff/inscriptions", label: "Tableau de bord", ic: "tableau", desc: "Inscriptions, relances", c: "bleu", g: "Compétitions & déplacements" },
  { href: "/staff/logistique", label: "Fiches logistiques", ic: "valise", desc: "Remplir et publier", c: "rose", g: "Compétitions & déplacements" },
  { href: "/staff/internes", label: "Compétitions internes", ic: "coupe", desc: "Championnat et coupe du club", c: "magenta", g: "Compétitions & déplacements" },
  { href: "/admin/valideurs", label: "Valideurs", ic: "coche", desc: "Qui valide les scores", c: "magenta", g: "Compétitions & déplacements" },
  { href: "/staff/classements", label: "Mise à jour des classements", ic: "maj", desc: "FBFTS + FISTF", c: "canard", g: "Compétitions & déplacements" },
  { href: "/staff/notifications", label: "Notifications", ic: "cloche", desc: "Prévenir les joueurs", c: "orange", g: "Communication" },
  { href: "/admin/communication", label: "Mails & contacts", ic: "voix", desc: "Mails du club, demandes des visiteurs", c: "or", g: "Communication" },
  { href: "/admin", label: "Joueurs & comptes", ic: "groupe", desc: "Ajout, connexions, aperçu, archives", c: "bronze", g: "Joueurs" },
  { href: "/admin/finances", label: "Cagnottes", ic: "euro", desc: "Gains, dépenses, barème", c: "or", g: "Finances" },
  { href: "/staff/planning", label: "Planning", ic: "planning", desc: "Tâches et feuille de route", c: "violet", g: "Organisation" },
  { href: "/admin/technique", label: "Synchro & sauvegarde", ic: "reglage", desc: "Notion, sauvegarde", c: "bronze", g: "Technique" },
];
/** Small icon of each heading. */
const IC_GROUPE: Record<string, string> = { "Compétitions": "coupe", "Moi": "joueur", "Compétitions & déplacements": "drapeau", "Communication": "voix", "Joueurs": "groupe", "Finances": "euro", "Organisation": "planning", "Technique": "reglage" };

/**
 * Floating dock at the bottom of the screen (always visible): main pages, then a round button
 * that opens the staff pages / « Plus » and log out.
 */
/** Items in order, gathered under their heading (first appearance order). */
function groupes(l: Item[]): [string, Item[]][] {
  const m = new Map<string, Item[]>();
  for (const i of l) m.set(i.g || "", [...(m.get(i.g || "") || []), i]);
  return [...m.entries()];
}

export default function BarreBas({ isAdmin, nom, inactif = false, sansCompet = false }: { isAdmin: boolean; nom?: string; inactif?: boolean; sansCompet?: boolean }) {
  const path = usePathname() || "/";
  const [ouvert, setOuvert] = useState(false);
  // The longest matching address wins (« /admin/finances » is not « /admin »).
  const tousLiens = [...JOUEUR, ...STAFF].map((i) => i.href);
  const meilleur = tousLiens.filter((h) => (h === "/" ? path === "/" : path === h || path.startsWith(h + "/"))).sort((a, b) => b.length - a.length)[0];
  const actif = (h: string) => h === meilleur;
  const staffActif = STAFF.some((s) => actif(s.href));
  // Discovery space (member not active): no answers to competitions; calendar is on the home page.
  const items = inactif
    ? JOUEUR.filter((i) => i.href !== "/inscriptions").map((i) => (i.href === "/calendrier" ? { ...i, href: "/#bloc-calendrier" } : i.opt ? { ...i, opt: false } : i))
    : sansCompet
      ? JOUEUR.filter((i) => i.href !== "/inscriptions")
      : JOUEUR;

  useEffect(() => setOuvert(false), [path]);
  // The rankings are prepared in the background a moment after the app opens, so the
  // « Classements » section shows at once when it is chosen (they only change once a month).
  const router = useRouter();
  useEffect(() => {
    // Kept ready: prepared again every 4 minutes (a prepared page stays fresh for 5).
    // The main pages too, completely (data included): changing section from the menu is then immediate.
    const preparer = () => {
      if (document.visibilityState !== "visible") return;
      ["/club/classements", "/club/classements?l=FBFTS-Clubs", "/club/classements?l=WR-Open"].forEach((h) => router.prefetch(h));
      items.filter((i) => !i.href.includes("#") && !i.href.startsWith("/club/classements")).forEach((i) => router.prefetch(i.href, { kind: "full" } as never));
    };
    const t = window.setTimeout(preparer, 1500);
    const iv = window.setInterval(preparer, 4 * 60 * 1000);
    return () => { window.clearTimeout(t); window.clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, inactif]);
  // Staff pages: prepared as soon as the menu opens (before the finger reaches the line).
  useEffect(() => {
    if (!ouvert || !isAdmin) return;
    STAFF.forEach((i) => router.prefetch(i.href, { kind: "full" } as never));
  }, [ouvert, isAdmin, router]);
  // A thin gold line runs at the top while the chosen page is coming: the tap is seen at once.
  const [vers, setVers] = useState<string | null>(null);
  useEffect(() => setVers(null), [path]);
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
    if (cible.pathname !== window.location.pathname) setVers(cible.pathname);
    if (cible.pathname === window.location.pathname && !cible.hash) {
      window.dispatchEvent(new Event("blocs-premier"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (!ouvert) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [ouvert]);

  // Current page, for the default bottom bar (pages without parts).
  const page = [...items, ...STAFF].find((i) => actif(i.href)) || items[0];
  // Default bottom bar: the other pages of the same heading (arrows go from one to the next).
  const freres = page.g ? (STAFF.includes(page) ? STAFF : items).filter((i) => i.g === page.g) : [];

  return (
    <>
      {vers ? <div className="nav-attente" role="progressbar" aria-label="Chargement de la page" /> : null}
      {/* Main menu: hidden; a small button at the top left opens it from the left side. */}
      <button type="button" className={`menu-bouton${ouvert ? " ouvert" : ""}`} aria-expanded={ouvert} aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setOuvert((o) => !o)}>
        <Icone n={ouvert ? "fermer" : "menu"} />
      </button>
      {ouvert ? <button type="button" className="menu-fond" aria-label="Fermer le menu" onClick={() => setOuvert(false)} /> : null}
      <nav onPointerMove={relancer} onPointerDown={relancer} onWheel={relancer} className={`menu-tiroir${ouvert ? " on" : ""}`} aria-label="Menu principal" aria-hidden={!ouvert}>
        <div className="mt-tete">
          <span className="feuille-av" aria-hidden="true">{(nom || "?").slice(0, 1).toUpperCase()}</span>
          <span>
            <b>{nom}</b>
            <small>{isAdmin ? "Administrateur" : inactif ? "Membre non actif" : "Joueur"}</small>
          </span>
        </div>
        <div className="mt-liste">
          {groupes(items).map(([g, l]) => (
            <div key={g || "_"} className="mt-gr">
              {g ? <p className="mt-gt"><Icone n={IC_GROUPE[g] || "etoile"} taille={12} /> {g}</p> : null}
              {l.map((i) => (
                <Link key={i.href} href={i.href} prefetch={i.href.startsWith("/club/classements") ? true : undefined} className={`mt-l d-${i.c}${actif(i.href) ? " on" : ""}`} tabIndex={ouvert ? 0 : -1} onClick={() => choisir(i.href)}>
                  <span className="mt-ic"><Icone n={i.ic} taille={19} /></span>
                  <span className="mt-t">{i.label}</span>
                </Link>
              ))}
            </div>
          ))}
          {isAdmin ? (
            <>
              <p className="mt-sec"><Icone n="etoile" taille={13} /> Espace staff</p>
              {groupes(STAFF).map(([g, l]) => (
                <div key={g} className="mt-gr staff">
                  <p className="mt-gt"><Icone n={IC_GROUPE[g] || "etoile"} taille={12} /> {g}</p>
                  {l.map((i) => (
                    <Link key={i.href} href={i.href} className={`mt-l d-${i.c} staff${actif(i.href) ? " on" : ""}`} tabIndex={ouvert ? 0 : -1} onClick={() => choisir(i.href)}>
                      <span className="mt-ic"><Icone n={i.ic} taille={19} /></span>
                      <span className="mt-t">{i.label}<small>{i.desc}</small></span>
                    </Link>
                  ))}
                </div>
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

      {/* Default bottom bar (replaced by the page's own parts when it has some). Inside a section
          (e.g. one logistics sheet), the section's main page comes first: the left arrow goes back to it. */}
      <NavSection
        className="defaut"
        couleur={page.c}
        actuel={freres.length > 1 && path === page.href ? page.href : "ici"}
        pages={
          freres.length > 1 && path === page.href
            ? freres.map((i) => ({ id: i.href, titre: i.label, ic: <Icone n={i.ic} taille={18} />, href: i.href }))
            : [
                ...(path !== page.href && page.href !== "/" ? [{ id: "racine", titre: page.label, ic: <Icone n={page.ic} taille={18} />, href: page.href }] : []),
                { id: "ici", titre: path !== page.href && page.href !== "/" ? "Détail" : page.label, ic: <Icone n={page.ic} taille={18} /> },
              ]
        }
      />
    </>
  );
}
