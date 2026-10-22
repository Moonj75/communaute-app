"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { majCagnotteNotion } from "@/lib/club";
import { journaliser, recalculer, soldeDe } from "@/lib/cagnotte-db";
import { arrondi, euro, montantTache, type Bareme, type Mouvement, type Unite } from "@/lib/cagnotte";
import { deposer } from "@/lib/courrier";

export type RetourCagnotte = { ok: boolean; message: string; montant?: number | null };
type Ligne = { notion_id: string; email: string | null; prenom: string | null; nom: string; cagnotte: number | null; cagnotte_groupe?: string | null };

const nomGroupe = (t: string) => String(t || "").replace(/\s+/g, " ").trim().slice(0, 80);
const nombre = (s: unknown) => {
  const brut = String(s ?? "").replace(/[€\s]/g, "").replace(",", ".");
  if (brut === "") return null;
  const n = Number(brut);
  return Number.isFinite(n) && Math.abs(n) <= 100000 ? arrondi(n) : NaN;
};
/** Optional link to an event (calendar / internal competition). */
const lien = (e?: { id: string; nom: string } | null) => (e && e.id ? { evenement_id: String(e.id).slice(0, 80), evenement: String(e.nom || "").slice(0, 120) } : {});
const jour = (d: unknown) => (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : new Date().toISOString().slice(0, 10));
const expliquer = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return /cag_mouvements|cag_bareme|schema cache|does not exist/.test(m) ? "Lance d'abord le script Supabase « etape17-cagnotte-historique »." : /cagnotte_groupe/.test(m) ? "Lance d'abord le script Supabase « etape15-cagnotte-commune »." : m;
};

async function admin() {
  const { supabase, user, profil } = await getSessionProfil();
  if (profil?.role !== "admin" || !user?.email) throw new Error("Réservé aux administrateurs.");
  return { supabase, qui: [profil.prenom, profil.nom].filter(Boolean).join(" ") || user.email };
}
type DB = Awaited<ReturnType<typeof admin>>["supabase"];
async function tous(supabase: DB): Promise<Ligne[]> {
  const { data, error } = await supabase.from("joueurs").select("notion_id,email,prenom,nom,cagnotte,cagnotte_groupe");
  if (error) throw new Error(error.message);
  return (data || []) as Ligne[];
}
const fini = (message: string, montant?: number | null): RetourCagnotte => {
  revalidatePath("/admin");
  revalidatePath("/fiche");
  return { ok: true, message, montant };
};
const rate = (e: unknown): RetourCagnotte => ({ ok: false, message: expliquer(e) });

/** Writes a movement, its copy in Notion, the new balances, and tells the member(s). */
async function ajouter(supabase: DB, lignes: Partial<Mouvement>[], liste: Ligne[], avis?: (m: Mouvement) => { titre: string; texte: string } | null) {
  const { data, error } = await supabase.from("cag_mouvements").insert(lignes).select("*");
  if (error) throw new Error(error.message);
  const faits = (data || []) as Mouvement[];
  await recalculer(supabase, [...new Set(faits.map((m) => m.joueur_id))]);
  for (const m of faits) {
    const j = liste.find((x) => x.notion_id === m.joueur_id);
    await journaliser(supabase, m, j?.cagnotte_groupe || null);
    const a = avis?.(m);
    if (a && j?.email) { try { await deposer(supabase, [j.email], { type: "notification", titre: a.titre, texte: a.texte, lien: "/fiche" }); } catch { /* the movement is saved anyway */ } }
  }
  return faits;
}

/* ------------------------------------------------------------------ amounts */

/**
 * The staff types the balance a kitty should have: the difference is written as a « manual adjustment »
 * (the history stays complete).
 */
export async function enregistrerCagnotte(notionId: string, texte: string): Promise<RetourCagnotte> {
  try {
    const { supabase, qui } = await admin();
    const v = nombre(texte);
    if (Number.isNaN(v)) return { ok: false, message: "Montant invalide (ex. 12,50)." };
    const cible = v ?? 0;
    const avant = await soldeDe(supabase, notionId);
    const diff = arrondi(cible - avant);
    if (!diff) return fini("✓ Rien à changer", cible);
    const liste = await tous(supabase);
    await ajouter(supabase, [{ joueur_id: notionId, sens: diff > 0 ? "gain" : "depense", categorie: "Ajustement", montant: Math.abs(diff), libelle: "Ajustement manuel du solde", statut: "valide", valide_par: qui, valide_le: new Date().toISOString(), date: jour(null) }], liste);
    return fini(`✓ Solde : ${euro.format(cible)}`, cible);
  } catch (e) {
    return rate(e);
  }
}

/** Gains (admins only): a task of the scale × quantity (times, hours, yearly flat rate), for one or several members. */
export async function attribuerGains(p: { baremeId: string | null; libelle: string; quantite: string; taux?: string; ids: string[]; date: string; evenement?: { id: string; nom: string } | null }): Promise<RetourCagnotte> {
  try {
    const { supabase, qui } = await admin();
    const ids = [...new Set((p.ids || []).map(String))].slice(0, 200);
    if (!ids.length) return { ok: false, message: "Choisis au moins un membre." };
    let b: Bareme | null = null;
    if (p.baremeId) {
      const { data } = await supabase.from("cag_bareme").select("*").eq("id", p.baremeId).maybeSingle();
      b = (data as Bareme | null) || null;
      if (!b) return { ok: false, message: "Tâche introuvable dans le barème." };
    }
    const q = nombre(p.quantite || "1");
    if (q == null || Number.isNaN(q) || q <= 0) return { ok: false, message: b?.unite === "heure" ? "Indique le nombre d'heures." : "Indique la quantité." };
    const taux = b ? Number(b.taux) : nombre(p.taux);
    if (taux == null || Number.isNaN(taux) || taux <= 0) return { ok: false, message: "Indique le montant." };
    const montant = b ? montantTache(taux, q) : arrondi(taux * q);
    const unite: Unite | null = b ? b.unite : null;
    const libelle = String(p.libelle || "").trim().slice(0, 120) || b?.nom || "Gain";
    const liste = await tous(supabase);
    const date = jour(p.date);
    await ajouter(supabase, ids.map((id) => ({ joueur_id: id, sens: "gain" as const, categorie: b?.nom || "Autre gain", bareme_id: b?.id || null, quantite: q, unite, taux, montant, libelle, statut: "valide" as const, valide_par: qui, valide_le: new Date().toISOString(), date, ...lien(p.evenement) })), liste,
      () => ({ titre: `💰 +${euro.format(montant)} dans ta cagnotte`, texte: `${libelle} : ${euro.format(montant)} ajoutés à ta cagnotte.` }));
    return fini(`✓ ${euro.format(montant)} attribués à ${ids.length} membre${ids.length > 1 ? "s" : ""} (${libelle}).`);
  } catch (e) {
    return rate(e);
  }
}

/** An expense written by the staff (validated at once). Not below zero unless « forcer ». */
export async function ajouterDepense(p: { joueurId: string; categorie: string; montant: string; libelle: string; date: string; forcer: boolean; evenement?: { id: string; nom: string } | null }): Promise<RetourCagnotte> {
  try {
    const { supabase, qui } = await admin();
    const montant = nombre(p.montant);
    if (montant == null || Number.isNaN(montant) || montant <= 0) return { ok: false, message: "Montant invalide." };
    const s = await soldeDe(supabase, p.joueurId);
    if (s - montant < 0 && !p.forcer) return { ok: false, message: `Solde insuffisant (${euro.format(s)}). Coche « autoriser un solde négatif » pour forcer.` };
    const liste = await tous(supabase);
    const categorie = String(p.categorie || "Autre dépense").slice(0, 60);
    const libelle = String(p.libelle || "").trim().slice(0, 120) || categorie;
    await ajouter(supabase, [{ joueur_id: p.joueurId, sens: "depense", categorie, montant, libelle, statut: "valide", valide_par: qui, valide_le: new Date().toISOString(), date: jour(p.date), ...lien(p.evenement) }], liste,
      () => ({ titre: `💸 −${euro.format(montant)} sur ta cagnotte`, texte: `${libelle} : ${euro.format(montant)} payés avec ta cagnotte.` }));
    return fini(`✓ Dépense enregistrée : ${euro.format(montant)}.`);
  } catch (e) {
    return rate(e);
  }
}

/** Validates (or refuses) an expense asked by a player. Not below zero unless « forcer ». */
export async function validerMouvement(id: string, accepter: boolean, motif = "", forcer = false): Promise<RetourCagnotte> {
  try {
    const { supabase, qui } = await admin();
    const { data } = await supabase.from("cag_mouvements").select("*").eq("id", id).maybeSingle();
    const m = data as (Mouvement & { notion_id: string | null }) | null;
    if (!m) return { ok: false, message: "Demande introuvable." };
    if (m.statut !== "en_attente") return { ok: false, message: "Cette demande est déjà traitée." };
    if (accepter && m.sens === "depense") {
      const s = await soldeDe(supabase, m.joueur_id);
      if (s - Number(m.montant) < 0 && !forcer) return { ok: false, message: `Solde insuffisant (${euro.format(s)}). Coche « autoriser un solde négatif » pour forcer.` };
    }
    const maj = { statut: accepter ? "valide" : "refuse", valide_par: qui, valide_le: new Date().toISOString(), motif: String(motif || "").slice(0, 200) || null };
    const { error } = await supabase.from("cag_mouvements").update(maj).eq("id", id);
    if (error) return { ok: false, message: error.message };
    await recalculer(supabase, [m.joueur_id]);
    const liste = await tous(supabase);
    const j = liste.find((x) => x.notion_id === m.joueur_id);
    await journaliser(supabase, { ...m, ...maj } as Mouvement, j?.cagnotte_groupe || null, m.notion_id);
    if (j?.email) {
      try {
        await deposer(supabase, [j.email], accepter
          ? { type: "notification", titre: `✅ Cagnotte : ${m.libelle} validé (−${euro.format(Number(m.montant))})`, texte: `Ta demande « ${m.libelle} » est validée : ${euro.format(Number(m.montant))} payés avec ta cagnotte.`, lien: "/fiche" }
          : { type: "notification", titre: `❌ Cagnotte : ${m.libelle} refusé`, texte: `Ta demande « ${m.libelle} » (${euro.format(Number(m.montant))}) n'a pas été acceptée.${maj.motif ? ` Motif : ${maj.motif}` : ""}`, lien: "/fiche" });
      } catch { /* the decision is saved anyway */ }
    }
    return fini(accepter ? "✓ Demande validée." : "✓ Demande refusée.");
  } catch (e) {
    return rate(e);
  }
}

/** Cancels a validated movement entered by mistake (kept in the history, marked « refusé »). */
export async function annulerMouvement(id: string): Promise<RetourCagnotte> {
  try {
    const { supabase, qui } = await admin();
    const { data } = await supabase.from("cag_mouvements").select("*").eq("id", id).maybeSingle();
    const m = data as (Mouvement & { notion_id: string | null }) | null;
    if (!m) return { ok: false, message: "Mouvement introuvable." };
    const maj = { statut: "refuse", valide_par: qui, valide_le: new Date().toISOString(), motif: "Annulé par le staff" };
    await supabase.from("cag_mouvements").update(maj).eq("id", id);
    await recalculer(supabase, [m.joueur_id]);
    const liste = await tous(supabase);
    await journaliser(supabase, { ...m, ...maj } as Mouvement, liste.find((x) => x.notion_id === m.joueur_id)?.cagnotte_groupe || null, m.notion_id);
    return fini("✓ Mouvement annulé.");
  } catch (e) {
    return rate(e);
  }
}

/** The scale of the tasks (name, icon, unit, rate). Tasks removed are only hidden (the history keeps them). */
export async function enregistrerBareme(items: { id?: string; nom: string; ic: string; unite: Unite; taux: string; actif: boolean }[]): Promise<RetourCagnotte> {
  try {
    const { supabase } = await admin();
    for (const [i, x] of items.slice(0, 60).entries()) {
      const nom = String(x.nom || "").trim().slice(0, 80);
      if (!nom) continue;
      const taux = nombre(x.taux);
      const ligne = { nom, ic: String(x.ic || "⭐").slice(0, 8), unite: (["fois", "heure", "forfait"].includes(x.unite) ? x.unite : "heure") as Unite, taux: taux == null || Number.isNaN(taux) ? 0 : Math.max(0, taux), actif: x.actif !== false, ordre: i + 1 };
      const r = x.id ? await supabase.from("cag_bareme").update(ligne).eq("id", x.id) : await supabase.from("cag_bareme").insert(ligne);
      if (r.error) return { ok: false, message: expliquer(r.error) };
    }
    return fini("✓ Barème enregistré.");
  } catch (e) {
    return rate(e);
  }
}

/* ------------------------------------------------------------------ shared kitties */

/** Writes the shared kitty's name (Notion « Cagnotte commune » and the app); the balances follow from the history. */
async function nommer(supabase: DB, ids: string[], groupe: string | null) {
  for (const id of ids) {
    const { data } = await supabase.from("joueurs").select("cagnotte").eq("notion_id", id).maybeSingle();
    await majCagnotteNotion(id, (data?.cagnotte as number | null) ?? null, groupe);
    const { error } = await supabase.from("joueurs").update({ cagnotte_groupe: groupe || null }).eq("notion_id", id);
    if (error) throw new Error(error.message);
  }
}

/** Groups kitties under one name: their histories add up. */
export async function regrouperCagnottes(ids: string[], nom: string): Promise<RetourCagnotte> {
  try {
    const { supabase } = await admin();
    const groupe = nomGroupe(nom);
    if (!groupe) return { ok: false, message: "Donne un nom à la cagnotte commune (ex. Famille Devreese)." };
    const l = await tous(supabase);
    const choisis = l.filter((x) => ids.includes(x.notion_id));
    if (choisis.some((x) => x.cagnotte_groupe && x.cagnotte_groupe !== groupe)) return { ok: false, message: "Un des membres est déjà dans une autre cagnotte commune : retire-le d'abord." };
    const deja = l.filter((x) => x.cagnotte_groupe === groupe);
    const nouveaux = choisis.filter((x) => x.cagnotte_groupe !== groupe);
    if (deja.length + nouveaux.length < 2) return { ok: false, message: "Il faut au moins 2 membres pour une cagnotte commune." };
    await nommer(supabase, nouveaux.map((x) => x.notion_id), groupe);
    await recalculer(supabase, [...deja, ...nouveaux].map((x) => x.notion_id));
    return fini(`✓ Cagnotte commune « ${groupe} »`);
  } catch (e) {
    return rate(e);
  }
}

/** A member leaves the shared kitty: he takes his own gains and expenses with him. */
export async function quitterCagnotte(notionId: string): Promise<RetourCagnotte> {
  try {
    const { supabase } = await admin();
    const l = await tous(supabase);
    const moi = l.find((x) => x.notion_id === notionId);
    if (!moi?.cagnotte_groupe) return { ok: false, message: "Ce membre a déjà sa propre cagnotte." };
    const reste = l.filter((x) => x.cagnotte_groupe === moi.cagnotte_groupe && x.notion_id !== notionId);
    await nommer(supabase, [notionId], null);
    // Alone in the group: he gets his own kitty back.
    if (reste.length === 1) await nommer(supabase, [reste[0].notion_id], null);
    await recalculer(supabase, [notionId, ...reste.map((x) => x.notion_id)]);
    return fini("✓ Retiré de la cagnotte commune");
  } catch (e) {
    return rate(e);
  }
}

/** Renames a shared kitty. */
export async function renommerCagnotte(ancien: string, nouveau: string): Promise<RetourCagnotte> {
  try {
    const { supabase } = await admin();
    const groupe = nomGroupe(nouveau);
    if (!groupe) return { ok: false, message: "Nom vide." };
    const l = await tous(supabase);
    if (l.some((x) => x.cagnotte_groupe === groupe)) return { ok: false, message: "Ce nom est déjà utilisé." };
    const membres = l.filter((x) => x.cagnotte_groupe === ancien);
    if (!membres.length) return { ok: false, message: "Cagnotte introuvable." };
    await nommer(supabase, membres.map((x) => x.notion_id), groupe);
    return fini(`✓ Renommée « ${groupe} »`);
  } catch (e) {
    return rate(e);
  }
}

/** Ends a shared kitty: everybody gets his own kitty again, with his own gains and expenses. */
export async function dissoudreCagnotte(nom: string): Promise<RetourCagnotte> {
  try {
    const { supabase } = await admin();
    const membres = (await tous(supabase)).filter((x) => x.cagnotte_groupe === nom);
    if (!membres.length) return { ok: false, message: "Cagnotte introuvable." };
    await nommer(supabase, membres.map((x) => x.notion_id), null);
    await recalculer(supabase, membres.map((x) => x.notion_id));
    return fini("✓ Cagnotte commune séparée");
  } catch (e) {
    return rate(e);
  }
}
