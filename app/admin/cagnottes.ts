"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { majCagnotteNotion } from "@/lib/club";

export type RetourCagnotte = { ok: boolean; message: string; montant?: number | null };
type Ligne = { notion_id: string; cagnotte: number | null; cagnotte_groupe?: string | null };

const arrondi = (n: number) => Math.round(n * 100) / 100;
const nomGroupe = (t: string) => String(t || "").replace(/\s+/g, " ").trim().slice(0, 80);
const lire = (s: string) => {
  const brut = String(s || "").replace(/[€\s]/g, "").replace(",", ".");
  if (brut === "") return { ok: true as const, montant: null };
  const n = Number(brut);
  if (!Number.isFinite(n) || Math.abs(n) > 100000) return { ok: false as const, montant: null };
  return { ok: true as const, montant: arrondi(n) };
};

async function admin() {
  const { supabase, profil } = await getSessionProfil();
  if (profil?.role !== "admin") throw new Error("Réservé aux administrateurs.");
  return supabase;
}
async function tous(supabase: Awaited<ReturnType<typeof admin>>): Promise<Ligne[]> {
  const { data, error } = await supabase.from("joueurs").select("notion_id,cagnotte,cagnotte_groupe");
  if (error) throw new Error(/cagnotte_groupe/.test(error.message) ? "Lance d'abord le script Supabase « etape15-cagnotte-commune »." : error.message);
  return (data || []) as Ligne[];
}
/** Writes the amount (and the shared kitty's name) in Notion, then in the app, for each member given. */
async function ecrire(supabase: Awaited<ReturnType<typeof admin>>, ids: string[], montant: number | null, groupe?: string | null) {
  for (const id of ids) {
    await majCagnotteNotion(id, montant, groupe);
    const patch: Record<string, unknown> = { cagnotte: montant };
    if (groupe !== undefined) patch.cagnotte_groupe = groupe || null;
    const { error } = await supabase.from("joueurs").update(patch).eq("notion_id", id);
    if (error) throw new Error("Enregistré dans Notion ; lance « Synchroniser » (" + error.message + ").");
  }
}
const fini = (message: string, montant?: number | null): RetourCagnotte => {
  revalidatePath("/admin");
  revalidatePath("/fiche");
  return { ok: true, message, montant };
};
const rate = (e: unknown): RetourCagnotte => ({ ok: false, message: e instanceof Error ? e.message : "Enregistrement impossible." });

/**
 * The staff types a kitty's amount (« 12,50 »): written in Notion (the reference) and in the app.
 * For a shared kitty, every member gets the same amount.
 */
export async function enregistrerCagnotte(notionId: string, texte: string): Promise<RetourCagnotte> {
  try {
    const supabase = await admin();
    const v = lire(texte);
    if (!v.ok) return { ok: false, message: "Montant invalide (ex. 12,50)." };
    const l = await tous(supabase).catch(async () => {
      const { data } = await supabase.from("joueurs").select("notion_id,cagnotte");
      return (data || []) as Ligne[];
    });
    const moi = l.find((x) => x.notion_id === notionId);
    if (!moi) return { ok: false, message: "Membre introuvable." };
    const ids = moi.cagnotte_groupe ? l.filter((x) => x.cagnotte_groupe === moi.cagnotte_groupe).map((x) => x.notion_id) : [notionId];
    await ecrire(supabase, ids, v.montant);
    return fini("✓ Enregistré", v.montant);
  } catch (e) {
    return rate(e);
  }
}

/** Groups own kitties (and/or adds them to an existing shared kitty) under one name: the amounts are added up. */
export async function regrouperCagnottes(ids: string[], nom: string): Promise<RetourCagnotte> {
  try {
    const supabase = await admin();
    const groupe = nomGroupe(nom);
    if (!groupe) return { ok: false, message: "Donne un nom à la cagnotte commune (ex. Famille Devreese)." };
    const l = await tous(supabase);
    const choisis = l.filter((x) => ids.includes(x.notion_id));
    if (choisis.some((x) => x.cagnotte_groupe && x.cagnotte_groupe !== groupe)) return { ok: false, message: "Un des membres est déjà dans une autre cagnotte commune : retire-le d'abord." };
    const deja = l.filter((x) => x.cagnotte_groupe === groupe);
    const nouveaux = choisis.filter((x) => x.cagnotte_groupe !== groupe);
    if (deja.length + nouveaux.length < 2) return { ok: false, message: "Il faut au moins 2 membres pour une cagnotte commune." };
    // Total = the shared kitty once (if it exists) + each new member's own kitty.
    const total = arrondi((deja[0] ? Number(deja[0].cagnotte) || 0 : 0) + nouveaux.reduce((s, x) => s + (Number(x.cagnotte) || 0), 0));
    await ecrire(supabase, [...deja, ...nouveaux].map((x) => x.notion_id), total, groupe);
    return fini(`✓ Cagnotte commune « ${groupe} » : ${total.toFixed(2).replace(".", ",")} €`, total);
  } catch (e) {
    return rate(e);
  }
}

/** A member leaves the shared kitty and gets his own kitty again (starting at the amount given, 0 by default). */
export async function quitterCagnotte(notionId: string, texte = ""): Promise<RetourCagnotte> {
  try {
    const supabase = await admin();
    const v = lire(texte);
    if (!v.ok) return { ok: false, message: "Montant invalide." };
    const l = await tous(supabase);
    const moi = l.find((x) => x.notion_id === notionId);
    if (!moi?.cagnotte_groupe) return { ok: false, message: "Ce membre a déjà sa propre cagnotte." };
    await ecrire(supabase, [notionId], v.montant, null);
    // Alone in the group: he gets his own kitty back, with the amount.
    const reste = l.filter((x) => x.cagnotte_groupe === moi.cagnotte_groupe && x.notion_id !== notionId);
    if (reste.length === 1) await ecrire(supabase, [reste[0].notion_id], reste[0].cagnotte == null ? null : Number(reste[0].cagnotte), null);
    return fini("✓ Retiré de la cagnotte commune");
  } catch (e) {
    return rate(e);
  }
}

/** Renames a shared kitty. */
export async function renommerCagnotte(ancien: string, nouveau: string): Promise<RetourCagnotte> {
  try {
    const supabase = await admin();
    const groupe = nomGroupe(nouveau);
    if (!groupe) return { ok: false, message: "Nom vide." };
    const l = await tous(supabase);
    if (l.some((x) => x.cagnotte_groupe === groupe)) return { ok: false, message: "Ce nom est déjà utilisé." };
    const membres = l.filter((x) => x.cagnotte_groupe === ancien);
    if (!membres.length) return { ok: false, message: "Cagnotte introuvable." };
    await ecrire(supabase, membres.map((x) => x.notion_id), membres[0].cagnotte == null ? null : Number(membres[0].cagnotte), groupe);
    return fini(`✓ Renommée « ${groupe} »`);
  } catch (e) {
    return rate(e);
  }
}

/** Ends a shared kitty: everybody gets his own kitty again; the amount stays with the member chosen. */
export async function dissoudreCagnotte(nom: string, gardeId: string): Promise<RetourCagnotte> {
  try {
    const supabase = await admin();
    const l = await tous(supabase);
    const membres = l.filter((x) => x.cagnotte_groupe === nom);
    if (!membres.length) return { ok: false, message: "Cagnotte introuvable." };
    const montant = membres[0].cagnotte == null ? null : Number(membres[0].cagnotte);
    const garde = membres.find((x) => x.notion_id === gardeId) || membres[0];
    await ecrire(supabase, [garde.notion_id], montant, null);
    await ecrire(supabase, membres.filter((x) => x !== garde).map((x) => x.notion_id), null, null);
    return fini("✓ Cagnotte commune séparée");
  } catch (e) {
    return rate(e);
  }
}
