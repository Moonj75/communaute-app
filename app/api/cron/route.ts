import { NextResponse, type NextRequest } from "next/server";
import { clientAdmin } from "@/lib/supabase/admin";
import { lireCalendrier, lireParticipations, lireTaches } from "@/lib/club";
import { pousser, pushPret, type Abonnement, type MessagePush } from "@/lib/push";
import { comptesActifs, comptesConcernes, inscritsOui, sansReponse } from "@/lib/audiences";
import { lireEligibles } from "@/lib/eligibles";
import { deposer } from "@/lib/courrier";
import { fusionner, remplir, type CleModele, type ModeleEnregistre } from "@/lib/modeles-notifs";
import type { JoueurLite } from "@/lib/club-types";
import { ajouterJours, ajouterMois, aujourdhui, dateCourte, estCompetition, estRetenu, indexReponses, lienReponse, DECISION_OUI } from "@/lib/club-types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Envoi = { cle: string; emails: Set<string>; msg: MessagePush; modele?: CleModele };

/**
 * Daily automatic notifications (Vercel Cron, see vercel.json).
 * Protected by CRON_SECRET: Vercel sends it automatically, nobody else can trigger this.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  if (!pushPret()) return NextResponse.json({ info: "clés VAPID absentes : rien envoyé" });
  const db = clientAdmin();
  if (!db) return NextResponse.json({ info: "SUPABASE_SECRET_KEY absente : rien envoyé" });

  const T = aujourdhui();
  const [evs, parts, taches, rj, rm, ra, rmod] = await Promise.all([
    lireCalendrier().catch(() => []),
    lireParticipations().catch(() => []),
    lireTaches().catch(() => []),
    db.from("joueurs").select("notion_id,prenom,nom,email,actif"),
    db.from("membres").select("email,role,actif"),
    db.from("push_abonnements").select("endpoint,email,p256dh,auth"),
    db.from("notif_modeles").select("cle,titre,texte,actif"),
  ]);
  // Texts written by the staff (Staff → Notifications), otherwise the default ones.
  const modeles = new Map(fusionner(((rmod.data || []) as ModeleEnregistre[])).map((m) => [m.cle, m]));
  const msgDe = (cle: CleModele, mots: Record<string, string | null | undefined>, url: string, tag: string): MessagePush => {
    const m = modeles.get(cle)!;
    return { title: remplir(m.titre, mots), body: remplir(m.texte, mots), url, tag };
  };
  const motsEv = (e: { nom: string; limite?: string | null; validation?: string | null; date?: string | null; lieu?: string | null }) => ({
    competition: e.nom,
    limite: e.limite ? dateCourte(e.limite) : "",
    validation: e.validation ? dateCourte(e.validation) : "",
    date: e.date ? dateCourte(e.date) : "",
    lieu: e.lieu || "",
  });
  const joueurs: JoueurLite[] = ((rj.data || []) as { notion_id: string; prenom: string | null; nom: string; email: string | null; actif: boolean }[]).map((j) => ({
    notionId: j.notion_id,
    nom: [j.prenom, j.nom].filter(Boolean).join(" "),
    email: j.email,
    actif: j.actif,
  }));
  const staff = new Set(((rm.data || []) as { email: string; role: string; actif: boolean }[]).filter((m) => m.role === "admin" && m.actif).map((m) => m.email));
  const abonnes = (ra.data || []) as Abonnement[];
  const actifs = comptesActifs(joueurs);
  const elig = await lireEligibles(db);
  const comps = evs.filter((e) => e.date && estCompetition(e) && estRetenu(e) && !e.jourSpecial);
  const envois: Envoi[] = [];

  // 1. Inscriptions open today → all active players.
  for (const e of comps.filter((e) => e.ouverture === T && e.decision === DECISION_OUI))
    envois.push({
      cle: `ouverture:${e.id}`,
      emails: comptesConcernes(e, joueurs, elig),
      msg: msgDe("ouverture", motsEv(e), lienReponse(e), `ins-${e.id}`),
    });

  // 2. Deadline in 3 days → those who have not answered yet.
  for (const e of comps.filter((e) => e.limite === ajouterJours(T, 3)))
    envois.push({
      cle: `rappel3:${e.id}`,
      emails: sansReponse(e, evs, parts, joueurs, elig),
      msg: msgDe("rappel3", motsEv(e), lienReponse(e), `ins-${e.id}`),
    });

  // 2b. Confirmation period starts (day after the answer deadline) → answered but not validated yet.
  for (const e of comps.filter((e) => e.limite && e.validation && ajouterJours(e.limite, 1) === T)) {
    const idx = indexReponses(parts, evs, joueurs).get(e.id);
    const emails = new Set<string>();
    for (const j of joueurs) {
      const r = idx?.get(j.notionId);
      if (j.email && r?.statut && r.statut !== "En attente" && !r.valide) emails.add(j.email.toLowerCase());
    }
    envois.push({
      cle: `confirmation:${e.id}`,
      emails,
      msg: msgDe("confirmation", motsEv(e), lienReponse(e), `ins-${e.id}`),
    });
  }

  // 3. Competition tomorrow → those who said yes.
  for (const e of comps.filter((e) => e.date === ajouterJours(T, 1)))
    envois.push({
      cle: `veille:${e.id}`,
      emails: inscritsOui(e, evs, parts, joueurs),
      msg: msgDe("veille", motsEv(e), `/calendrier?e=${e.id}`, `veille-${e.id}`),
    });

  // 4. Staff: every morning, the urgent tasks — late, due today, or due within 3 days.
  const ouvertes = taches.filter((t) => t.statut !== "Fait" && t.echeance && t.echeance <= ajouterJours(T, 3));
  const urgentes = ouvertes.sort((a, b) => (a.echeance! < b.echeance! ? -1 : a.echeance! > b.echeance! ? 1 : 0));
  if (urgentes.length) {
    const retard = urgentes.filter((t) => t.echeance! < T).length;
    const jour = urgentes.filter((t) => t.echeance === T).length;
    const bientot = urgentes.length - retard - jour;
    const detail = [retard ? `${retard} en retard` : "", jour ? `${jour} aujourd'hui` : "", bientot ? `${bientot} dans les 3 jours` : ""].filter(Boolean).join(" · ");
    const liste = urgentes.slice(0, 4).map((t) => t.titre).join(" · ") + (urgentes.length > 4 ? ` (+${urgentes.length - 4})` : "");
    envois.push({
      cle: `taches:${T}`,
      emails: staff,
      msg: msgDe("taches", { n: String(urgentes.length), detail, liste }, "/staff/planning", "taches"),
    });
  }

  // 5. Staff: participation decision due (8 months before).
  for (const e of comps.filter((e) => !e.decision && ajouterMois(e.date!, -8) === T))
    envois.push({
      cle: `decision:${e.id}`,
      emails: staff,
      msg: msgDe("decision", motsEv(e), `/staff/planning?e=${e.id}`, `dec-${e.id}`),
    });

  // Send once per key (the job may run twice).
  const { data: deja } = await db.from("push_journal").select("cle").in("cle", envois.length ? envois.map((e) => e.cle) : ["-"]);
  const faits = new Set(((deja || []) as { cle: string }[]).map((d) => d.cle));
  const bilan: { cle: string; envoyes: number }[] = [];
  for (const e of envois) {
    if (faits.has(e.cle) || !e.emails.size) continue;
    // A message switched off by the staff is not sent.
    const cleModele = (e.modele || e.cle.split(":")[0]) as CleModele;
    if (modeles.get(cleModele)?.actif === false) continue;
    // A copy goes to the mailbox (Courrier) of each person, even without notifications on the phone.
    try {
      await deposer(db, e.emails, { type: /^(ins|dec|taches)/.test(e.msg.tag || "") ? "relance" : "notification", titre: e.msg.title, texte: e.msg.body, lien: e.msg.url });
    } catch {
      /* the push is still sent */
    }
    try {
      const r = await pousser(db, abonnes, e.emails, e.msg);
      await db.from("push_journal").insert({ cle: e.cle, nb: r.envoyes });
      bilan.push({ cle: e.cle, envoyes: r.envoyes });
    } catch {
      /* continue with the next message */
    }
  }
  return NextResponse.json({ date: T, envois: bilan });
}
