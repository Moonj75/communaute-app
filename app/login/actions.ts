"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { pageDeRetour } from "@/lib/retour";
import { createClient } from "@/lib/supabase/server";
import { clientAdmin } from "@/lib/supabase/admin";
import { pousser, pushPret, type Abonnement } from "@/lib/push";
import { brevoPret, envoyerMails } from "@/lib/brevo";
import { construireMail, texteBrut } from "@/lib/mail-modele";

/**
 * Why somebody cannot get in, each with its own help page (/login?aide=…):
 * « inconnu » address not in the club's lists · « attente » a player fiche exists but the access is not opened yet ·
 * « archive » former member · « code » the code does not arrive or does not work.
 */
export type CasAide = "inconnu" | "attente" | "archive" | "code";
export type LoginState = { status: "idle" | "sent" | "error" | "aide"; message?: string; email?: string; cas?: CasAide; nom?: string };

/** Looks the address up before sending a code (service key, server only): which situation is it? */
async function situation(email: string): Promise<{ cas: CasAide | null; nom?: string }> {
  const db = clientAdmin();
  if (!db) return { cas: null };
  try {
    const { data: m } = await db.from("membres").select("prenom,nom,archive,role").eq("email", email).maybeSingle();
    const nomDe = (x: { prenom?: string | null; nom?: string | null } | null) => [x?.prenom, x?.nom].filter(Boolean).join(" ") || undefined;
    if (m) return m.archive && m.role !== "admin" ? { cas: "archive", nom: nomDe(m) } : { cas: null };
    const { data: js } = await db.from("joueurs").select("prenom,nom,archive").eq("email", email).limit(3);
    const liste = (js || []) as { prenom: string | null; nom: string; archive?: boolean }[];
    if (liste.length) return liste.every((j) => j.archive) ? { cas: "archive", nom: nomDe(liste[0]) } : { cas: "attente", nom: nomDe(liste.find((j) => !j.archive) || liste[0]) };
    return { cas: "inconnu" };
  } catch {
    return { cas: null };
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Cette adresse e-mail ne semble pas valide.", email };
  }

  // Not (or no longer) in the club: straight to the help page made for that situation, no code sent.
  const sit = await situation(email);
  if (sit.cas) return { status: "aide", cas: sit.cas, email, nom: sit.nom };

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: true },
  });

  if (error) {
    const msg = (error.message || "").toLowerCase();
    // The database trigger refuses addresses that are not in the club's member list.
    if (msg.includes("database error") || msg.includes("acces_refuse")) return { status: "aide", cas: "inconnu", email };
    if (error.status === 429 || msg.includes("rate limit") || msg.includes("security purposes")) {
      return { status: "error", message: "Trop de demandes. Patientez une minute avant de redemander un lien.", email };
    }
    return { status: "error", message: "Impossible d'envoyer le lien pour le moment. Réessayez dans un instant.", email };
  }
  return { status: "sent", email };
}

export type CodeState = { status: "idle" | "error" | "aide"; message?: string; cas?: CasAide };

/**
 * The 6-digit code of the e-mail, typed in the app itself: the session is opened where the code is typed
 * (installed app included), whatever app opens the mail's link.
 */
export async function verifierCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const code = String(formData.get("code") || "").replace(/\D/g, "");
  if (!EMAIL_RE.test(email)) return { status: "error", message: "Adresse e-mail manquante : recommence la connexion." };
  if (code.length < 6 || code.length > 10) return { status: "error", message: "Tape le code à 6 chiffres reçu par e-mail." };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("database error") || msg.includes("acces_refuse")) return { status: "aide", cas: "inconnu" };
    if (error.status === 429 || msg.includes("rate limit")) return { status: "error", message: "Trop d'essais. Patiente une minute." };
    return { status: "error", message: "Code incorrect ou expiré. Vérifie le dernier mail reçu, ou redemande un code." };
  }
  // A former member (archived) cannot use the app: out again, to the page to ask for a comeback.
  const { data: p } = await supabase.from("profils").select("archive,role").eq("email", email).maybeSingle();
  if (p?.archive && p.role !== "admin") {
    await supabase.auth.signOut();
    return { status: "aide", cas: "archive" };
  }
  redirect(await pageDeRetour());
}

export type DemandeState = { status: "idle" | "ok" | "error"; message?: string };

const SUJETS: Record<string, { ic: string; titre: string }> = {
  membre: { ic: "🔑", titre: "Accès : je suis membre (autre adresse)" },
  rejoindre: { ic: "👋", titre: "Je veux rejoindre le club" },
  parent: { ic: "👨‍👩‍👧", titre: "Accès parent d'un joueur" },
  attente: { ic: "⏳", titre: "Accès à activer" },
  archive: { ic: "🔄", titre: "Demande de retour au club" },
  code: { ic: "📭", titre: "Problème de code de connexion" },
};

/**
 * A request from the login help pages (no account needed): it lands in the staff's Courrier (« Pour le staff »),
 * the administrators get a phone notification, and the person gets an acknowledgement by e-mail (if mails are set up).
 */
export async function envoyerDemande(_p: DemandeState, fd: FormData): Promise<DemandeState> {
  const v = (k: string, n = 200) => String(fd.get(k) || "").replace(/\s+/g, " ").trim().slice(0, n);
  if (v("site")) return { status: "ok" }; // robot (hidden field filled)
  const sujet = SUJETS[v("sujet", 20)];
  const email = v("email", 120).toLowerCase();
  const prenom = v("prenom", 60);
  const nom = v("nom", 60);
  if (!sujet) return { status: "error", message: "Demande inconnue." };
  if (!EMAIL_RE.test(email)) return { status: "error", message: "Indique une adresse e-mail valide pour qu'on puisse te répondre." };
  if (!prenom || !nom) return { status: "error", message: "Indique ton prénom et ton nom." };
  const db = clientAdmin();
  if (!db) return { status: "error", message: "Envoi impossible pour le moment. Écris au club sur Facebook ou parles-en à un membre du staff." };

  // Not more than 3 requests a day from the same address.
  const hier = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await db.from("messages").select("id", { count: "exact", head: true }).eq("de_email", email).eq("pour_staff", true).gte("cree_le", hier);
  if ((count || 0) >= 3) return { status: "error", message: "Ta demande a déjà été envoyée. Le staff te répond au plus vite." };

  const lignes = [
    ["Situation", `${sujet.ic} ${sujet.titre}`],
    ["Nom", `${prenom} ${nom}`],
    ["E-mail", email],
    ["Téléphone", v("tel", 30)],
    ["Ancienne adresse", v("ancienne", 120)],
    ["Joueur (enfant)", v("enfant", 120)],
    ["Expérience Subbuteo", v("niveau", 40)],
    ["Ce qui se passe", v("probleme", 120)],
    ["Message", v("message", 1000)],
  ].filter(([, x]) => x).map(([k, x]) => `${k} : ${x}`);
  const conseil: Record<string, string> = {
    membre: "Pour lui ouvrir l'accès : mets sa nouvelle adresse dans sa fiche Notion, puis Admin → Synchroniser.",
    rejoindre: "Nouveau contact : propose-lui un entraînement d'essai.",
    parent: "Pour un accès parent : ajoute cette adresse dans la fiche Notion du joueur, puis Admin → Synchroniser.",
    attente: "Sa fiche existe dans Notion : fais Admin → Synchroniser pour ouvrir l'accès.",
    archive: "Ancien membre : décoche « Archivé » dans sa fiche Notion, puis Admin → Synchroniser.",
    code: "Vérifie son adresse dans Notion. Le code part d'un expéditeur parfois classé en indésirables.",
  };
  const titre = `${sujet.ic} ${sujet.titre} — ${prenom} ${nom}`.slice(0, 140);
  const texte = [...lignes, "", `👉 ${conseil[v("sujet", 20)]}`].join("\n");
  // The details are kept too (column « carte »), so the staff can open the access in one tap from the Courrier.
  const demande = { sujet: v("sujet", 20), prenom, nom, email, tel: v("tel", 30) || undefined, ancienne: v("ancienne", 120).toLowerCase() || undefined, enfant: v("enfant", 120) || undefined, niveau: v("niveau", 40) || undefined, message: v("message", 1000) || undefined };
  const ligne = { type: "message", titre, texte, a_email: null, pour_staff: true, de_email: email, de_nom: `${prenom} ${nom}`, lien: "/courrier" };
  let { error } = await db.from("messages").insert({ ...ligne, carte: { demande } });
  if (error && /carte/.test(error.message)) ({ error } = await db.from("messages").insert(ligne));
  if (error) return { status: "error", message: "Envoi impossible, réessaie dans un instant." };

  // The administrators are told on their phone.
  if (pushPret()) {
    try {
      const { data: adm } = await db.from("membres").select("email").eq("role", "admin").eq("actif", true);
      const { data: subs } = await db.from("push_abonnements").select("endpoint,email,p256dh,auth");
      await pousser(db, (subs || []) as Abonnement[], ((adm || []) as { email: string }[]).map((m) => m.email), { title: `📬 ${titre}`, body: v("message", 120) || "Nouvelle demande depuis la page de connexion.", url: "/courrier", tag: `demande-${Date.now()}` });
    } catch { /* it is in the Courrier anyway */ }
  }
  // Acknowledgement to the person.
  if (brevoPret()) {
    const c = { theme: "libre", titre: "Demande bien reçue", texte: `Merci ${prenom} ! Ta demande « ${sujet.titre} » est bien arrivée chez le staff des Lions d'Eugies.\n\nOn te répond au plus vite, par e-mail à cette adresse.`, signature: "Le staff du SC Lions d'Eugies", salutation: true };
    await envoyerMails([{ email, nom: `${prenom} ${nom}`, html: construireMail(c, prenom), texte: texteBrut(c, prenom) }], "🦁 Ta demande est bien arrivée").catch(() => null);
  }
  return { status: "ok", message: email };
}
