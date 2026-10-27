import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { creerSeance, lireSeancesPeriode, majStatutSeance } from "./club";
import { ROLES, complet, limitePassee, maintenantBxl, phase, rappelsDe, reste, vendredis, type SeanceE } from "./entrainements-types";
import { pousser, pushPret, type Abonnement, type MessagePush } from "./push";
import { deposer } from "./courrier";
import { ajouterJours } from "./club-types";

type Fiche = { notion_id: string; prenom: string | null; nom: string; email: string | null; roles: string[] | null; actif: boolean; archive?: boolean };
type Envoi = { cle: string; emails: Set<string>; msg: MessagePush };

const jourCourt = (d: string) => new Date(d.slice(0, 10) + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const heures = (s: SeanceE) => [s.debut && s.fin ? `${s.debut} – ${s.fin}` : s.debut, s.lieu].filter(Boolean).join(" · ");

/**
 * Trainings, run every hour (Supabase pg_cron) and every morning (Vercel cron, safety net):
 * - Friday before, after 21:00: each role not confirmed by its holder is offered to the substitutes;
 * - Monday from 9:00: last reminder to the people not yet validated and to the substitutes;
 * - after Monday 21:00: the session is confirmed (trainer + opener + closer validated) or cancelled,
 *   and every active member is told.
 * Each message is sent once (push_journal).
 */
export async function traiterEntrainements(db: SupabaseClient) {
  const now = maintenantBxl();
  const T = now.slice(0, 10);
  const seances = await lireSeancesPeriode(T, ajouterJours(T, 13));
  const { data: rj } = await db.from("joueurs").select("*");
  const fiches = ((rj || []) as Fiche[]).filter((f) => f.actif && !f.archive);
  const mail = (id: string) => fiches.find((f) => f.notion_id === id)?.email?.toLowerCase();
  const tousActifs = new Set(fiches.map((f) => f.email?.toLowerCase()).filter((e): e is string => Boolean(e)));
  const envois: Envoi[] = [];
  const decisions: string[] = [];

  // From the 20th: the Fridays of next month are created by themselves and the crew is invited to share them out.
  const equipe = new Set(fiches.filter((f) => ROLES.some((r) => (f.roles || []).includes(r.tag) || (f.roles || []).includes(r.supp))).map((f) => f.email?.toLowerCase()).filter((x): x is string => Boolean(x)));
  if (Number(T.slice(8, 10)) >= 20) {
    const d = new Date(`${T.slice(0, 7)}-15T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 1);
    const mois = d.toISOString().slice(0, 7);
    const jours = vendredis(mois);
    const cle = `ent-mois:${mois}`;
    const { data: fait } = await db.from("push_journal").select("cle").eq("cle", cle).maybeSingle();
    if (!fait && jours.length) {
      const deja = await lireSeancesPeriode(jours[0], jours[jours.length - 1]);
      const modele = [...seances].reverse().find((s) => s.debut || s.lieu);
      for (const j of jours) if (!deja.some((s) => s.date.slice(0, 10) === j)) await creerSeance({ date: j, debut: modele?.debut || "18h00", fin: modele?.fin || "22h00", lieu: modele?.lieu || "Eugies" });
      const nom = new Date(`${mois}-15T12:00:00Z`).toLocaleDateString("fr-BE", { month: "long", timeZone: "UTC" });
      envois.push({ cle, emails: equipe, msg: { title: `📅 Planning de ${nom} ouvert`, body: `Les ${jours.length} vendredis sont créés. Prenez vos dates (entraîneur, ouvreur, fermeur, buvette), puis publiez le planning.`, url: "/entrainements#bloc-planning", tag: `ent-mois-${mois}` } });
    }
  }

  for (const s of seances) {
    // Only the sessions of a published planning are handled automatically (substitutes, decision).
    if (s.annule || s.statut !== "Prévu" || !s.publie) continue;
    if (limitePassee(s.date, now)) {
      // Decision.
      const ok = complet(s);
      const manque = ROLES.filter((r) => r.requis && !(s.postes[r.id].ids.length && s.postes[r.id].ok)).map((r) => r.nom.toLowerCase());
      await majStatutSeance(s.id, ok ? "Confirmé" : "Annulé", ok ? null : `Rôles non validés : ${manque.join(", ")}`);
      decisions.push(`${s.date} ${ok ? "confirmé" : "annulé"}`);
      envois.push({
        cle: `ent-decision:${s.id}`,
        emails: tousActifs,
        msg: ok
          ? { title: `✅ Entraînement confirmé — ${jourCourt(s.date)}`, body: heures(s) || "À vendredi !", url: "/entrainements", tag: `ent-${s.id}` }
          : { title: `❌ Entraînement annulé — ${jourCourt(s.date)}`, body: `Il manque : ${manque.join(", ")}.`, url: "/entrainements", tag: `ent-${s.id}` },
      });
    } else {
      const ph = phase(s.date, now);
      const id2mails = (ids: string[]) => ids.map(mail).filter((x): x is string => Boolean(x));
      // Everybody of a required role validated: the four are told the session will take place.
      if (complet(s)) {
        const tous = new Set(ROLES.flatMap((r) => id2mails(s.postes[r.id].ids)));
        envois.push({ cle: `ent-complet:${s.id}`, emails: tous, msg: { title: `👍 Équipe complète — ${jourCourt(s.date)}`, body: "Entraîneur, ouvreur et fermeur ont validé : l'entraînement aura lieu (confirmation officielle lundi 21h00).", url: "/entrainements", tag: `ent-${s.id}` } });
      }
      if (ph === "suppleants") {
        // The holders' deadline (Friday before, 21:00) is past: open roles go to the substitutes.
        for (const r of ROLES) {
          const ids = s.postes[r.id].ids;
          if (s.postes[r.id].ok) continue;
          const supp = new Set(fiches.filter((f) => (f.roles || []).includes(r.supp) && !ids.includes(f.notion_id)).map((f) => f.email?.toLowerCase()).filter((x): x is string => Boolean(x)));
          envois.push({ cle: `ent-supp:${s.id}:${r.id}`, emails: supp, msg: { title: `🔁 ${r.ic} ${r.nom} recherché ${jourCourt(s.date)}`, body: `La place n'a pas été confirmée. Tu es suppléant : prends-la dans l'appli avant lundi 21h00${r.requis ? ", sinon l'entraînement sera annulé" : ""}.`, url: "/entrainements#bloc-prochain", tag: `ent-supp-${s.id}` } });
          if (ids.length) envois.push({ cle: `ent-titu:${s.id}:${r.id}`, emails: new Set(id2mails(ids)), msg: { title: `⏳ ${r.ic} ${r.nom} ${jourCourt(s.date)} : pas encore validé`, body: "Ta place est maintenant proposée aux suppléants. Tu peux encore valider tant que personne ne l'a prise (jusqu'à lundi 21h00).", url: "/entrainements#bloc-prochain", tag: `ent-titu-${s.id}` } });
        }
      }
      // Reminders more and more often as the deadline gets near: only the last slot reached (within 6 h), once each.
      const slot = rappelsDe(s.date).filter((x) => x.quand <= now && x.phase === ph).pop();
      if (slot && reste(slot.quand, now).match(/min$|^[0-5] h$/)) {
        const r2 = reste(now, slot.limite);
        const jourLim = slot.phase === "titulaires" ? "vendredi 21h00" : "lundi 21h00";
        for (const r of ROLES) {
          const p = s.postes[r.id];
          if (p.ok) continue;
          const ids = p.ids;
          let emails: Set<string>;
          let body: string;
          if (slot.phase === "titulaires") {
            if (ids.length) { emails = new Set(id2mails(ids)); body = `Tu es prévu ${r.nom.toLowerCase()} : touche « Je valide » avant ${jourLim}. Sinon ta place sera proposée aux suppléants.`; }
            else { emails = new Set(fiches.filter((f) => (f.roles || []).includes(r.tag)).map((f) => f.email?.toLowerCase()).filter((x): x is string => Boolean(x))); body = `Personne n'a encore pris le rôle ${r.nom.toLowerCase()}. Inscris-toi dans le planning avant ${jourLim}.`; }
          } else {
            emails = new Set([...id2mails(ids), ...fiches.filter((f) => (f.roles || []).includes(r.supp) && !ids.includes(f.notion_id)).map((f) => f.email?.toLowerCase()).filter((x): x is string => Boolean(x))]);
            body = `La place ${r.nom.toLowerCase()} n'est toujours pas confirmée. Le premier qui la prend est validé. ${r.requis ? `Sans personne ${jourLim}, l'entraînement est annulé.` : "La buvette est facultative, mais bien utile."}`;
          }
          const urgent = /min$|^[1-3] h$/.test(r2);
          envois.push({ cle: `ent-rap:${s.id}:${r.id}:${slot.quand}`, emails, msg: { title: `${urgent ? "🚨" : "⏰"} ${r.ic} ${r.nom} ${jourCourt(s.date)} : plus que ${r2}`, body, url: "/entrainements#bloc-prochain", tag: `ent-rap-${s.id}-${r.id}` } });
        }
      }
    }
  }

  const { data: deja } = await db.from("push_journal").select("cle").in("cle", envois.length ? envois.map((e) => e.cle) : ["-"]);
  const faits = new Set(((deja || []) as { cle: string }[]).map((d) => d.cle));
  const { data: subs } = pushPret() ? await db.from("push_abonnements").select("endpoint,email,p256dh,auth") : { data: [] };
  const bilan: { cle: string; envoyes: number }[] = [];
  for (const e of envois) {
    if (faits.has(e.cle) || !e.emails.size) continue;
    await deposer(db, e.emails, { type: e.cle.startsWith("ent-decision") ? "notification" : "relance", titre: e.msg.title, texte: e.msg.body, lien: e.msg.url }).catch(() => 0);
    const r = subs?.length ? await pousser(db, subs as Abonnement[], e.emails, e.msg).catch(() => ({ envoyes: 0 })) : { envoyes: 0 };
    await db.from("push_journal").insert({ cle: e.cle, nb: r.envoyes });
    bilan.push({ cle: e.cle, envoyes: r.envoyes });
  }
  return { maintenant: now, decisions, bilan };
}
