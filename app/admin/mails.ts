"use server";

import { getSessionProfil } from "@/lib/profil";
import { brevoPret, envoyerMails } from "@/lib/brevo";
import { construireMail, texteBrut, type ContenuMail } from "@/lib/mail-modele";
import { deposer } from "@/lib/courrier";
import { pousser, pushPret, type Abonnement } from "@/lib/push";

export type Cible = "tous" | "actifs" | "non" | "choix";
export type EnvoiMail = { sujet: string; contenu: ContenuMail; cible: Cible; choix: string[]; parMail: boolean; parCourrier: boolean; parNotif: boolean; test: boolean };
export type RetourMail = { ok: boolean; message: string };

/**
 * Club e-mail (season's greetings, new season…) written in the app: sent by e-mail (Brevo),
 * and/or dropped in each member's mailbox in the app, and/or as a phone notification.
 * « test » = only to me. Administrators only.
 */
export async function envoyerMailClub(p: EnvoiMail): Promise<RetourMail> {
  try {
    const { supabase, user, profil } = await getSessionProfil();
    if (profil?.role !== "admin" || !user?.email) return { ok: false, message: "Réservé aux administrateurs." };
    const sujet = String(p.sujet || "").trim().slice(0, 150);
    const c: ContenuMail = {
      theme: String(p.contenu.theme || "libre").slice(0, 20),
      titre: String(p.contenu.titre || "").trim().slice(0, 120),
      texte: String(p.contenu.texte || "").slice(0, 8000),
      signature: String(p.contenu.signature || "").slice(0, 300),
      bouton: String(p.contenu.bouton || "").trim().slice(0, 60) || undefined,
      lien: String(p.contenu.lien || "").trim().slice(0, 300) || undefined,
      salutation: p.contenu.salutation !== false,
    };
    if (!sujet) return { ok: false, message: "Donne un objet au mail." };
    if (!c.titre || !c.texte.trim()) return { ok: false, message: "Il faut un titre et un message." };
    if (!p.parMail && !p.parCourrier && !p.parNotif) return { ok: false, message: "Choisis au moins un moyen d'envoi." };
    if (p.parMail && !brevoPret()) return { ok: false, message: "L'envoi d'e-mails n'est pas encore branché (BREVO_API_KEY et MAIL_EXPEDITEUR dans Vercel). Tu peux déjà l'envoyer dans le courrier de l'appli." };

    // Who: one e-mail per account (a family gets one mail, « Bonjour Mathéo et Lina »).
    let personnes: { email: string; prenoms: string[]; nom: string }[];
    if (p.test) {
      personnes = [{ email: user.email.toLowerCase(), prenoms: [profil.prenom || ""].filter(Boolean), nom: [profil.prenom, profil.nom].filter(Boolean).join(" ") }];
    } else {
      const { data } = await supabase.from("joueurs").select("*");
      const js = ((data || []) as { notion_id: string; email: string | null; prenom: string | null; nom: string; actif: boolean; archive?: boolean }[])
        .filter((j) => j.email && !j.archive)
        .filter((j) => (p.cible === "actifs" ? j.actif : p.cible === "non" ? !j.actif : p.cible === "choix" ? (p.choix || []).includes(j.notion_id) : true));
      const par = new Map<string, { email: string; prenoms: string[]; nom: string }>();
      for (const j of js) {
        const e = j.email!.toLowerCase();
        const x = par.get(e) || { email: e, prenoms: [], nom: [j.prenom, j.nom].filter(Boolean).join(" ") };
        if (j.prenom && !x.prenoms.includes(j.prenom)) x.prenoms.push(j.prenom);
        par.set(e, x);
      }
      personnes = [...par.values()];
    }
    if (!personnes.length) return { ok: false, message: "Aucun destinataire avec une adresse e-mail." };
    if (personnes.length > 280) return { ok: false, message: "Trop de destinataires d'un coup (max. 280 par jour avec Brevo gratuit)." };
    const prenomDe = (x: { prenoms: string[] }) => (x.prenoms.length ? x.prenoms.join(" et ") : null);

    const bilan: string[] = [];
    if (p.parMail) {
      const r = await envoyerMails(personnes.map((x) => ({ email: x.email, nom: x.nom, html: construireMail(c, prenomDe(x)), texte: texteBrut(c, prenomDe(x)) })), sujet);
      if (!r.ok && r.echecs.length) return { ok: false, message: `Aucun e-mail parti : ${r.echecs[0]}` };
      bilan.push(`📧 ${r.ok} e-mail${r.ok > 1 ? "s" : ""} envoyé${r.ok > 1 ? "s" : ""}${r.echecs.length ? ` (${r.echecs.length} en échec : ${r.echecs.slice(0, 3).join(", ")})` : ""}`);
    }
    const emails = personnes.map((x) => x.email);
    if (p.parCourrier) {
      const qui = [profil.prenom, profil.nom].filter(Boolean).join(" ") || "Le club";
      await deposer(supabase, emails, { type: "message", titre: `${sujet}`, texte: [c.titre, c.texte, c.signature].filter(Boolean).join("\n\n"), lien: c.lien || null, de_email: user.email, de_nom: qui });
      bilan.push(`📬 déposé dans ${emails.length} courrier${emails.length > 1 ? "s" : ""}`);
    }
    if (p.parNotif && pushPret()) {
      const { data: subs } = await supabase.from("push_abonnements").select("endpoint,email,p256dh,auth").in("email", emails);
      await pousser(supabase, (subs || []) as Abonnement[], emails, { title: sujet, body: c.texte.split("\n")[0].slice(0, 140), url: "/courrier", tag: `mail-${Date.now()}` });
      bilan.push(`🔔 notification envoyée`);
    }
    return { ok: true, message: `${p.test ? "Test envoyé à toi seul" : "C'est parti"} : ${bilan.join(" · ")}.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Envoi impossible." };
  }
}
