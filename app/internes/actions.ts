"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";
import { clientAdmin } from "@/lib/supabase/admin";
import { avancerVainqueur, suite } from "@/lib/internes-db";
import { memeScore, type Match, type Proposition } from "@/lib/internes";
import { deposer } from "@/lib/courrier";
import { pousser, pushPret, type Abonnement } from "@/lib/push";

export type RetourScore = { ok: boolean; message: string; valide?: boolean };

/**
 * A player types the score of one of his own matches (his goals, the opponent's goals).
 * When the opponent typed the same score, the match is validated by itself (standings, next stage…);
 * otherwise it waits for the opponent — or for the staff when the two scores differ.
 */
export async function proposerScore(matchId: string, joueurId: string, mesButs: number, sesButs: number, vainqueur: string | null = null): Promise<RetourScore> {
  try {
    const { supabase, user, profil } = await getSessionProfil();
    if (!user?.email) return { ok: false, message: "Reconnecte-toi." };
    const db = clientAdmin();
    if (!db) return { ok: false, message: "La saisie par les joueurs n'est pas encore configurée (clé serveur absente)." };

    // The player must belong to this account (a parent can type for his child).
    const { data: fiche } = await supabase.from("joueurs").select("notion_id,prenom,nom").eq("notion_id", joueurId).eq("email", user.email.toLowerCase()).maybeSingle();
    if (!fiche && profil?.role !== "admin") return { ok: false, message: "Ce joueur ne fait pas partie de ton compte." };

    const { data: brut } = await db.from("ci_matchs").select("*").eq("id", matchId).maybeSingle();
    const m = brut as Match | null;
    if (!m) return { ok: false, message: "Match introuvable." };
    if (m.a !== joueurId && m.b !== joueurId) return { ok: false, message: "Tu ne joues pas ce match." };
    if (m.joue) return { ok: false, message: "Ce match est déjà validé." };
    const { data: c } = await db.from("ci_competitions").select("etape,statut,nom").eq("id", m.competition_id).single();
    if (!c || c.statut !== "en_cours" || c.etape !== m.etape) return { ok: false, message: "Cette étape est terminée." };

    const moi = Math.max(0, Math.min(99, Math.round(Number(mesButs)))), lui = Math.max(0, Math.min(99, Math.round(Number(sesButs))));
    if (Number.isNaN(moi) || Number.isNaN(lui)) return { ok: false, message: "Entre les deux scores." };
    const jeSuisA = m.a === joueurId;
    const ko = m.tour != null;
    if (ko && moi === lui && vainqueur !== m.a && vainqueur !== m.b) return { ok: false, message: "Match nul : indique qui passe (prolongations ou tirs)." };
    const prop: Proposition = { a: jeSuisA ? moi : lui, b: jeSuisA ? lui : moi, v: ko && moi === lui ? vainqueur : null, le: new Date().toISOString() };
    const autre = jeSuisA ? m.prop_b : m.prop_a;

    if (memeScore(prop, autre)) {
      // Both players agree: the match is validated.
      const maj = { buts_a: prop.a, buts_b: prop.b, vainqueur: prop.v, joue: true, prop_a: null, prop_b: null, maj_le: new Date().toISOString() };
      const { error } = await db.from("ci_matchs").update(maj).eq("id", matchId);
      if (error) return { ok: false, message: error.message };
      if (ko) await avancerVainqueur(db, m.competition_id, m.etape, { ...m, ...maj });
      const info = await suite(db, m.competition_id);
      revalidatePath("/internes");
      revalidatePath("/staff/internes", "layout");
      return { ok: true, valide: true, message: info || "✅ Les deux scores sont identiques : le match est validé et le classement est à jour !" };
    }

    const { error } = await db.from("ci_matchs").update(jeSuisA ? { prop_a: prop } : { prop_b: prop }).eq("id", matchId);
    if (error) return { ok: false, message: /prop_/.test(error.message) ? "Lance d'abord le script Supabase « etape13 » (mis à jour)." : error.message };

    // Tell the opponent (mailbox + phone) so that he confirms.
    const adversaire = jeSuisA ? m.b : m.a;
    const monNom = [fiche?.prenom, fiche?.nom].filter(Boolean).join(" ") || "Ton adversaire";
    if (adversaire && !autre) {
      try {
        const { data: lui2 } = await db.from("joueurs").select("email").eq("notion_id", adversaire).maybeSingle();
        const email = (lui2?.email || "").toLowerCase();
        if (email) {
          const titre = `⚔️ Score à confirmer : ${monNom}`;
          const texte = `${monNom} a entré le score de votre match (${c.nom}) : ${moi} – ${lui} pour lui. Confirme-le dans « Mes matchs ».`;
          await deposer(db, [email], { type: "notification", titre, texte, lien: "/internes#bloc-mes-matchs" });
          if (pushPret()) {
            const { data: subs } = await db.from("push_abonnements").select("endpoint,email,p256dh,auth").eq("email", email);
            await pousser(db, (subs || []) as Abonnement[], [email], { title: titre, body: texte, url: "/internes#bloc-mes-matchs", tag: `score-${m.id}` });
          }
        }
      } catch { /* the score is saved anyway */ }
    }
    revalidatePath("/internes");
    revalidatePath("/staff/internes", "layout");
    return {
      ok: true,
      message: autre ? "⚠️ Ton score est différent de celui de ton adversaire : le staff va trancher (ou corrigez-le ensemble)." : "⏳ Score enregistré : il sera validé dès que ton adversaire aura mis le même score.",
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
}
