import { NextResponse, type NextRequest } from "next/server";
import { clientAdmin } from "@/lib/supabase/admin";
import { lireCalendrier, lireParticipations, lireTaches } from "@/lib/club";
import { pousser, pushPret, type Abonnement, type MessagePush } from "@/lib/push";
import { comptesActifs, inscritsOui, sansReponse } from "@/lib/audiences";
import type { JoueurLite } from "@/lib/club-types";
import { ajouterJours, ajouterMois, aujourdhui, dateCourte, estCompetition, estRetenu, indexReponses, lienReponse, DECISION_OUI } from "@/lib/club-types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Envoi = { cle: string; emails: Set<string>; msg: MessagePush };

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
  const [evs, parts, taches, rj, rm, ra] = await Promise.all([
    lireCalendrier().catch(() => []),
    lireParticipations().catch(() => []),
    lireTaches().catch(() => []),
    db.from("joueurs").select("notion_id,prenom,nom,email,actif"),
    db.from("membres").select("email,role,actif"),
    db.from("push_abonnements").select("endpoint,email,p256dh,auth"),
  ]);
  const joueurs: JoueurLite[] = ((rj.data || []) as { notion_id: string; prenom: string | null; nom: string; email: string | null; actif: boolean }[]).map((j) => ({
    notionId: j.notion_id,
    nom: [j.prenom, j.nom].filter(Boolean).join(" "),
    email: j.email,
    actif: j.actif,
  }));
  const staff = new Set(((rm.data || []) as { email: string; role: string; actif: boolean }[]).filter((m) => m.role === "admin" && m.actif).map((m) => m.email));
  const abonnes = (ra.data || []) as Abonnement[];
  const actifs = comptesActifs(joueurs);
  const comps = evs.filter((e) => e.date && estCompetition(e) && estRetenu(e) && !e.jourSpecial);
  const envois: Envoi[] = [];

  // 1. Inscriptions open today → all active players.
  for (const e of comps.filter((e) => e.ouverture === T && e.decision === DECISION_OUI))
    envois.push({
      cle: `ouverture:${e.id}`,
      emails: actifs,
      msg: { title: `🏁 Inscriptions ouvertes : ${e.nom}`, body: e.limite ? `Réponds avant le ${dateCourte(e.limite)}.` : "Donne ta réponse dans l'appli.", url: lienReponse(e), tag: `ins-${e.id}` },
    });

  // 2. Deadline in 3 days → those who have not answered yet.
  for (const e of comps.filter((e) => e.limite === ajouterJours(T, 3)))
    envois.push({
      cle: `rappel3:${e.id}`,
      emails: sansReponse(e, evs, parts, joueurs),
      msg: { title: `⏰ Plus que 3 jours pour répondre`, body: `${e.nom} : on attend ta réponse avant le ${dateCourte(e.limite)}.`, url: lienReponse(e), tag: `ins-${e.id}` },
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
      msg: { title: `🔒 Confirme ta participation : ${e.nom}`, body: `Valide définitivement ta réponse avant le ${dateCourte(e.validation)}.`, url: lienReponse(e), tag: `ins-${e.id}` },
    });
  }

  // 3. Competition tomorrow → those who said yes.
  for (const e of comps.filter((e) => e.date === ajouterJours(T, 1)))
    envois.push({
      cle: `veille:${e.id}`,
      emails: inscritsOui(e, evs, parts, joueurs),
      msg: { title: `📍 C'est demain : ${e.nom}`, body: `${e.lieu ? e.lieu + " · " : ""}Prépare ton matériel. Allez les Lions ! 🦁`, url: `/calendrier?e=${e.id}`, tag: `veille-${e.id}` },
    });

  // 4. Staff: tasks due today (+ overdue count).
  const ouvertes = taches.filter((t) => t.statut !== "Fait");
  const dues = ouvertes.filter((t) => t.echeance === T);
  const retard = ouvertes.filter((t) => t.echeance && t.echeance < T).length;
  if (dues.length || (retard && new Date(T + "T12:00:00Z").getUTCDay() === 1))
    envois.push({
      cle: `taches:${T}`,
      emails: staff,
      msg: {
        title: dues.length ? `✅ ${dues.length} tâche${dues.length > 1 ? "s" : ""} pour aujourd'hui` : `⚠️ ${retard} tâche${retard > 1 ? "s" : ""} en retard`,
        body: [dues.slice(0, 3).map((t) => t.titre).join(" · "), retard ? `${retard} en retard` : ""].filter(Boolean).join(" — "),
        url: "/staff/planning",
        tag: "taches",
      },
    });

  // 5. Staff: participation decision due (8 months before).
  for (const e of comps.filter((e) => !e.decision && ajouterMois(e.date!, -8) === T))
    envois.push({
      cle: `decision:${e.id}`,
      emails: staff,
      msg: { title: `🗳️ Décision à prendre : ${e.nom}`, body: `Compétition le ${dateCourte(e.date)}. Le club y va ?`, url: `/staff/planning?e=${e.id}`, tag: `dec-${e.id}` },
    });

  // Send once per key (the job may run twice).
  const { data: deja } = await db.from("push_journal").select("cle").in("cle", envois.length ? envois.map((e) => e.cle) : ["-"]);
  const faits = new Set(((deja || []) as { cle: string }[]).map((d) => d.cle));
  const bilan: { cle: string; envoyes: number }[] = [];
  for (const e of envois) {
    if (faits.has(e.cle) || !e.emails.size) continue;
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
