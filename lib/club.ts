import "server-only";
import type { Evenement, Participation, Reponse, Tache } from "./club-types";

/* Notion data sources of the « Deplacements » page (API version 2025-09-03). */
export const DS = {
  calendrier: process.env.NOTION_DS_CALENDRIER || "4a65247d-5415-4461-931e-23e2338bf7c5",
  participations: process.env.NOTION_DS_PARTICIPATIONS || "72b82182-ed4b-42fb-b04a-f69d5ad13330",
  taches: process.env.NOTION_DS_TACHES || "f74f3c05-8a45-4b9c-8900-c6b643ed2eb9",
};
export const TAGS = { calendrier: "notion-calendrier", participations: "notion-participations", taches: "notion-taches" };

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
