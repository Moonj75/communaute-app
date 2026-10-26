/* Line icons (24×24, stroke = currentColor) used by the bottom bar and the menus. */
const P: Record<string, string> = {
  accueil: "M3 10.5 12 3l9 7.5M5.5 9v11h4.5v-6h4v6h4.5V9",
  mail: "M3.5 6h17v12h-17zM3.5 6.5l8.5 7 8.5-7",
  calendrier: "M4 6.5h16v14H4zM4 10.5h16M8.5 3.5v5M15.5 3.5v5M8 14h2.5M13.5 14H16M8 17.5h2.5",
  drapeau: "M5 21V4M5 4.5c4-2.5 6.5 2.5 14 0v9c-7.5 2.5-10-2.5-14 0",
  coupe: "M7.5 4h9v5a4.5 4.5 0 0 1-9 0zM7.5 6H4.5v1.5A3 3 0 0 0 7.6 10.5M16.5 6h3v1.5a3 3 0 0 1-3.1 3M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5z",
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
  carte: "M3.5 5.5h17v13h-17zM8 12.2a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5.5 16c.4-1.6 1.3-2.4 2.5-2.4s2.1.8 2.5 2.4M13.5 9.5h4.5M13.5 12.5h4.5M13.5 15.5h3",
  euro: "M17.5 6.2A6.5 6.5 0 1 0 17.5 17.8M4 10.5h9M4 13.5h9",
  coche: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 12.3l2.7 2.7L16.2 9.5",
  reglage: "M4 7h9M17 7h3M4 17h3M11 17h9M15 9.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM9 19.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z",
  voix: "M4 10v4h3l7 4.5v-13L7 10zM17.5 9a4 4 0 0 1 0 6M19.5 6.5a7.5 7.5 0 0 1 0 11",
  groupe: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.6-3.3 3.2-5 6.5-5s5.9 1.7 6.5 5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 15.3c1.9.6 3.2 2.1 3.5 4.7",
};

export default function Icone({ n, taille = 22 }: { n: keyof typeof P | string; taille?: number }) {
  return (
    <svg className="ico" width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[n] || P.menu} />
    </svg>
  );
}
