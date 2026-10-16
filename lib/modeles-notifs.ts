/**
 * Texts of the automatic messages (sent every morning). The staff can change them in
 * Staff → Notifications → Envois automatiques; what they save replaces these defaults.
 * Words between braces are filled in at sending time: {competition}, {limite}, {validation},
 * {date}, {lieu}, {n}, {liste}, {detail}.
 */
export type CleModele = "ouverture" | "rappel3" | "confirmation" | "veille" | "taches" | "decision";

export type Modele = {
  cle: CleModele;
  ic: string;
  libelle: string;
  quand: string;
  pourQui: string;
  rangement: "Relances" | "Notifications";
  titre: string;
  texte: string;
  actif: boolean;
  /** The words between braces this message may use. */
  mots: string[];
  /** Example values for the preview when no real competition is at hand. */
  exemple: Record<string, string>;
};

const EX_COMP = { competition: "Open de Majorque", limite: "15/11", validation: "22/11", date: "06/12", lieu: "Palma" };

export const MODELES_DEFAUT: Modele[] = [
  {
    cle: "ouverture", ic: "🏁", libelle: "Ouverture des inscriptions",
    quand: "Le jour où les inscriptions ouvrent (décision du club = Oui)",
    pourQui: "Les joueurs concernés (tous les actifs, ou ceux cochés)",
    rangement: "Relances",
    titre: "🏁 Inscriptions ouvertes : {competition}",
    texte: "Réponds avant le {limite}.",
    actif: true, mots: ["competition", "limite", "date", "lieu"], exemple: EX_COMP,
  },
  {
    cle: "rappel3", ic: "⏰", libelle: "Rappel 3 jours avant la date limite",
    quand: "3 jours avant la date limite de réponse",
    pourQui: "Les joueurs concernés qui n'ont pas encore répondu",
    rangement: "Relances",
    titre: "⏰ Plus que 3 jours pour répondre",
    texte: "{competition} : on attend ta réponse avant le {limite}.",
    actif: true, mots: ["competition", "limite", "date", "lieu"], exemple: EX_COMP,
  },
  {
    cle: "confirmation", ic: "🔒", libelle: "Période de confirmation",
    quand: "Le lendemain de la date limite (s'il y a une date de validation)",
    pourQui: "Ceux qui ont répondu mais pas encore validé",
    rangement: "Relances",
    titre: "🔒 Confirme ta participation : {competition}",
    texte: "Valide définitivement ta réponse avant le {validation}.",
    actif: true, mots: ["competition", "validation", "date", "lieu"], exemple: EX_COMP,
  },
  {
    cle: "veille", ic: "📍", libelle: "Veille de compétition",
    quand: "La veille de la compétition",
    pourQui: "Ceux qui ont répondu Oui",
    rangement: "Notifications",
    titre: "📍 C'est demain : {competition}",
    texte: "{lieu} · Prépare ton matériel. Allez les Lions ! 🦁",
    actif: true, mots: ["competition", "lieu", "date"], exemple: EX_COMP,
  },
  {
    cle: "taches", ic: "🔥", libelle: "Tâches urgentes (chaque jour)",
    quand: "Chaque matin, s'il y a des tâches en retard, du jour ou à faire dans les 3 jours",
    pourQui: "Le staff (administrateurs)",
    rangement: "Relances",
    titre: "🔥 {n} tâche(s) urgente(s)",
    texte: "{detail} — {liste}",
    actif: true, mots: ["n", "detail", "liste"], exemple: { n: "3", detail: "1 en retard · 1 aujourd'hui · 1 dans les 3 jours", liste: "Réserver le minibus · Imprimer les licences · Payer l'inscription" },
  },
  {
    cle: "decision", ic: "🗳️", libelle: "Décision à prendre (8 mois avant)",
    quand: "8 mois avant une compétition encore sans décision",
    pourQui: "Le staff (administrateurs)",
    rangement: "Relances",
    titre: "🗳️ Décision à prendre : {competition}",
    texte: "Compétition le {date}. Le club y va ?",
    actif: true, mots: ["competition", "date", "lieu"], exemple: EX_COMP,
  },
];

/** Fills the words between braces. An empty word does not leave a lonely « · » or double spaces. */
export function remplir(modele: string, mots: Record<string, string | null | undefined>) {
  return modele
    .replace(/\{(\w+)\}/g, (_, k: string) => (mots[k] ?? "").toString())
    .replace(/^\s*[·—-]\s*/, "")
    .replace(/\s*[·—-]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export type ModeleEnregistre = { cle: string; titre: string | null; texte: string | null; actif: boolean | null };

/** Defaults + what the staff saved. */
export function fusionner(enregistres: ModeleEnregistre[]): Modele[] {
  const m = new Map(enregistres.map((e) => [e.cle, e]));
  return MODELES_DEFAUT.map((d) => {
    const e = m.get(d.cle);
    return e ? { ...d, titre: e.titre?.trim() || d.titre, texte: e.texte ?? d.texte, actif: e.actif ?? true } : d;
  });
}
