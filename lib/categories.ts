/**
 * Age categories (FISTF / FBFTS), by date of birth and season (1 September → 31 August).
 * Season 2026-2027: Vétérans born before 1/9/1976 · U20 born 1/9/2006–31/8/2010 ·
 * U16 born 1/9/2010–31/8/2014 · U12 born from 1/9/2014 · everyone else Open.
 * The limits move by one year each season.
 */
export type CategorieAge = "Vétéran" | "U20" | "U16" | "U12" | "Open";

/** Year the season starts (from 1 September). */
export function saisonDebut(d = new Date()) {
  return d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
}
export const libelleSaison = (s = saisonDebut()) => `${s}-${s + 1}`;
const sept = (y: number) => `${y}-09-01`;

export function categorieAge(naissance: string | null | undefined, saison = saisonDebut()): CategorieAge | null {
  const d = String(naissance || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  if (d < sept(saison - 50)) return "Vétéran";
  if (d >= sept(saison - 12)) return "U12";
  if (d >= sept(saison - 16)) return "U16";
  if (d >= sept(saison - 20)) return "U20";
  return "Open";
}

/** Category shown: « Femme » set in Notion stays; otherwise the one from the date of birth; otherwise Notion's. */
export function categorieFinale(notion: string | null | undefined, naissance: string | null | undefined) {
  if (notion === "Femme") return "Femme";
  return categorieAge(naissance) || notion || null;
}

const jour = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return `${d}/${m}/${y}`; };
const veille = (y: number) => `31/8/${y}`;
/** The limits of a season, to show them. */
export function tranches(s = saisonDebut()) {
  return [
    { cat: "Vétéran", regle: `Né avant le ${jour(sept(s - 50))}` },
    { cat: "U20", regle: `Né entre le ${jour(sept(s - 20))} et le ${veille(s - 16)}` },
    { cat: "U16", regle: `Né entre le ${jour(sept(s - 16))} et le ${veille(s - 12)}` },
    { cat: "U12", regle: `Né à partir du ${jour(sept(s - 12))}` },
  ];
}
