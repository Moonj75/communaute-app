"use server";

import { revalidatePath } from "next/cache";
import { displayName, getSessionProfil } from "@/lib/profil";
import { pousser, pushPret, type Abonnement } from "@/lib/push";
import { clientAdmin } from "@/lib/supabase/admin";
import { creerJoueurNotion, majArchiveNotion, majCoordonneesNotion, majEmailNotion } from "@/lib/club";
import { deposer, type Demande, type Message } from "@/lib/courrier";
import { brevoPret, envoyerMails } from "@/lib/brevo";
import { construireMail, texteBrut, SITE } from "@/lib/mail-modele";

export type EtatMessage = { ok?: boolean; message?: string };

/** Opening a message marks it as read. */
export async function marquerLu(id: string) {
  const { supabase, user } = await getSessionProfil();
  if (!user) return;
  await supabase.from("messages").update({ lu: true }).eq("id", id);
  revalidatePath("/", "layout");
}

/**
 * Staff → one or more accounts (or every active account); player → the staff (answer).
 * A phone notification is sent too when notifications are set up.
 */
export async function envoyerMessage(_p: EtatMessage, fd: FormData): Promise<EtatMessage> {
  const { supabase, user, profil } = await getSessionProfil();
  if (!user?.email) return { ok: false, message: "Connecte-toi d'abord." };
  const admin = profil?.role === "admin";
  const titre = String(fd.get("titre") || "").trim().slice(0, 140);
  const texte = String(fd.get("texte") || "").trim().slice(0, 4000);
  const parent = String(fd.get("parent") || "") || null;
  if (!titre) return { ok: false, message: "Donne un objet à ton message." };
  if (!texte) return { ok: false, message: "Écris ton message." };
  const de = { de_email: user.email.toLowerCase(), de_nom: displayName(profil, user.email) };

  let a: string[] = [];
  let pourStaff = false;
  if (admin && String(fd.get("pour") || "") !== "staff") {
    a = [...new Set(fd.getAll("a").map((x) => String(x).toLowerCase()).filter((x) => x.includes("@")))];
    if (!a.length) return { ok: false, message: "Choisis au moins un destinataire." };
  } else pourStaff = true;

  const lignes: Record<string, unknown>[] = pourStaff
    ? [{ ...de, type: "message", titre, texte, a_email: null, pour_staff: true, parent, lien: "/courrier" }]
    : a.map((e) => ({ ...de, type: "message", titre, texte, a_email: e, pour_staff: false, parent, lien: "/courrier" }));
  const { error } = await supabase.from("messages").insert(lignes);
  if (error) return { ok: false, message: error.message.includes("messages") ? "Le courrier n'est pas encore installé : lance le fichier SQL de l'étape 10 dans Supabase." : "Envoi impossible, réessaie." };

  // Phone notification (if set up): to the recipients, or to the staff for an answer.
  if (pushPret()) {
    try {
      let cibles = a;
      if (pourStaff) {
        const { data } = await supabase.from("membres").select("email").eq("role", "admin").eq("actif", true);
        cibles = ((data || []) as { email: string }[]).map((m) => m.email);
      }
      const { data: subs } = await supabase.from("push_abonnements").select("endpoint,email,p256dh,auth");
      await pousser(supabase, (subs || []) as Abonnement[], cibles, { title: `📬 ${titre}`, body: `${de.de_nom} : ${texte.slice(0, 120)}`, url: "/courrier", tag: `msg-${Date.now()}` });
    } catch {
      /* the message is in the mailbox anyway */
    }
  }
  revalidatePath("/courrier");
  return { ok: true, message: pourStaff ? "✓ Message envoyé au staff du club." : `✓ Message envoyé à ${a.length} destinataire(s).` };
}

/** Staff: erase messages / notifications (one, a whole sending, or everything already read). */
export async function effacerMessages(ids: string[]): Promise<EtatMessage> {
  const { supabase, profil } = await getSessionProfil();
  if (profil?.role !== "admin") return { ok: false, message: "Réservé aux administrateurs." };
  const liste = ids.filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 2000);
  if (!liste.length) return { ok: false, message: "Rien à effacer." };
  let n = 0;
  for (let i = 0; i < liste.length; i += 200) {
    const { data, error } = await supabase.from("messages").delete().in("id", liste.slice(i, i + 200)).select("id");
    if (error) return { ok: false, message: error.message };
    n += (data || []).length;
  }
  // Nothing erased although allowed: the database rule of step 12 is missing.
  if (!n) return { ok: false, message: "Rien n'a été effacé : lance d'abord le script Supabase « etape12 »." };
  revalidatePath("/", "layout");
  return { ok: true, message: `🗑️ ${n} élément(s) effacé(s).` };
}


export type RetourDemande = { ok: boolean; message: string; notionId?: string; nom?: string };

/** The details of a request: from « carte », or read back from the text for older ones. */
function lireDemande(m: Message): Demande | null {
  const c = m.carte as { demande?: Demande } | null | undefined;
  if (c?.demande) return c.demande;
  const champ = (k: string) => (m.texte || "").split("\n").find((l) => l.startsWith(k + " : "))?.slice(k.length + 3).trim();
  const situation = champ("Situation") || "";
  const sujet = /rejoindre/i.test(situation) ? "rejoindre" : /parent/i.test(situation) ? "parent" : /autre adresse/i.test(situation) ? "membre" : /activer/i.test(situation) ? "attente" : /retour/i.test(situation) ? "archive" : /code/i.test(situation) ? "code" : null;
  const email = (champ("E-mail") || m.de_email || "").toLowerCase();
  const [prenom, ...reste] = (champ("Nom") || m.de_nom || "").split(" ");
  if (!sujet || !email) return null;
  return { sujet, prenom, nom: reste.join(" "), email, tel: champ("Téléphone"), ancienne: champ("Ancienne adresse"), enfant: champ("Joueur (enfant)"), niveau: champ("Expérience Subbuteo"), message: champ("Message") };
}

/**
 * Staff, from a request in the Courrier: does what the request needs in one tap.
 * rejoindre → new player fiche in Notion (with phone and a note) + app copy + login account;
 * parent → the child's fiche with the parent's e-mail; membre → the new e-mail on his fiche (old e-mail or same name),
 * or a new fiche if none is found; attente → opens the login account of the existing fiche; archive → brings him back.
 * The person is told (Courrier, and e-mail when mails are set up).
 */
export async function accepterDemande(messageId: string, actif = true): Promise<RetourDemande> {
  const { supabase, profil, user } = await getSessionProfil();
  if (profil?.role !== "admin" || !user?.email) return { ok: false, message: "Réservé au staff." };
  const db = clientAdmin() || supabase;
  let { data: m, error: e1 } = await db.from("messages").select("id,titre,texte,de_email,de_nom,carte,type,cree_le,a_email,pour_staff,lien,parent,lu").eq("id", messageId).maybeSingle();
  if (e1) ({ data: m } = await db.from("messages").select("id,titre,texte,de_email,de_nom,type,cree_le,a_email,pour_staff,lien,parent,lu").eq("id", messageId).maybeSingle());
  if (!m) return { ok: false, message: "Demande introuvable." };
  const d = lireDemande(m as Message);
  if (!d) return { ok: false, message: "Je ne retrouve pas les infos de cette demande : ajoute la personne depuis Admin." };
  if (d.traite) return { ok: true, message: `Déjà fait le ${new Date(d.traite.le).toLocaleDateString("fr-BE")} : ${d.traite.resultat}`, notionId: d.traite.notionId };
  const email = d.email.toLowerCase();
  const now = new Date().toISOString();
  const note = `Demande via l'appli le ${new Date().toLocaleDateString("fr-BE", { timeZone: "Europe/Brussels" })}${d.niveau ? ` · ${d.niveau}` : ""}${d.message ? ` · « ${d.message.slice(0, 200)} »` : ""}`;

  type J = { notion_id: string; email: string | null; prenom: string | null; nom: string; archive?: boolean };
  const creer = async (prenom: string | null, nom: string) => {
    const id = await creerJoueurNotion({ prenom, nom, email, actif, admin: false });
    // Phone and a note on the new fiche (« Nouveau joueur »).
    if (d.tel) await majCoordonneesNotion(id, { telephone: d.tel, naissance: null, adresse: null, codePostal: null, ville: null, nationalite: null }).catch(() => null);
    await notionNote(id, note).catch(() => null);
    await db.from("joueurs").insert({ notion_id: id, email, nom, prenom, actif, synced_at: now });
    return id;
  };
  const ouvrirCompte = async (prenom: string | null, nom: string, notionId: string) => {
    const { error } = await db.from("membres").insert({ email, nom, prenom, role: "joueur", notion_id: notionId, actif });
    if (error && error.code === "23505") await db.from("membres").update({ archive: false }).eq("email", email);
  };

  let notionId: string | undefined;
  let resultat = "";
  try {
    if (d.sujet === "rejoindre" || d.sujet === "code") {
      const { data: deja } = await db.from("joueurs").select("notion_id,email,prenom,nom").eq("email", email).limit(1);
      if (deja?.length) { notionId = (deja[0] as J).notion_id; resultat = "fiche déjà existante, accès ouvert"; }
      else { notionId = await creer(d.prenom, d.nom); resultat = `fiche créée pour ${d.prenom} ${d.nom}`; }
      await ouvrirCompte(d.prenom, d.nom, notionId);
    } else if (d.sujet === "parent") {
      const [ep, ...en] = (d.enfant || "").split(" ");
      const prenom = en.length ? ep : null;
      const nom = en.length ? en.join(" ") : ep || d.nom;
      const { data: js } = await db.from("joueurs").select("notion_id,email,prenom,nom").ilike("nom", `%${nom}%`);
      const trouve = ((js || []) as J[]).find((j) => !prenom || (j.prenom || "").toLowerCase() === prenom.toLowerCase());
      if (trouve) {
        notionId = trouve.notion_id;
        await majEmailNotion(notionId, email);
        await db.from("joueurs").update({ email }).eq("notion_id", notionId);
        resultat = `adresse du parent ajoutée sur la fiche de ${[trouve.prenom, trouve.nom].filter(Boolean).join(" ")}`;
      } else { notionId = await creer(prenom, nom); resultat = `fiche créée pour ${[prenom, nom].filter(Boolean).join(" ")}`; }
      await ouvrirCompte(d.prenom, d.nom, notionId);
    } else if (d.sujet === "membre") {
      let j: J | undefined;
      if (d.ancienne) j = ((await db.from("joueurs").select("notion_id,email,prenom,nom").eq("email", d.ancienne)).data as J[] | null)?.[0];
      if (!j) {
        const { data: js } = await db.from("joueurs").select("notion_id,email,prenom,nom").ilike("nom", d.nom);
        const memes = ((js || []) as J[]).filter((x) => (x.prenom || "").toLowerCase() === d.prenom.toLowerCase());
        if (memes.length === 1) j = memes[0];
      }
      if (j) {
        notionId = j.notion_id;
        await majEmailNotion(notionId, email);
        await db.from("joueurs").update({ email }).eq("notion_id", notionId);
        resultat = `nouvelle adresse mise sur la fiche de ${[j.prenom, j.nom].filter(Boolean).join(" ")}`;
      } else { notionId = await creer(d.prenom, d.nom); resultat = `aucune fiche trouvée : fiche créée pour ${d.prenom} ${d.nom}`; }
      await ouvrirCompte(d.prenom, d.nom, notionId);
    } else if (d.sujet === "attente") {
      const { data: js } = await db.from("joueurs").select("notion_id,email,prenom,nom").eq("email", email);
      const j = ((js || []) as J[])[0];
      if (!j) return { ok: false, message: "Aucune fiche avec cette adresse : utilise plutôt Admin → Ajouter un joueur." };
      notionId = j.notion_id;
      await ouvrirCompte(j.prenom, j.nom, notionId);
      resultat = "accès ouvert sur sa fiche existante";
    } else if (d.sujet === "archive") {
      const { data: js } = await db.from("joueurs").select("notion_id,email,prenom,nom").eq("email", email);
      for (const j of (js || []) as J[]) { await majArchiveNotion(j.notion_id, false); await db.from("joueurs").update({ archive: false, actif }).eq("notion_id", j.notion_id); notionId = notionId || j.notion_id; }
      await db.from("membres").update({ archive: false, actif }).eq("email", email);
      if (!notionId) return { ok: false, message: "Aucune fiche avec cette adresse : utilise plutôt Admin → Ajouter un joueur." };
      resultat = "compte réactivé";
    }
  } catch (e) {
    return { ok: false, message: "Notion : " + (e instanceof Error ? e.message : "erreur") };
  }

  // Remember it on the request, and tell the person.
  const traite = { le: now, par: profil.prenom || user.email, notionId, resultat };
  await db.from("messages").update({ carte: { demande: { ...d, traite } }, lu: true }).eq("id", messageId).then(() => null, () => null);
  await deposer(db, [email], { type: "notification", titre: "🦁 Bienvenue chez les Lions !", texte: `Ton accès à l'appli est ouvert. Connecte-toi avec ${email} : tu reçois un code à 6 chiffres par e-mail.`, lien: "/" }).catch(() => 0);
  if (brevoPret()) {
    const c = { theme: "reprise", titre: "Ton accès est ouvert !", texte: `Bonne nouvelle ${d.prenom} : le staff des Lions d'Eugies a ouvert ton accès à l'application du club.\n\nPour te connecter, entre ton adresse ${email} : tu recevras un code à 6 chiffres.`, signature: "Le staff du SC Lions d'Eugies", bouton: "Ouvrir l'application", lien: `${SITE}/login`, salutation: true };
    await envoyerMails([{ email, nom: `${d.prenom} ${d.nom}`, html: construireMail(c, d.prenom), texte: texteBrut(c, d.prenom) }], "🦁 Ton accès à l'appli des Lions est ouvert").catch(() => null);
  }
  revalidatePath("/courrier");
  revalidatePath("/admin", "layout");
  return { ok: true, message: `✅ C'est fait : ${resultat}. ${d.prenom} est prévenu et peut se connecter.`, notionId, nom: `${d.prenom} ${d.nom}` };
}

/** A short note on a new fiche (Notion « Nouveau joueur »). */
async function notionNote(pageId: string, texte: string) {
  const token = process.env.NOTION_TOKEN;
  if (!token) return;
  await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2025-09-03", "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { "Nouveau joueur": { rich_text: [{ type: "text", text: { content: texte.slice(0, 1900) } }] } } }),
  });
}
