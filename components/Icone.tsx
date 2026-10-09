/* Line icons (24×24, stroke = currentColor) used by the bottom bar and the menus. */
const P: Record<string, string> = {
  accueil: "M3 10.5 12 3l9 7.5M5.5 9v11h4.5v-6h4v6h4.5V9",
  calendrier: "M4 6.5h16v14H4zM4 10.5h16M8.5 3.5v5M15.5 3.5v5M8 14h2.5M13.5 14H16M8 17.5h2.5",
  drapeau: "M5 21V4M5 4.5c4-2.5 6.5 2.5 14 0v9c-7.5 2.5-10-2.5-14 0",
  podium: "M3 20.5h18M4.5 20.5v-6h5v6M9.5 20.5V9.5h5v11M14.5 20.5v-8h5v8M12 3.5l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 5.6l2-.3z",
  joueur: "M12 12.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM4 21c.8-4 4-6 8-6s7.2 2 8 6",
  etoile: "M12 3.2l2.7 5.5 6 .9-4.35 4.25 1 6-5.35-2.85-5.35 2.85 1-6L3.3 9.6l6-.9z",
  menu: "M4 7h16M4 12h16M4 17h16",
  fermer: "M6 6l12 12M18 6 6 18",
  sortie: "M14.5 4H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4.5M10 16.5 14.5 12 10 7.5M14.5 12H3.5",
  tableau: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  planning: "M8 5h12M8 12h12M8 19h12M3.5 5h.01M3.5 12h.01M3.5 19h.01",
  cloche: "M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 21h4",
  maj: "M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9M18.5 3v4.5H14M5.5 21v-4.5H10",
  dossier: "M3.5 6.5a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z",
  chevron: "M6 9l6 6 6-6",
  cible: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 12.6a.6.6 0 1 0 0-1.2.6.6 0 0 0 0 1.2Z",
  entree: "M9.5 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4.5M14 16.5 18.5 12 14 7.5M18.5 12H8",
  valise: "M4 8h16v11H4zM9 8V5.5h6V8M4 13h16M10 13v2h4v-2",
};

export default function Icone({ n, taille = 22 }: { n: keyof typeof P | string; taille?: number }) {
  return (
    <svg className="ico" width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[n] || P.menu} />
    </svg>
  );
}
