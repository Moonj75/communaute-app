/* Logistics sheet editor: list of the fields (shared by the server and the editor in the browser). */

export type TypeChamp = "texte" | "long" | "nombre" | "euro" | "km" | "tel" | "email" | "multi" | "select" | "coche" | "ref";
export type Valeur = string | number | boolean | string[] | null;

export type Champ = {
  cle: string;
  prop: string; // Notion property name
  label: string;
  type: TypeChamp;
  groupe: "lieu" | "voyage" | "heb" | "budget" | "orga";
  options?: string[];
  aide?: string;
  /** Relation target for « ref » fields. */
  source?: "actifs" | "joueurs";
};

export const GROUPES = [
  { id: "lieu", titre: "Le tournoi", ic: "📍", c: "national" },
  { id: "voyage", titre: "Le voyage", ic: "🚗", c: "temps" },
  { id: "heb", titre: "L'hébergement", ic: "🏨", c: "open" },
  { id: "budget", titre: "Le budget", ic: "💶", c: "argent" },
  { id: "orga", titre: "L'organisation", ic: "⭐", c: "categorie" },
] as const;

export const CHAMPS: Champ[] = [
  { cle: "adresse", prop: "Adresse complète événement", label: "Adresse du tournoi", type: "texte", groupe: "lieu", aide: "Rue, numéro, ville, pays" },
  { cle: "horaires", prop: "Horaires", label: "Horaires", type: "long", groupe: "lieu", aide: "Accueil, début, fin (une ligne par jour)" },
  { cle: "contactNom", prop: "Contact - Nom", label: "Contact sur place · nom", type: "texte", groupe: "lieu" },
  { cle: "contactTel", prop: "Contact - Téléphone", label: "Contact sur place · téléphone", type: "tel", groupe: "lieu" },
  { cle: "contactMail", prop: "Contact - Email", label: "Contact sur place · e-mail", type: "email", groupe: "lieu" },

  { cle: "distance", prop: "Distance à parcourir (km)", label: "Distance depuis Eugies", type: "km", groupe: "voyage" },
  { cle: "disponibilite", prop: "Disponibilité requise", label: "Disponibilité requise", type: "multi", groupe: "voyage", options: ["Samedi → Dimanche", "Vendredi soir → Dimanche", "Vendredi soir → Lundi", "Jeudi soir → Dimanche", "Jeudi soir → Lundi"] },
  { cle: "vacances", prop: "Pendant vacances scolaires", label: "Pendant les vacances scolaires ?", type: "coche", groupe: "voyage" },
  { cle: "documents", prop: "Documents de voyage requis", label: "Documents à prévoir", type: "multi", groupe: "voyage", options: ["Carte identite", "Passeport", "Visa", "Autorisation parentale (mineur)", "Assurance voyage"] },
  { cle: "zone", prop: "Zone monétaire", label: "Monnaie", type: "select", groupe: "voyage", options: ["Zone Euro (EUR)", "Hors zone Euro"] },
  { cle: "accesAeroport", prop: "Accès événement → aéroport", label: "Accès tournoi ↔ aéroport", type: "texte", groupe: "voyage", aide: "Ex. 25 min en taxi, navette…" },

  { cle: "hebergement", prop: "Adresse hébergement", label: "Adresse de l'hébergement", type: "texte", groupe: "heb" },
  { cle: "hotelNuit", prop: "Prix hôtel/nuit (référence €)", label: "Prix par nuit (référence)", type: "euro", groupe: "heb" },
  { cle: "distHebEvenement", prop: "Distance hébergement - événement (km)", label: "Distance hébergement → tournoi", type: "km", groupe: "heb" },
  { cle: "distHebCentre", prop: "Distance hébergement - centre-ville (km)", label: "Distance hébergement → centre-ville", type: "km", groupe: "heb" },
  { cle: "accesHebEvenement", prop: "Accès hébergement → événement", label: "Comment aller de l'hébergement au tournoi", type: "texte", groupe: "heb" },

  { cle: "essence", prop: "Coût essence (€)", label: "Essence", type: "euro", groupe: "budget" },
  { cle: "peages", prop: "Coût péages (€)", label: "Péages", type: "euro", groupe: "budget" },
  { cle: "location", prop: "Coût location voiture (€)", label: "Location de voiture", type: "euro", groupe: "budget" },
  { cle: "avion", prop: "Coût billet avion (€)", label: "Billet d'avion", type: "euro", groupe: "budget" },
  { cle: "transfert", prop: "Coût transfert aéroport (€)", label: "Transfert aéroport", type: "euro", groupe: "budget" },

  { cle: "objectif", prop: "Objectif de participants", label: "Objectif de participants", type: "nombre", groupe: "orga" },
  { cle: "refPrincipal", prop: "Référent principal", label: "Référent principal", type: "ref", groupe: "orga", source: "actifs" },
  { cle: "refCom", prop: "Référent communication", label: "Référent communication", type: "ref", groupe: "orga", source: "joueurs" },
];

export const PROP_MASQUES = "Champs non utiles";

/** A field counts as done when it has a value (a yes/no box always has one). */
export function rempli(c: Champ, v: Valeur | undefined): boolean {
  if (c.type === "coche") return v === true || v === false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  return typeof v === "string" ? v.trim().length > 0 : false;
}

export function lireMasques(s: string | null | undefined): string[] {
  return (s || "")
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter((x) => CHAMPS.some((c) => c.cle === x));
}

/** Progress of a sheet: done or « not useful » fields over all fields. */
export function avancement(valeurs: Record<string, Valeur>, masques: string[]) {
  const prets = CHAMPS.filter((c) => masques.includes(c.cle) || rempli(c, valeurs[c.cle])).length;
  return { prets, total: CHAMPS.length, complet: prets === CHAMPS.length };
}
