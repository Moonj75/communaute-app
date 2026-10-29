"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { creerEvenement, creerFiche, creerTache, lireCalendrier, majEvenement, modifierTache, TAGS } from "@/lib/club";
import { COMPETITIONS_EV, DECISIONS, DEPLACEMENTS, PRIORITES_EV, TYPES_EV, type EvSaisie } from "@/lib/evenements-types";
import { PRIORITES } from "@/lib/club-types";

export type Retour = { ok: boolean; message?: string };

async function exigerAdmin() {
  const { profil } = await getSessionProfil();
  if (profil?.role !== "admin") throw new Error("Réservé aux administrateurs.");
}

function erreur(e: unknown): Retour {
  return { ok: false, message: e instanceof Error ? e.message : "Erreur inconnue." };
}

export async function rafraichir(): Promise<Retour> {
  try {
    await exigerAdmin();
    Object.values(TAGS).forEach((t) => revalidateTag(t));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return erreur(e);
  }
}

export async function changerStatut(id: string, statut: string): Promise<Retour> {
  try {
    await exigerAdmin();
    await modifierTache(id, { statut });
    revalidateTag(TAGS.taches);
    return { ok: true };
  } catch (e) {
    return erreur(e);
  }
}

export async function changerEcheance(id: string, echeance: string | null): Promise<Retour> {
  try {
    await exigerAdmin();
    if (echeance && !/^\d{4}-\d{2}-\d{2}$/.test(echeance)) return { ok: false, message: "Date invalide." };
    await modifierTache(id, { echeance });
    revalidateTag(TAGS.taches);
    return { ok: true };
  } catch (e) {
    return erreur(e);
  }
}

export async function ajouterTache(_prev: Retour | null, fd: FormData): Promise<Retour> {
  try {
    await exigerAdmin();
    const titre = String(fd.get("titre") || "").trim().slice(0, 200);
    if (!titre) return { ok: false, message: "Donne un titre à la tâche." };
    const echeance = String(fd.get("echeance") || "") || null;
    if (echeance && !/^\d{4}-\d{2}-\d{2}$/.test(echeance)) return { ok: false, message: "Date invalide." };
    const p = String(fd.get("priorite") || "Normal");
    const rappel = fd.get("rappel") === "on";
    const ev = String(fd.get("evenement") || "") || null;
    await creerTache({
      titre,
      echeance,
      priorite: PRIORITES.includes(p) ? p : "Normal",
      type: rappel ? "⏰ Rappel" : null,
      evenementId: ev && /^[0-9a-f-]{32,36}$/i.test(ev) ? ev : null,
    });
    revalidateTag(TAGS.taches);
    return { ok: true, message: rappel ? "Rappel ajouté dans Notion ✓" : "Tâche ajoutée dans Notion ✓" };
  } catch (e) {
    return erreur(e);
  }
}

/**
 * Players concerned by a competition's form. Every active player ticked (or none) = default
 * (no list); otherwise only the ticked players can answer, the others count as « Non ».
 */
export async function enregistrerConcernes(evId: string, ids: string[], tousActifs: number): Promise<Retour> {
  try {
    await exigerAdmin();
    const { supabase } = await getSessionProfil();
    const propres = [...new Set(ids.filter((x) => typeof x === "string" && x.length < 80))];
    const { error: e1 } = await supabase.from("formulaire_joueurs").delete().eq("evenement_id", evId);
    if (e1) return { ok: false, message: "La table « formulaire_joueurs » n'existe pas encore : lance le fichier SQL de l'étape 10 dans Supabase." };
    if (propres.length && propres.length < tousActifs) {
      const { error } = await supabase.from("formulaire_joueurs").insert(propres.map((j) => ({ evenement_id: evId, joueur_id: j })));
      if (error) return { ok: false, message: "Enregistrement impossible, réessaie." };
    }
    revalidatePath("/staff/inscriptions");
    revalidatePath("/inscriptions");
    return { ok: true, message: propres.length && propres.length < tousActifs ? `✓ Formulaire réservé à ${propres.length} joueur(s). Les autres comptent « Non ».` : "✓ Formulaire ouvert à tous les joueurs actifs." };
  } catch (e) {
    return erreur(e);
  }
}


/**
 * Staff: creates an event of the calendar from the app (every field of Notion « Calendrier Déplacements »),
 * or completes / corrects one (id given). A competition the club goes to also gets its logistics sheet.
 */
export async function enregistrerEvenement(fd: FormData): Promise<Retour & { id?: string }> {
  try {
    await exigerAdmin();
    const v = (k: string, n = 200) => String(fd.get(k) || "").replace(/\s+/g, " ").trim().slice(0, n);
    const jour = (k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v(k)) ? v(k) : null);
    const parmi = <T extends readonly string[]>(k: string, l: T) => ((l as readonly string[]).includes(v(k)) ? v(k) : null);
    const e: EvSaisie = {
      nom: v("nom", 150),
      type: parmi("type", TYPES_EV) || "Compétition",
      competition: parmi("competition", COMPETITIONS_EV),
      date: jour("date") || "",
      fin: jour("fin"),
      lieu: v("lieu", 120) || null,
      deplacement: parmi("deplacement", DEPLACEMENTS),
      decision: parmi("decision", DECISIONS),
      priorite: fd.getAll("priorite").map(String).filter((x) => (PRIORITES_EV as readonly string[]).includes(x)),
      ouverture: jour("ouverture"),
      limite: jour("limite"),
      validation: jour("validation"),
      covoiturage: fd.get("covoiturage") === "on",
      notes: v("notes", 1500) || null,
    };
    if (!e.nom) return { ok: false, message: "Donne un nom à l'évènement." };
    if (!e.date) return { ok: false, message: "Indique la date de l'évènement." };
    if (e.ouverture && e.limite && e.limite < e.ouverture) return { ok: false, message: "La date limite doit venir après l'ouverture des inscriptions." };
    if (e.limite && e.validation && e.validation < e.limite) return { ok: false, message: "La validation doit venir après la date limite de réponse." };
    const id = v("id", 60);
    let pageId = id;
    if (id) {
      const avant = (await lireCalendrier()).find((x) => x.id === id);
      await majEvenement(id, e, Boolean(avant && avant.nom === e.nom));
    } else pageId = await creerEvenement(e);
    // A competition the club goes to gets its logistics sheet (once).
    if (fd.get("fiche") === "on" && pageId) await creerFiche(pageId, e.nom).catch(() => null);
    Object.values(TAGS).forEach((t) => revalidateTag(t));
    revalidatePath("/", "layout");
    return { ok: true, id: pageId, message: id ? `✓ « ${e.nom} » mis à jour dans Notion.` : `✓ « ${e.nom} » ajouté au calendrier (Notion).` };
  } catch (e) {
    return erreur(e);
  }
}
