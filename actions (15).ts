"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { clientAdmin } from "@/lib/supabase/admin";
import { enregistrerLot, importerTout, lireFbfts, lireFistf, majClassementClub, majJoueurs, moisDepuisNomFistf } from "@/lib/classements";
import { libelleMois } from "@/lib/classements-types";
import { TAGS } from "@/lib/club";

export type RetourImport = { ok: boolean; message: string };

function rafraichir() {
  revalidateTag(TAGS.club);
  revalidatePath("/club/classements");
  revalidatePath("/staff/classements");
  revalidatePath("/fiche");
}

async function contexte() {
  const { supabase, profil, user } = await getSessionProfil();
  if (profil?.role !== "admin") return null;
  // The secret key is not required here: an administrator may write the rankings himself.
  return { db: clientAdmin() || supabase, par: user?.email || "staff" };
}

/** « Vérifier maintenant » : downloads both files from the federations' websites. */
export async function importerMaintenant(_p: RetourImport | null, fd: FormData): Promise<RetourImport> {
  const c = await contexte();
  if (!c) return { ok: false, message: "Réservé aux administrateurs." };
  const r = await importerTout(c.db, c.par, fd.get("forcer") === "1");
  rafraichir();
  const lignes = r.bilans.map((b) =>
    b.deja ? `${b.source.toUpperCase()} : déjà à jour (${libelleMois(b.mois, true)})` : `${b.source.toUpperCase()} ${libelleMois(b.mois, true)} : ${b.lignes} lignes, ${b.reconnus} joueurs du club reconnus`,
  );
  if (r.notion) lignes.push(`Notion : ${r.notion} fiche(s) mises à jour`);
  return { ok: r.erreurs.length === 0, message: [...lignes, ...r.erreurs].join(" · ") || "Rien à faire." };
}

/** Manual fallback: the staff uploads the file downloaded from the website. */
export async function envoyerFichier(_p: RetourImport | null, fd: FormData): Promise<RetourImport> {
  const c = await contexte();
  if (!c) return { ok: false, message: "Réservé aux administrateurs." };
  const f = fd.get("fichier");
  if (!(f instanceof File) || !f.size) return { ok: false, message: "Choisis le fichier Excel." };
  if (f.size > 2_800_000) return { ok: false, message: "Fichier trop lourd (3 Mo maximum)." };
  const source = String(fd.get("source") || "");
  const buf = await f.arrayBuffer();
  try {
    let lot;
    if (source === "fistf") {
      const mois = moisDepuisNomFistf(f.name) || String(fd.get("mois") || "");
      if (!/^\d{4}-\d{2}$/.test(mois)) return { ok: false, message: "Indique le mois du classement." };
      lot = lireFistf(buf, mois);
    } else {
      const mois = String(fd.get("mois") || "");
      if (!/^\d{4}-\d{2}$/.test(mois)) return { ok: false, message: "Indique le mois du classement (titre de la page FBFTS)." };
      lot = lireFbfts(buf, mois);
    }
    const b = await enregistrerLot(c.db, lot, c.par, true);
    const m = await majJoueurs(c.db);
    const err = (await majClassementClub(c.db)) || m.erreur;
    rafraichir();
    return {
      ok: !err,
      message: `${lot.libelle} : ${b.lignes} lignes importées, ${b.reconnus} joueurs du club reconnus${m.notion ? `, ${m.notion} fiche(s) Notion mises à jour` : ""}.${err ? ` ⚠️ ${err}` : ""}`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Lecture du fichier impossible." };
  }
}
