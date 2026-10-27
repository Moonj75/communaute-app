/* Trainings: types and pure helpers (usable on the server and in the browser). */

export type RoleSeance = "entraineur" | "ouvreur" | "fermeur" | "buvette";

/** tag: the volunteers of the role (Notion → Rôles); supp: the substitutes, called only when a slot is still open. */
export const ROLES: { id: RoleSeance; nom: string; ic: string; notion: string; valide: string; tag: string; supp: string; requis: boolean }[] = [
  { id: "entraineur", nom: "Entraîneur", ic: "🎓", notion: "Entraîneur", valide: "Entraîneur validé", tag: "🎓 Entraîneur", supp: "🔁 Suppléant entraîneur", requis: true },
  { id: "ouvreur", nom: "Ouvreur", ic: "🔑", notion: "Ouvreur", valide: "Ouvreur validé", tag: "🔑 Ouvreur", supp: "🔁 Suppléant ouvreur", requis: true },
  { id: "fermeur", nom: "Fermeur", ic: "🔒", notion: "Fermeur", valide: "Fermeur validé", tag: "🔒 Fermeur", supp: "🔁 Suppléant fermeur", requis: true },
  { id: "buvette", nom: "Buvette", ic: "🍺", notion: "Buvette", valide: "Buvette validée", tag: "🍺 Buvette", supp: "🔁 Suppléant buvette", requis: false },
];

export type Poste = { ids: string[]; ok: boolean };
export type StatutSeance = "Prévu" | "Confirmé" | "Annulé";

export type SeanceE = {
  id: string;
  titre: string;
  date: string;
  debut: string | null;
  fin: string | null;
  lieu: string | null;
  statut: StatutSeance;
  annule: boolean;
  motif: string | null;
  postes: Record<RoleSeance, Poste>;
  /** Exercise codes in the order of the day. */
  programme: string[];
  exercices: string[];
  publie: boolean;
  notes: string | null;
};

export type Exercice = {
  id: string;
  code: string | null;
  titre: string;
  styles: string[];
  niveau: string | null;
  duree: number | null;
  description: string | null;
  materiel: string | null;
  objectif: string | null;
  joueurs: number | null;
  video: string | null;
};

/** Nomenclature of the exercise sheets: one prefix per kind of exercise. */
export const CATEGORIES: { style: string; code: string; ic: string }[] = [
  { style: "Échauffement", code: "E", ic: "🔥" },
  { style: "Attaque", code: "A", ic: "⚔️" },
  { style: "Défense", code: "D", ic: "🛡️" },
  { style: "Tactique", code: "TA", ic: "🧠" },
  { style: "Technique", code: "TE", ic: "🎯" },
  { style: "Tir", code: "TI", ic: "💥" },
  { style: "Gardien", code: "G", ic: "🧤" },
  { style: "Phases arrêtées", code: "PA", ic: "🚩" },
];
export const prefixe = (style?: string | null) => CATEGORIES.find((c) => c.style === style)?.code || "X";

/** Next free code for a category, e.g. D-04 when D-01…D-03 exist. */
export function prochainCode(style: string, existants: (string | null)[]) {
  const p = prefixe(style);
  const nums = existants.map((c) => (c || "").toUpperCase().match(new RegExp(`^${p}-(\\d+)$`))?.[1]).filter(Boolean).map(Number);
  return `${p}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, "0")}`;
}

/** Now in Brussels as « YYYY-MM-DD HH:mm » (the deadline is a Belgian wall-clock time). */
export function maintenantBxl(d = new Date()) {
  const f = new Intl.DateTimeFormat("fr-BE", { timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const v = (t: string) => f.find((x) => x.type === t)?.value || "00";
  return `${v("year")}-${v("month")}-${v("day")} ${v("hour") === "24" ? "00" : v("hour")}:${v("minute")}`;
}

/** Monday of the same week, 21:00: last moment to confirm. */
export function limiteDe(date: string) {
  const d = new Date(date.slice(0, 10) + "T12:00:00Z");
  const jour = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - jour);
  return { jour: d.toISOString().slice(0, 10), heure: "21:00" };
}
export const limiteTexte = (date: string) => `${limiteDe(date).jour} ${limiteDe(date).heure}`;
export const limitePassee = (date: string, now = maintenantBxl()) => now >= limiteTexte(date);

/** The holders confirm until the Friday before (one week earlier), 21:00. */
export function limiteTitulaires(date: string) {
  const d = new Date(date.slice(0, 10) + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 7);
  return { jour: d.toISOString().slice(0, 10), heure: "21:00" };
}
/**
 * « titulaires »: the planned people confirm (until the Friday before, 21:00);
 * « suppleants »: open roles are offered to the substitutes (until Monday 21:00);
 * « clos »: decided.
 */
export function phase(date: string, now = maintenantBxl()): "titulaires" | "suppleants" | "clos" {
  if (limitePassee(date, now)) return "clos";
  const t = limiteTitulaires(date);
  return now >= `${t.jour} ${t.heure}` ? "suppleants" : "titulaires";
}

/** Required roles filled and validated (trainer, opener, closer). */
export const complet = (s: SeanceE) => ROLES.filter((r) => r.requis).every((r) => s.postes[r.id].ids.length > 0 && s.postes[r.id].ok);

/** Status shown: after the deadline a « planned » session is confirmed or cancelled by its roles. */
export function statutEffectif(s: SeanceE, now = maintenantBxl()): StatutSeance {
  if (s.annule || s.statut === "Annulé") return "Annulé";
  if (s.statut === "Confirmé") return "Confirmé";
  return limitePassee(s.date, now) ? (complet(s) ? "Confirmé" : "Annulé") : "Prévu";
}

/** Fridays of a month « YYYY-MM ». */
export function vendredis(mois: string) {
  const [a, m] = mois.split("-").map(Number);
  const out: string[] = [];
  for (let j = 1; j <= 31; j++) {
    const d = new Date(Date.UTC(a, m - 1, j, 12));
    if (d.getUTCMonth() !== m - 1) break;
    if (d.getUTCDay() === 5) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** A YouTube / Facebook / Vimeo link → address that plays inside the page (null: open as a link). */
export function videoIntegree(url: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\.|^m\./, "");
    if (h === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (h === "youtube.com") {
      const v = u.searchParams.get("v") || (u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/) || [])[1];
      return v ? `https://www.youtube-nocookie.com/embed/${v}` : null;
    }
    if (h === "vimeo.com") { const v = u.pathname.match(/^\/(\d+)/)?.[1]; return v ? `https://player.vimeo.com/video/${v}` : null; }
    if (h === "facebook.com" || h === "fb.watch") return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
  } catch { /* not a link */ }
  return null;
}
