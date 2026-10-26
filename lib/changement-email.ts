import "server-only";
import { clientAdmin } from "./supabase/admin";
import { majEmailNotion } from "./club";
import { brevoPret, envoyerUnMail } from "./brevo";
import { construireMail, texteBrut, SITE } from "./mail-modele";
import { deposer } from "./courrier";

export type DemandeEmail = { id: string; cree_le: string; ancien_email: string; nouvel_email: string; nom: string | null; statut: "en_attente" | "valide" | "refuse" | "annule"; traite_par: string | null; traite_le: string | null; motif: string | null };

export const emailValide = (e: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e) && e.length <= 160;

/**
 * Applies a validated change: login account (Supabase Auth), every table of the app, the Notion fiches,
 * then an e-mail to the new address (how to log in) and a word to the old one.
 */
export async function appliquerChangement(d: DemandeEmail, prenom: string | null) {
  const db = clientAdmin();
  if (!db) throw new Error("Clé serveur Supabase absente (SUPABASE_SECRET_KEY).");
  const a = d.ancien_email, n = d.nouvel_email;
  const { data: pris } = await db.from("membres").select("email").eq("email", n).maybeSingle();
  if (pris) throw new Error(`${n} est déjà utilisée par un autre compte.`);

  // 1. The login account (only if the member has already logged in once).
  const { data: pr } = await db.from("profils").select("id").eq("email", a).maybeSingle();
  if (pr?.id) {
    const { error } = await db.auth.admin.updateUserById(pr.id as string, { email: n, email_confirm: true });
    if (error) throw new Error(`Compte de connexion : ${error.message}`);
  }
  // 2. Every table of the app, in one go.
  const { error: e2 } = await db.rpc("changer_email", { ancien: a, nouveau: n });
  if (e2) {
    if (pr?.id) await db.auth.admin.updateUserById(pr.id as string, { email: a, email_confirm: true }); // back as it was
    throw new Error(/changer_email|function/.test(e2.message) ? "Lance d'abord le script Supabase « etape19-changement-email »." : e2.message);
  }
  // 3. Notion (the reference): the « Email » of every fiche of this account.
  const { data: fiches } = await db.from("joueurs").select("notion_id").eq("email", n);
  let notionOk = true;
  for (const f of (fiches || []) as { notion_id: string }[]) {
    try { await majEmailNotion(f.notion_id, n); } catch { notionOk = false; }
  }
  // 4. E-mails: how to log in (new address), a word to the old one.
  let mailOk = false;
  if (brevoPret()) {
    const contenu = {
      theme: "libre",
      titre: "Ta nouvelle adresse est validée ✅",
      texte: `Ton adresse e-mail pour l'application du SC Lions d'Eugies a bien été changée.\n\nÀ partir de maintenant, connecte-toi avec : ${n}\n\nSur l'écran de connexion, tape cette adresse : tu recevras un lien de connexion dans cette boîte mail. Si tu étais connecté sur un téléphone, déconnecte-toi puis reconnecte-toi avec ta nouvelle adresse.`,
      signature: "Sportivement,\nLe comité du SC Lions d'Eugies 🦁",
      bouton: "Me connecter",
      lien: `${SITE}/login`,
      salutation: true,
    };
    try { await envoyerUnMail({ email: n, nom: prenom }, "Ta nouvelle adresse e-mail est validée", construireMail(contenu, prenom), texteBrut(contenu, prenom)); mailOk = true; } catch { /* reported below */ }
    const info = { ...contenu, titre: "Ton adresse e-mail a changé", texte: `À ta demande, l'adresse de ton compte du SC Lions d'Eugies a été remplacée par ${n}.\n\nCe n'est pas toi ? Préviens tout de suite un responsable du club.`, bouton: undefined, lien: undefined };
    try { await envoyerUnMail({ email: a, nom: prenom }, "Ton adresse e-mail a changé", construireMail(info, prenom), texteBrut(info, prenom)); } catch { /* informative only */ }
  }
  try { await deposer(db, [n], { type: "notification", titre: "✅ Nouvelle adresse e-mail validée", texte: `Connecte-toi désormais avec ${n}.`, lien: "/profil" }); } catch { /* informative */ }
  return { notionOk, mailOk };
}
