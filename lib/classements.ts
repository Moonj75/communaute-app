import "server-only";
import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";
import { estEugies, libelleMois, LISTES, pts, reconnaitre, SOURCES, type LigneClassement, type PersonneClub } from "./classements-types";
import { DS } from "./club";

/* ============================================================================
 * Monthly rankings import
 *  - FBFTS (Belgium): Excel file shown on fbftsbstvb.com/nationalrankings.html
 *  - FISTF (world):   « World Ranking - AAAA-MM » file on fistf.com
 * Flow: web → Supabase (full lists, for the app) → Notion (club players' places).
 * ========================================================================== */

type Ligne = Omit<LigneClassement, "joueur_id" | "eugies"> & { eugies?: boolean; joueur_id?: string | null };
export type Lot = { source: "fbfts" | "fistf"; mois: string; libelle: string; lignes: Ligne[]; empreinte: string };

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36", Accept: "*/*" };
const MOIS_EN = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};
const txt = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
};
const empreinte = (buf: ArrayBuffer) => createHash("sha1").update(Buffer.from(buf)).digest("hex");

function lignesFeuille(wb: XLSX.WorkBook, nom: string): unknown[][] {
  const ws = wb.Sheets[nom];
  return ws ? (XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as unknown[][]) : [];
}

/* ---------------------------------- FBFTS --------------------------------- */

/** Reads the FBFTS file: players (Place, Progression, Name, First name, Club, Category, Next category, Points, To defend) then clubs. */
export function lireFbfts(buf: ArrayBuffer, mois: string): Lot {
  const wb = XLSX.read(buf, { type: "array" });
  const rows = lignesFeuille(wb, wb.SheetNames[0]);
  const lignes: Ligne[] = [];
  let section: "joueurs" | "clubs" | "fin" = "joueurs";
  for (const r of rows) {
    const a = txt(r[0]);
    const tete = [r[0], r[1], r[2], r[5]].map((c) => String(c ?? "").toLowerCase()).join("|");
    if (a && /^place$/i.test(a)) {
      if (/club/.test(tete)) section = "clubs";
      else if (/progression/.test(String(r[5] ?? "").toLowerCase()) || /player/.test(tete)) section = "fin";
      continue;
    }
    const rang = num(r[0]);
    if (!rang || section === "fin") continue;
    if (section === "joueurs") {
      const nom = txt(r[2]);
      if (!nom) continue;
      lignes.push({
        liste: "FBFTS",
        mois,
        rang,
        nom,
        prenom: txt(r[3]),
        club: txt(r[4])?.toLowerCase() || null,
        pays: "BEL",
        categorie: txt(r[5]),
        categorie_suivante: txt(r[6]),
        points: num(r[7]),
        evolution: txt(r[1]),
        a_defendre: num(r[8]),
      });
    } else {
      const nom = txt(r[2]);
      if (!nom) continue;
      lignes.push({ liste: "FBFTS-Clubs", mois, rang, nom, prenom: null, club: nom, pays: "BEL", categorie: null, categorie_suivante: null, points: num(r[3]), evolution: txt(r[1]), a_defendre: null });
    }
  }
  if (!lignes.some((l) => l.liste === "FBFTS")) throw new Error("Ce fichier ne ressemble pas au classement FBFTS (colonnes Place / Name / Club introuvables).");
  return { source: "fbfts", mois, libelle: `Classement national · ${libelleMois(mois, true)}`, lignes, empreinte: empreinte(buf) };
}

/* ---------------------------------- FISTF --------------------------------- */

const FEUILLES_FISTF = ["WR-Open", "WR-Veterans", "WR-Women", "WR-U20", "WR-U16", "WR-U12"];

/** Reads the FISTF « World Ranking » workbook (sheets WR-Open … WR-U12, WR-Teams). */
export function lireFistf(buf: ArrayBuffer, mois: string): Lot {
  const wb = XLSX.read(buf, { type: "array" });
  const lignes: Ligne[] = [];
  for (const f of FEUILLES_FISTF) {
    for (const r of lignesFeuille(wb, f).slice(1)) {
      const rang = num(r[0]);
      const nom = txt(r[1]);
      if (!rang || !nom) continue;
      lignes.push({ liste: f, mois, rang, nom, prenom: txt(r[2]), club: txt(r[3]), pays: txt(r[4]), categorie: null, categorie_suivante: null, points: num(r[5]), evolution: txt(r[6]), a_defendre: null });
    }
  }
  for (const r of lignesFeuille(wb, "WR-Teams").slice(1)) {
    const rang = num(r[0]);
    const nom = txt(r[1]);
    if (!rang || !nom) continue;
    lignes.push({ liste: "WR-Teams", mois, rang, nom, prenom: txt(r[2]), club: nom, pays: txt(r[3]), categorie: null, categorie_suivante: null, points: num(r[4]), evolution: txt(r[5]), a_defendre: null });
  }
  if (!lignes.some((l) => l.liste === "WR-Open")) throw new Error("Ce fichier ne ressemble pas au classement international FISTF (onglet « WR-Open » introuvable).");
  return { source: "fistf", mois, libelle: `Classement international · ${libelleMois(mois, true)}`, lignes, empreinte: empreinte(buf) };
}

/** « …-2026-2027-10.xlsx » → 2026-10 (season July → June). */
export function moisDepuisNomFistf(nom: string): string | null {
  const m = nom.match(/(\d{4})-(\d{4})-(\d{2})/);
  if (m) {
    const mm = Number(m[3]);
    return `${mm >= 7 ? m[1] : m[2]}-${m[3]}`;
  }
  const n = nom.match(/(20\d{2})-(\d{2})/);
  return n ? `${n[1]}-${n[2]}` : null;
}

/* ------------------------------ Downloads --------------------------------- */

async function lireTexte(url: string) {
  const r = await fetch(url, { headers: UA, cache: "no-store", redirect: "follow" });
  if (!r.ok) throw new Error(`${new URL(url).hostname} a répondu ${r.status}`);
  return r.text();
}
async function lireFichier(url: string) {
  const r = await fetch(url, { headers: UA, cache: "no-store", redirect: "follow" });
  if (!r.ok) throw new Error(`${new URL(url).hostname} a répondu ${r.status}`);
  if ((r.headers.get("content-type") || "").includes("text/html")) throw new Error(`${new URL(url).hostname} a renvoyé une page au lieu du fichier`);
  return r.arrayBuffer();
}

/** Latest « World Ranking - AAAA-MM » file from the FISTF downloads page. */
export async function telechargerFistf(): Promise<Lot> {
  const html = await lireTexte("https://fistf.com/fistf-downloads/downloads-competition/downloads-competition-world-ranking-synthesis/");
  const liens = [...html.matchAll(/https:\/\/fistf\.com\/download\/(world-ranking-(\d{4})-(\d{2})(?:-\d+)?)\/\?wpdmdl=(\d+)/g)].map((m) => ({
    slug: m[1],
    mois: `${m[2]}-${m[3]}`,
    id: Number(m[4]),
  }));
  if (!liens.length) throw new Error("Lien du classement international introuvable sur fistf.com");
  liens.sort((a, b) => b.mois.localeCompare(a.mois) || b.id - a.id);
  const l = liens[0];
  const buf = await lireFichier(`https://fistf.com/download/${l.slug}/?wpdmdl=${l.id}`);
  return lireFistf(buf, l.mois);
}

/** FBFTS file: the page embeds a POWR « file embed » that points to an Excel file. */
export async function telechargerFbfts(): Promise<Lot> {
  const page = SOURCES.fbfts.page;
  const html = await lireTexte(page);
  const plat = html.replace(/<[^>]+>/g, " ");
  const t = plat.match(new RegExp(`(${MOIS_EN.join("|")})\\s+(20\\d{2})`, "i"));
  const mois = t ? `${t[2]}-${String(MOIS_EN.indexOf(t[1].toLowerCase()) + 1).padStart(2, "0")}` : new Date().toISOString().slice(0, 7);
  const trouver = (s: string) => s.replace(/\\\//g, "/").match(/https:\/\/customer\.powrcdn\.com\/[^"'\s&<>\\]+\.xlsx?/i)?.[0] || null;

  let xls = trouver(html);
  if (!xls) {
    const site = html.match(/com_currentSite\s*=\s*"(\d+)"/)?.[1];
    const elements = [...new Set([...html.matchAll(/element_id\s*=\s*"([0-9a-f-]{36})"/g)].map((m) => m[1]))];
    for (const el of site ? elements : []) {
      // The embed's settings (with « fileUrl ») come from POWR's view.json.
      for (const vue of [
        `https://www.powr.io/plugins/file-embed/view.json?powr_token=weebly_${site}&user_label=weebly_${site}_${el}&external_type=weebly-integrated`,
        `https://www.powr.io/plugins/file-embed/cached_view?load=sync&index=0&unique_label=&powr_token=weebly_${site}&user_label=weebly_${site}_${el}&demo_mode=false&external_type=weebly-integrated&request_url=${encodeURIComponent(page)}`,
      ]) {
        try {
          xls = trouver(await lireTexte(vue));
        } catch {
          /* try the next address */
        }
        if (xls) break;
      }
      if (xls) break;
    }
  }
  if (!xls) throw new Error("Fichier Excel introuvable sur la page du classement national");
  return lireFbfts(await lireFichier(xls), mois);
}

/* ------------------------------- Saving ----------------------------------- */

export type Bilan = { source: string; mois: string; lignes: number; eugies: number; reconnus: number; deja?: boolean; notion?: string };

/** Stores a downloaded or uploaded file. Skips it when the very same file was already imported (unless forcer). */
export async function enregistrerLot(db: SupabaseClient, lot: Lot, par: string, forcer = false): Promise<Bilan> {
  const { data: avant } = await db.from("classements_imports").select("empreinte").eq("source", lot.source).maybeSingle();
  if (!forcer && avant?.empreinte === lot.empreinte) return { source: lot.source, mois: lot.mois, lignes: lot.lignes.length, eugies: 0, reconnus: 0, deja: true };

  const { data: gens } = await db.from("joueurs").select("notion_id,nom,prenom");
  const personnes = (gens || []) as PersonneClub[];
  const lignes = lot.lignes.map((l) => {
    const eugies = estEugies(l.club);
    return { ...l, eugies, joueur_id: eugies && l.prenom !== null && !l.liste.endsWith("Teams") ? reconnaitre(l, personnes) : null };
  });

  const listes = [...new Set(lignes.map((l) => l.liste))];
  const del = await db.from("classements").delete().in("liste", listes);
  if (del.error) throw new Error(del.error.message.includes("does not exist") ? "Table « classements » absente : lance supabase/etape7-classements.sql." : del.error.message);
  for (let i = 0; i < lignes.length; i += 500) {
    const { error } = await db.from("classements").insert(lignes.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
  await db.from("classements_imports").upsert({ source: lot.source, mois: lot.mois, libelle: lot.libelle, empreinte: lot.empreinte, nb: lignes.length, importe_le: new Date().toISOString(), par });
  return {
    source: lot.source,
    mois: lot.mois,
    lignes: lignes.length,
    eugies: lignes.filter((l) => l.eugies && l.prenom !== null).length,
    reconnus: new Set(lignes.map((l) => l.joueur_id).filter(Boolean)).size,
  };
}

/* ------------------------- Players' places → app + Notion ------------------ */

const ORDRE_INTER = ["WR-Open", "WR-Veterans", "WR-Women", "WR-U20", "WR-U16", "WR-U12"];
const nomListe = (id: string) => (LISTES.find((l) => l.id === id)?.court || id).replace(/^International /, "");
const ordinal = (n: number) => (n === 1 ? "1er" : `${n}e`);

type Resume = { belge: number | null; inter: number | null; cat: string | null; texte: string | null };

export function resumer(lignes: LigneClassement[]): Resume {
  const fb = lignes.find((l) => l.liste === "FBFTS");
  const wr = ORDRE_INTER.map((id) => lignes.find((l) => l.liste === id)).filter((l): l is LigneClassement => Boolean(l));
  const parts: string[] = [];
  if (fb)
    parts.push(
      `🇧🇪 National FBFTS : ${ordinal(fb.rang)} · ${fb.categorie || "?"}${fb.categorie_suivante && fb.categorie_suivante !== fb.categorie ? ` → ${fb.categorie_suivante}` : ""} · ${pts(fb.points)} pts (${libelleMois(fb.mois)})`,
    );
  // Youth / veterans / women first when the player is better ranked there.
  for (const l of [...wr].sort((a, b) => a.rang - b.rang)) parts.push(`🌍 International ${nomListe(l.liste)} FISTF : ${ordinal(l.rang)} · ${pts(l.points)} pts (${libelleMois(l.mois)})`);
  return { belge: fb?.rang ?? null, inter: (wr.find((l) => l.liste === "WR-Open") || wr[0])?.rang ?? null, cat: fb?.categorie ?? null, texte: parts.join("\n") || null };
}

const NOTION_V = "2022-06-28";
async function notionPatch(pageId: string, properties: Record<string, unknown>) {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN manquant");
  const r = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": NOTION_V, "Content-Type": "application/json" },
    body: JSON.stringify({ properties }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Notion ${r.status} : ${(await r.text()).slice(0, 140)}`);
}
const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const richText = (s: string | null) => ({ rich_text: s ? [{ type: "text", text: { content: s.slice(0, 1900) } }] : [] });

/**
 * Writes each player's places into the app (table joueurs) and Notion (« Place au classement belge »,
 * « Place au classement international », « Catégorie nationale », « Classements détaillés »).
 * Only changed values are sent to Notion.
 */
export async function majJoueurs(db: SupabaseClient): Promise<{ joueurs: number; notion: number; erreur?: string }> {
  const [{ data: lignes }, { data: gens }] = await Promise.all([
    db.from("classements").select("*").not("joueur_id", "is", null),
    db.from("joueurs").select("*"),
  ]);
  const parJoueur = new Map<string, LigneClassement[]>();
  for (const l of (lignes || []) as LigneClassement[]) parJoueur.set(l.joueur_id!, [...(parJoueur.get(l.joueur_id!) || []), l]);

  let notion = 0;
  let erreur: string | undefined;
  let n = 0;
  for (const j of (gens || []) as Record<string, unknown>[]) {
    const id = String(j.notion_id);
    const r = resumer(parJoueur.get(id) || []);
    const change = (j.classement_belge ?? null) !== r.belge || (j.classement_international ?? null) !== r.inter || ("categorie_nationale" in j && (j.categorie_nationale ?? null) !== r.cat);
    const maj: Record<string, unknown> = { classement_belge: r.belge, classement_international: r.inter };
    if ("categorie_nationale" in j) maj.categorie_nationale = r.cat;
    if (change) {
      await db.from("joueurs").update(maj).eq("notion_id", id);
      n++;
    }
    if (erreur || !process.env.NOTION_TOKEN) continue;
    // Notion: send everyone who is (or was) ranked, so the detailed text stays current.
    if (!r.texte && !change && j.classement_belge === null && j.classement_international === null) continue;
    try {
      await notionPatch(id, {
        "Place au classement belge": { number: r.belge },
        "Place au classement international": { number: r.inter },
        "Catégorie nationale": richText(r.cat),
        "Classements détaillés": richText(r.texte),
      });
      notion++;
      await pause(340); // Notion allows ~3 requests per second
    } catch (e) {
      erreur = e instanceof Error ? e.message : "Notion indisponible";
    }
  }
  return { joueurs: n, notion, erreur };
}

/** Adds (or updates) the month's line in Notion → « Classements du club ». */
export async function majClassementClub(db: SupabaseClient): Promise<string | null> {
  const token = process.env.NOTION_TOKEN;
  if (!token) return null;
  const [{ data: nat }, { data: inter }, { data: imp }] = await Promise.all([
    db.from("classements").select("rang,mois").eq("liste", "FBFTS-Clubs").eq("eugies", true).order("rang").limit(1),
    db.from("classements").select("rang,mois").eq("liste", "WR-Teams").eq("eugies", true).order("rang").limit(1),
    db.from("classements_imports").select("source,mois"),
  ]);
  const mois = ((imp || []) as { mois: string }[]).map((i) => i.mois).sort().pop() || new Date().toISOString().slice(0, 7);
  const titre = `Classement ${libelleMois(mois, true)}`;
  const h = { Authorization: `Bearer ${token}`, "Notion-Version": "2025-09-03", "Content-Type": "application/json" };
  const props = {
    Relevé: { title: [{ type: "text", text: { content: titre } }] },
    Date: { date: { start: `${mois}-01` } },
    "Classement national": { number: nat?.[0]?.rang ?? null },
    "Classement international": { number: inter?.[0]?.rang ?? null },
    Source: { url: SOURCES.fbfts.page },
  };
  const q = await fetch(`https://api.notion.com/v1/data_sources/${DS.classements}/query`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ filter: { property: "Relevé", title: { equals: titre } }, page_size: 1 }),
    cache: "no-store",
  });
  if (!q.ok) return `Notion ${q.status}`;
  const existant = ((await q.json()) as { results: { id: string }[] }).results[0];
  const r = existant
    ? await fetch(`https://api.notion.com/v1/pages/${existant.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ properties: props }), cache: "no-store" })
    : await fetch("https://api.notion.com/v1/pages", { method: "POST", headers: h, body: JSON.stringify({ parent: { type: "data_source_id", data_source_id: DS.classements }, properties: props }), cache: "no-store" });
  return r.ok ? null : `Notion ${r.status}`;
}

/** Full automatic run: both sources, then players and club line. */
export async function importerTout(db: SupabaseClient, par: string, forcer = false) {
  const res: { bilans: Bilan[]; erreurs: string[]; joueurs?: number; notion?: number } = { bilans: [], erreurs: [] };
  for (const [nom, f] of [["FBFTS", telechargerFbfts], ["FISTF", telechargerFistf]] as const) {
    try {
      res.bilans.push(await enregistrerLot(db, await f(), par, forcer));
    } catch (e) {
      res.erreurs.push(`${nom} : ${e instanceof Error ? e.message : "erreur"}`);
    }
  }
  if (res.bilans.some((b) => !b.deja)) {
    const m = await majJoueurs(db);
    res.joueurs = m.joueurs;
    res.notion = m.notion;
    if (m.erreur) res.erreurs.push(`Notion (joueurs) : ${m.erreur}`);
    const c = await majClassementClub(db);
    if (c) res.erreurs.push(`Notion (classement du club) : ${c}`);
  }
  return res;
}
