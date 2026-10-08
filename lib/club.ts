import "server-only";
import type { ClassementClub, FicheLogistique, InfoPublique, Evenement, Participation, Reponse, Resultat, Seance, Tache } from "./club-types";

/* Notion data sources of the « Deplacements » page (API version 2025-09-03). */
export const DS = {
  calendrier: process.env.NOTION_DS_CALENDRIER || "4a65247d-5415-4461-931e-23e2338bf7c5",
  participations: process.env.NOTION_DS_PARTICIPATIONS || "72b82182-ed4b-42fb-b04a-f69d5ad13330",
  taches: process.env.NOTION_DS_TACHES || "f74f3c05-8a45-4b9c-8900-c6b643ed2eb9",
  seances: process.env.NOTION_DS_SEANCES || "99fe0e75-5ba7-456b-ab64-505e610cf6b8",
  resultats: process.env.NOTION_DS_RESULTATS || "5c5552e8-c067-451d-91cb-da7052deed9a",
  classements: process.env.NOTION_DS_CLASSEMENTS || "7b80fb4d-6ff5-4325-b0ff-9d767358f4f2",
  fiches: process.env.NOTION_DS_FICHES || "21bba989-5753-4053-9ab0-5549eba395ce",
  infos: process.env.NOTION_DS_INFOS || "bffe6a83-4398-43a7-a60d-5272d88784c3",
  listeActifs: process.env.NOTION_DS_LISTE_ACTIFS || "94e0d7b9-bb04-4a29-84a0-dc3cc5616432",
};
export const TAGS = {
  calendrier: "notion-calendrier",
  participations: "notion-participations",
  taches: "notion-taches",
  club: "notion-club",
};

const VERSION = "2025-09-03";

type Prop = Record<string, unknown> & { type: string };
type Page = { id: string; url: string; created_time: string; properties: Record<string, Prop>; in_trash?: boolean; archived?: boolean };

export class NotionErreur extends Error {}

function expliquer(status: number, body: string) {
  if (status === 401) return "Le secret Notion est refusé : vérifiez NOTION_TOKEN dans Vercel.";
  if (status === 404)
    return "Notion ne trouve pas cette base : connectez « Lions Eugies App » à toute la page Deplacements (••• → Connexions).";
  if (status === 403)
    return "La connexion Notion « Lions Eugies App » n'a pas le droit d'écrire : activez « Mettre à jour » et « Insérer » dans ses capacités.";
  if (status === 429) return "Notion demande de ralentir : réessayez dans une minute.";
  return `Notion a répondu ${status} : ${body.slice(0, 160)}`;
}

async function notion(path: string, init: { method?: string; body?: unknown; revalidate?: number; tags?: string[] } = {}) {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new NotionErreur("NOTION_TOKEN manquant dans Vercel (Settings → Environment Variables).");
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method: init.method || "POST",
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": VERSION, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    ...(init.revalidate !== undefined ? { next: { revalidate: init.revalidate, tags: init.tags } } : { cache: "no-store" as const }),
  });
  if (!res.ok) throw new NotionErreur(expliquer(res.status, await res.text()));
  return res.json();
}

async function toutLire(ds: string, revalidate: number, tag: string, body: Record<string, unknown> = {}) {
  const out: Page[] = [];
  let cursor: string | undefined;
  let tours = 0;
  do {
    const data = (await notion(`data_sources/${ds}/query`, {
      body: { page_size: 100, start_cursor: cursor, ...body },
      revalidate,
      tags: [tag],
    })) as { results: Page[]; has_more: boolean; next_cursor: string | null };
    out.push(...data.results.filter((p) => !p.in_trash && !p.archived));
    cursor = data.has_more ? data.next_cursor || undefined : undefined;
  } while (cursor && ++tours < 20);
  return out;
}

/* ---------- property readers (tolerant to select / status / text types) ---------- */
function texte(p?: Prop): string | null {
  if (!p) return null;
  const v = p[p.type];
  if (Array.isArray(v)) {
    const s = (v as { plain_text?: string }[]).map((t) => t.plain_text || "").join("").trim();
    return s || null;
  }
  if (p.type === "select" || p.type === "status") return ((v as { name?: string } | null)?.name || null) as string | null;
  if (p.type === "formula") {
    const f = v as { type: string; string?: string; number?: number };
    return f?.string ?? (f?.number != null ? String(f.number) : null);
  }
  return typeof v === "string" ? v : null;
}
function choix(p?: Prop): string | null {
  if (!p) return null;
  if (p.type === "select" || p.type === "status") return (p[p.type] as { name?: string } | null)?.name || null;
  if (p.type === "multi_select") return ((p.multi_select as { name: string }[]) || [])[0]?.name || null;
  return texte(p);
}
function multi(p?: Prop): string[] {
  if (!p) return [];
  if (p.type === "multi_select") return ((p.multi_select as { name: string }[]) || []).map((o) => o.name);
  const c = choix(p);
  return c ? [c] : [];
}
function date(p?: Prop, fin = false): string | null {
  const d = p?.date as { start?: string; end?: string | null } | null | undefined;
  const v = fin ? d?.end : d?.start;
  return v ? v.slice(0, 10) : null;
}
function coche(p?: Prop) {
  return Boolean(p?.checkbox);
}
function rel(p?: Prop): string[] {
  return ((p?.relation as { id: string }[] | undefined) || []).map((r) => r.id);
}
function nettoyerNom(s: string) {
  return s.replace(/^[^0-9A-Za-zÀ-ÿ]+/, "").trim();
}

/* ---------- Calendrier ---------- */
export async function lireCalendrier(): Promise<Evenement[]> {
  const pages = await toutLire(DS.calendrier, 900, TAGS.calendrier, { sorts: [{ property: "Date", direction: "ascending" }] });
  return pages
    .map((pg) => {
      const p = pg.properties;
      return {
        id: pg.id,
        url: pg.url,
        nom: nettoyerNom(texte(p["Nom"]) || ""),
        date: date(p["Date"]),
        fin: date(p["Date"], true),
        lieu: texte(p["Lieu"]),
        type: choix(p["Type d'évènement"]),
        deplacement: choix(p["Type de déplacement"]),
        decision: choix(p["Décision participation"]),
        ouverture: date(p["Ouverture des inscriptions"]),
        limite: date(p["Date limite de réponse"]),
        validation: date(p["Date de validation"]),
        annule: coche(p["Annulé"]),
        nePasFaire: coche(p["Ne sera pas fait"]),
        jourSpecial: choix(p["Jour spécial"]),
        priorite: multi(p["Priorité"]),
      };
    })
    .filter((e) => e.nom);
}

/* ---------- Participations (réponses Tally) ---------- */
export async function lireParticipations(): Promise<Participation[]> {
  const pages = await toutLire(DS.participations, 300, TAGS.participations, {
    filter: { property: "Archivé", checkbox: { equals: false } },
  });
  return pages.map((pg) => {
    const p = pg.properties;
    const s = choix(p["Statut"]);
    return {
      id: pg.id,
      joueurIds: rel(p["Joueur"]),
      nomJoueur: choix(p["Nom joueur"]),
      evenementIds: rel(p["Événement"]),
      nomEvenement: choix(p["Nom événement"]),
      statut: (["Oui", "Non", "Peut-être", "En attente"].includes(s || "") ? s : null) as Reponse | null,
      jours: choix(p["Jours de participation"]),
      vehicule: choix(p["Véhicule disponible"]),
      depart: choix(p["Restriction départ"]),
      retour: choix(p["Restriction retour"]),
      restrictions: multi(p["Détail restrictions"]),
      creeLe: pg.created_time,
      valide: coche(p["Validation définitive"]),
      valideLe: date(p["Validée le"]),
    };
  });
}

/* ---------- Tâches ---------- */
let typeStatut: "status" | "select" = "select";

export async function lireTaches(): Promise<Tache[]> {
  const pages = await toutLire(DS.taches, 300, TAGS.taches);
  return pages.map((pg) => {
    const p = pg.properties;
    if (p["Statut"]?.type === "status") typeStatut = "status";
    return {
      id: pg.id,
      url: pg.url,
      titre: texte(p["Tâche"]) || "Sans titre",
      statut: choix(p["Statut"]) || "À faire",
      priorite: choix(p["Priorité"]),
      type: choix(p["Type de tâche"]),
      echeance: date(p["Échéance"]),
      evenementIds: rel(p["Événement lié"]),
      responsableIds: rel(p["Responsable"]),
      notes: texte(p["Notes"]),
    };
  });
}

export function proprieteStatut(nom: string) {
  return { [typeStatut]: { name: nom } };
}

export async function modifierTache(id: string, champs: { statut?: string; echeance?: string | null }) {
  const properties: Record<string, unknown> = {};
  if (champs.statut) properties["Statut"] = proprieteStatut(champs.statut);
  if (champs.echeance !== undefined) properties["Échéance"] = { date: champs.echeance ? { start: champs.echeance } : null };
  try {
    await notion(`pages/${id}`, { method: "PATCH", body: { properties } });
  } catch (e) {
    // Retry once with the other status type if Notion rejects the property shape.
    if (champs.statut && e instanceof NotionErreur && /400/.test(e.message)) {
      typeStatut = typeStatut === "status" ? "select" : "status";
      properties["Statut"] = proprieteStatut(champs.statut);
      await notion(`pages/${id}`, { method: "PATCH", body: { properties } });
    } else throw e;
  }
}

export async function creerTache(t: { titre: string; echeance: string | null; priorite: string; type: string | null; evenementId: string | null }) {
  const properties: Record<string, unknown> = {
    "Tâche": { title: [{ text: { content: t.titre } }] },
    "Priorité": { select: { name: t.priorite } },
  };
  if (t.echeance) properties["Échéance"] = { date: { start: t.echeance } };
  if (t.type) properties["Type de tâche"] = { select: { name: t.type } };
  if (t.evenementId) properties["Événement lié"] = { relation: [{ id: t.evenementId }] };
  await notion("pages", { body: { parent: { type: "data_source_id", data_source_id: DS.taches }, properties } });
}

/** Runs a Notion read and turns failures into a French message for the page. */
export async function essayer<T>(f: () => Promise<T>): Promise<{ data: T | null; erreur: string | null }> {
  try {
    return { data: await f(), erreur: null };
  } catch (e) {
    return { data: null, erreur: e instanceof Error ? e.message : "Notion est injoignable pour le moment." };
  }
}

/* ---------- Vie du club (accueil) ---------- */
function nombreP(p?: Prop): number | null {
  return typeof p?.number === "number" ? (p.number as number) : null;
}

/** Next training sessions (not cancelled), from today. */
export async function lireSeances(limite = 4): Promise<Seance[]> {
  const aujourd = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Brussels" });
  const data = (await notion(`data_sources/${DS.seances}/query`, {
    body: {
      page_size: limite + 4,
      filter: { property: "Date", date: { on_or_after: aujourd } },
      sorts: [{ property: "Date", direction: "ascending" }],
    },
    revalidate: 1800,
    tags: [TAGS.club],
  })) as { results: Page[] };
  return data.results
    .filter((pg) => !pg.in_trash && !pg.archived)
    .map((pg) => {
      const p = pg.properties;
      return {
        id: pg.id,
        titre: texte(p["Séance"]) || "Entraînement",
        date: date(p["Date"]) || "",
        debut: texte(p["Heure début"]),
        fin: texte(p["Heure fin"]),
        lieu: texte(p["Lieu"]),
        themes: multi(p["Thème"]),
        annule: coche(p["Annulé"]),
        motif: texte(p["Motif d'annulation"]),
        entraineurIds: rel(p["Entraîneur"]),
      };
    })
    .filter((s) => s.date)
    .slice(0, limite);
}

/** Latest results (individual and team). */
export async function lireResultats(limite = 6): Promise<Resultat[]> {
  const data = (await notion(`data_sources/${DS.resultats}/query`, {
    body: { page_size: limite, sorts: [{ property: "Date", direction: "descending" }] },
    revalidate: 1800,
    tags: [TAGS.club],
  })) as { results: Page[] };
  return data.results
    .filter((pg) => !pg.in_trash && !pg.archived)
    .map((pg) => {
      const p = pg.properties;
      return {
        id: pg.id,
        titre: texte(p["Résultat"]) || "Résultat",
        date: date(p["Date"]),
        type: choix(p["Type"]),
        place: nombreP(p["Place"]),
        sur: nombreP(p["Sur"]),
        categorie: choix(p["Catégorie"]),
        competitionIds: rel(p["Compétition"]),
        joueurIds: rel(p["Joueurs"]),
        remarque: texte(p["Remarque"]),
      };
    });
}

/** Club rankings: latest record first (the second one gives the trend). */
export async function lireClassementsClub(): Promise<ClassementClub[]> {
  const data = (await notion(`data_sources/${DS.classements}/query`, {
    body: { page_size: 6, sorts: [{ property: "Date", direction: "descending" }] },
    revalidate: 3600,
    tags: [TAGS.club],
  })) as { results: Page[] };
  return data.results
    .filter((pg) => !pg.in_trash && !pg.archived)
    .map((pg) => {
      const p = pg.properties;
      return {
        date: date(p["Date"]),
        national: nombreP(p["Classement national"]),
        international: nombreP(p["Classement international"]),
        source: (p["Source"]?.url as string | null) || null,
      };
    });
}

/** Player names by Notion id (for coaches, result lines…), cached one hour. */
export async function nomsJoueurs(): Promise<Map<string, string>> {
  const DS_JOUEURS = process.env.NOTION_DS_JOUEURS || "3e329252-8add-80cc-96fe-000bc0a144e4";
  const [pages, actifs] = await Promise.all([toutLire(DS_JOUEURS, 3600, TAGS.club), toutLire(DS.listeActifs, 3600, TAGS.club).catch(() => [] as Page[])]);
  const m = new Map(pages.map((pg) => [pg.id, (texte(pg.properties["Nom complet"]) || "").replace(/\s*\(\d+\)\s*$/, "")]));
  for (const pg of actifs) {
    const t = Object.values(pg.properties).find((p) => p.type === "title");
    const nom = texte(t);
    if (nom) m.set(pg.id, nom.replace(/\s*\(\d+\)\s*$/, ""));
  }
  return m;
}

/* ---------- Fiches logistiques ---------- */
export async function lireFiches(): Promise<Map<string, FicheLogistique>> {
  const pages = await toutLire(DS.fiches, 900, TAGS.calendrier);
  const out = new Map<string, FicheLogistique>();
  for (const pg of pages) {
    const p = pg.properties;
    const n = (k: string) => nombreP(p[k]);
    const couts = [
      ["Essence", n("Coût essence (€)")],
      ["Péages", n("Coût péages (€)")],
      ["Location voiture", n("Coût location voiture (€)")],
      ["Billet d'avion", n("Coût billet avion (€)")],
      ["Transfert aéroport", n("Coût transfert aéroport (€)")],
    ].filter((c): c is [string, number] => typeof c[1] === "number" && c[1] > 0).map(([label, v]) => ({ label, v }));
    const f: FicheLogistique = {
      id: pg.id,
      url: pg.url,
      evenementIds: rel(p["Événement lié"]),
      statut: choix(p["Statut fiche"]),
      adresse: texte(p["Adresse complète événement"]),
      horaires: texte(p["Horaires"]),
      hebergement: texte(p["Adresse hébergement"]),
      distHebEvenement: n("Distance hébergement - événement (km)"),
      distHebCentre: n("Distance hébergement - centre-ville (km)"),
      distance: n("Distance à parcourir (km)"),
      accesHebEvenement: texte(p["Accès hébergement → événement"]),
      accesAeroport: texte(p["Accès événement → aéroport"]),
      documents: multi(p["Documents de voyage requis"]),
      disponibilite: multi(p["Disponibilité requise"]),
      contactNom: texte(p["Contact - Nom"]),
      contactTel: (p["Contact - Téléphone"]?.phone_number as string | null) || null,
      contactMail: (p["Contact - Email"]?.email as string | null) || null,
      couts,
      hotelNuit: n("Prix hôtel/nuit (référence €)"),
      objectif: n("Objectif de participants"),
      vacances: coche(p["Pendant vacances scolaires"]),
      zone: choix(p["Zone monétaire"]),
      referentPrincipalIds: rel(p["Référent principal"]),
      referentComIds: rel(p["Référent communication"]),
    };
    for (const id of f.evenementIds) out.set(id, f);
  }
  return out;
}

/* ---------- Espace public ---------- */
export async function lireInfosPubliques(): Promise<InfoPublique[]> {
  const pages = await toutLire(DS.infos, 900, TAGS.club, {
    filter: { property: "Visible", checkbox: { equals: true } },
    sorts: [{ property: "Ordre", direction: "ascending" }],
  });
  return pages.map((pg) => {
    const p = pg.properties;
    return { id: pg.id, titre: texte(p["Titre"]) || "", texte: texte(p["Texte"]), icone: texte(p["Icône"]), lien: (p["Lien"]?.url as string | null) || null };
  }).filter((i) => i.titre);
}

/* ---------- Réponse native (remplace le formulaire Tally) ---------- */
export type ReponseNative = {
  participationId: string | null;
  joueurId: string;
  joueurNom: string;
  evenementId: string;
  libelleEvenement: string;
  statut: "Oui" | "Non" | "Peut-être";
  jours: string | null;
  restrictions: "Oui" | "Non" | null;
  depart: string | null;
  retour: string | null;
  vehicule: "Oui" | "Non" | null;
  definitif: boolean;
};

export async function enregistrerReponse(r: ReponseNative) {
  const sel = (v: string | null) => (v ? { select: { name: v } } : { select: null });
  const properties: Record<string, unknown> = {
    Titre: { title: [{ text: { content: `${r.joueurNom} — ${r.libelleEvenement}` } }] },
    Joueur: { relation: [{ id: r.joueurId }] },
    "Événement": { relation: [{ id: r.evenementId }] },
    "Nom joueur": sel(r.joueurNom),
    Statut: sel(r.statut),
    "Jours de participation": sel(r.statut === "Oui" ? r.jours : null),
    Restrictions: sel(r.statut === "Oui" ? r.restrictions : null),
    "Restriction départ": sel(r.statut === "Oui" && r.restrictions === "Oui" ? r.depart : null),
    "Restriction retour": sel(r.statut === "Oui" && r.restrictions === "Oui" ? r.retour : null),
    "Véhicule disponible": sel(r.statut === "Oui" ? r.vehicule : null),
  };
  if (r.definitif) {
    properties["Validation définitive"] = { checkbox: true };
    properties["Validée le"] = { date: { start: new Date().toISOString().slice(0, 10) } };
  }
  if (r.participationId) await notion(`pages/${r.participationId}`, { method: "PATCH", body: { properties } });
  else await notion("pages", { body: { parent: { type: "data_source_id", data_source_id: DS.participations }, properties } });
}
