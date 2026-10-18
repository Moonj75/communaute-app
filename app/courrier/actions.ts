"use server";

import { revalidatePath } from "next/cache";
import { displayName, getSessionProfil } from "@/lib/profil";
import { pousser, pushPret, type Abonnement } from "@/lib/push";

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
