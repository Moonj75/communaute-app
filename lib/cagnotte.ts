/* Club kitties: the scale of the tasks, the movements (gains / expenses) and the balances.
 * Pure functions (server and browser). The balance = validated gains − validated expenses. */

export type Unite = "fois" | "heure" | "forfait";
export type Bareme = { id: string; nom: string; ic: string; unite: Unite; taux: number; actif: boolean; ordre: number };
export type StatutMvt = "en_attente" | "valide" | "refuse";
export type Mouvement = {
  id: string;
  cree_le: string;
  date: string;
  joueur_id: string;
  sens: "gain" | "depense";
  categorie: string;
  bareme_id: string | null;
  quantite: number | null;
  unite: Unite | null;
  taux: number | null;
  montant: number;
  libelle: string;
  statut: StatutMvt;
  demande_par: string | null;
  valide_par: string | null;
  valide_le: string | null;
  motif: string | null;
  /** Linked event (club calendar or internal competition), when there is one. */
  evenement_id?: string | null;
  evenement?: string | null;
};

/** An event a movement can be linked to (calendar of the club, internal competition). */
export type EvenementLie = { id: string; nom: string; date: string | null };

export const UNITES: Record<Unite, { court: string; long: string }> = {
  fois: { court: "/ fois", long: "par fois" },
  heure: { court: "/ heure", long: "par heure" },
  forfait: { court: "forfait annuel", long: "forfait annuel" },
};

/** Kinds of expenses (paid with the kitty). */
export const DEPENSES = [
  { id: "Déplacement", ic: "🚐" },
  { id: "Hébergement", ic: "🏨" },
  { id: "Inscription tournoi", ic: "🎫" },
  { id: "Cotisation", ic: "🪪" },
  { id: "Matériel", ic: "🎒" },
  { id: "Autre dépense", ic: "✍️" },
] as const;

export const euro = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });
export const arrondi = (n: number) => Math.round(n * 100) / 100;

/** Amount of a task: quantity × rate (a yearly flat rate counts once per quantity). */
export const montantTache = (taux: number, quantite: number) => arrondi(taux * quantite);

/** Signed value of a validated movement (gain +, expense −); anything else counts 0. */
export const valeur = (m: Pick<Mouvement, "sens" | "montant" | "statut">) => (m.statut !== "valide" ? 0 : m.sens === "gain" ? Number(m.montant) : -Number(m.montant));

/** Balance of a set of movements (one member, or every member of a shared kitty). */
export const solde = (ms: Pick<Mouvement, "sens" | "montant" | "statut">[]) => arrondi(ms.reduce((s, m) => s + valeur(m), 0));

/** Season (1 September → 31 August) of a date, e.g. « 2026–2027 ». */
export function saisonDe(d: string) {
  const x = new Date(`${d.slice(0, 10)}T12:00:00Z`);
  const a = x.getUTCMonth() >= 8 ? x.getUTCFullYear() : x.getUTCFullYear() - 1;
  return `${a}–${a + 1}`;
}

/** Icon of a movement. */
export function icone(m: Pick<Mouvement, "sens" | "categorie">, bareme: Bareme[] = []) {
  if (m.sens === "gain") return bareme.find((b) => b.nom === m.categorie)?.ic || (m.categorie === "Solde de départ" ? "🏁" : "💰");
  return DEPENSES.find((d) => d.id === m.categorie)?.ic || (m.categorie === "Solde de départ" ? "🏁" : "💸");
}

/** « 3 × 5,00 € » / « 4 h × 5,00 € » / « forfait annuel ». */
export function detailCalcul(m: Pick<Mouvement, "quantite" | "unite" | "taux">) {
  if (!m.unite || m.taux == null) return "";
  const q = Number(m.quantite || 1);
  const t = euro.format(Number(m.taux));
  if (m.unite === "heure") return `${String(q).replace(".", ",")} h × ${t}`;
  if (m.unite === "fois") return `${String(q).replace(".", ",")} × ${t}`;
  return q === 1 ? "forfait annuel" : `${q} × forfait ${t}`;
}
