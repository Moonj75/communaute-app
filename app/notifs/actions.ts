"use server";

import { getSessionProfil } from "@/lib/profil";
import { pousser, type Abonnement } from "@/lib/push";

export type RetourNotif = { ok: boolean; message?: string };

function expliquer(msg: string) {
  return /push_abonnements|relation|does not exist/i.test(msg)
    ? "Les notifications ne sont pas encore activées : un administrateur doit lancer le script « etape6 » dans Supabase."
    : "Enregistrement impossible, réessaie dans un instant.";
}

export async function abonner(sub: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }, appareil: string): Promise<RetourNotif> {
  const { supabase, user } = await getSessionProfil();
  if (!user?.email) return { ok: false, message: "Reconnecte-toi." };
  if (!sub.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false, message: "Abonnement invalide." };
  const { error } = await supabase.from("push_abonnements").upsert(
    { endpoint: sub.endpoint, email: user.email.toLowerCase(), p256dh: sub.keys.p256dh, auth: sub.keys.auth, appareil: appareil.slice(0, 120) },
    { onConflict: "endpoint" },
  );
  return error ? { ok: false, message: expliquer(error.message) } : { ok: true };
}

export async function desabonner(endpoint: string): Promise<RetourNotif> {
  const { supabase, user } = await getSessionProfil();
  if (!user) return { ok: false, message: "Reconnecte-toi." };
  await supabase.from("push_abonnements").delete().eq("endpoint", endpoint);
  return { ok: true };
}

/** Sends a test notification to all devices of the signed-in person. */
export async function mEnvoyerUnTest(): Promise<RetourNotif> {
  const { supabase, user } = await getSessionProfil();
  if (!user?.email) return { ok: false, message: "Reconnecte-toi." };
  const { data } = await supabase.from("push_abonnements").select("endpoint,email,p256dh,auth").eq("email", user.email.toLowerCase());
  try {
    const r = await pousser(supabase, (data || []) as Abonnement[], [user.email], {
      title: "🦁 Notifications activées",
      body: "Tu recevras ici les ouvertures d'inscriptions et les rappels du club.",
      url: "/",
      tag: "test",
    });
    return r.envoyes ? { ok: true, message: `Envoyée sur ${r.envoyes} appareil(s) ✓` } : { ok: false, message: "Aucun appareil abonné." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erreur" };
  }
}
