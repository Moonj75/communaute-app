/* Country of a tournament, read from its place (« Gand (Belgique) », « Paris »…) or its name
 * (« Grand Prix de Ludwigsburg », « Coupe du monde à Madrid »…). Belgium by default. */

const PAYS: [string, RegExp][] = [
  ["FR", /france|paris|caen|wattrelos|issy|[eé]lancourt|puylaurens|lorraine|lille|lyon|marseille|bordeaux|nantes|toulouse|strasbourg|reims|amiens|valenciennes|maubeuge|dunkerque|grand prix de france|gp de france/i],
  ["IT", /itali|rome|roma|milan|turin|torino|naples|napoli|bologn|florence|firenze|v[eé]rone|verona|gen[eè]s|genova|bari|calabr|sicil/i],
  ["ES", /espagne|spain|madrid|barcelon|majorque|mallorca|palma|valence|valencia|s[eé]ville|sevilla|bilbao|malaga/i],
  ["PT", /portugal|lisbonne|lisboa|porto/i],
  ["GR", /gr[eè]ce|greece|ath[eè]nes|athens|ilioupoli|thessalon/i],
  ["DE", /allemagne|germany|ludwi|berlin|munich|m[uü]nchen|hambourg|hamburg|cologne|k[oö]ln|francfort|frankfurt|stuttgart|dortmund|d[uü]sseldorf/i],
  ["AT", /autriche|austria|vienne|wien|salzbourg|graz|linz/i],
  ["GB", /irlande du nord|northern ireland|derry|belfast|heckmond|angleterre|england|royaume|gillingham|manchester|dewsb|haverhill|london|londres|liverpool|birmingham|leeds|ecosse|scotland|glasgow|edimbourg|pays de galles|wales|cardiff/i],
  ["IE", /irlande|ireland|dublin/i],
  ["MT", /malte|malta/i],
  ["CZ", /tch[eè]qu|czech|prague|praha|brno/i],
  ["GI", /gibraltar/i],
  ["NL", /pays-bas|pays bas|netherlands|holland|amsterdam|rotterdam|eindhoven|utrecht|la haye/i],
  ["CH", /suisse|switzerland|gen[eè]ve|zurich|lausanne|berne/i],
  ["LU", /luxembourg/i],
  ["CY", /chypre|cyprus/i],
  ["US", /[eé]tats-unis|usa|new york/i],
  ["BE", /belgique|belgium|eugies|frameries|mons|gand|gent|bruxelles|brussel|li[eè]ge|namur|charleroi|anvers|antwerp|bruges|tournai|wavre|ath\b|auvelais|flanders|flandre|wallonie|hainaut|national d|stembert|wamme|\baye\b|temploux|hennuyer|mechelen|malines|marche-en|verviers|jambes|eupen|hasselt|louvain|leuven|ostende|kortrijk|courtrai|mouscron|arlon|dinant|huy\b|nivelles|waterloo|soignies|la louvi[eè]re|binche|quaregnon|dour|boussu|saint-ghislain|\b\d{4} [A-Z][a-z]+/i],
];

/** ISO code of the country (« FR »), or null when nothing is recognised. */
export function paysDe(...textes: (string | null | undefined)[]): string | null {
  for (const t of textes) {
    if (!t) continue;
    for (const [code, re] of PAYS) if (re.test(t)) return code;
  }
  return null;
}

/** Flag emoji of a country code (« BE » → 🇧🇪). */
export const emojiDrapeau = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

export const NOM_PAYS: Record<string, string> = { BE: "Belgique", FR: "France", IT: "Italie", ES: "Espagne", PT: "Portugal", GR: "Grèce", DE: "Allemagne", AT: "Autriche", GB: "Royaume-Uni", IE: "Irlande", MT: "Malte", CZ: "Tchéquie", GI: "Gibraltar", NL: "Pays-Bas", CH: "Suisse", LU: "Luxembourg", CY: "Chypre", US: "États-Unis" };

/** Country of a calendar event: its place, its name, else Belgium for a « Proximité » trip (nothing when unknown). */
export const paysEv = (e: { lieu?: string | null; nom: string; deplacement?: string | null }) => paysDe(e.lieu, e.nom) || (/proximit/i.test(e.deplacement || "") ? "BE" : null);
/** Country of a palmarès result: its competition's name, else Belgium for a Belgian / internal competition. */
export const paysResultat = (r: { competition: string; type?: string | null; lieu?: string | null }) => paysDe(r.lieu, r.competition) || (r.type === "Belgique" || r.type === "Interne" ? "BE" : null);

/** National-team competitions (World Cup, European Cup, Nations…): the player represents his country, not the club. */
const NATIONS = /coupe du monde|coupe d.europe|championnat du monde|championnat d.europe|world cup|european cup|\beuros?\b|nations/i;
/**
 * Emblem shown above the cup / medal: the country's flag for a national-team competition
 * (Belgium: our players play for Belgium), the club's crest for everything played for Eugies (club teams, opens…).
 */
export const emblemeResultat = (r: { competition: string; equipe?: string | null }) => (NATIONS.test(r.competition) && !r.equipe ? "BE" : "club");
