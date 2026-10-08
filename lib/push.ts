import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Abonnement = { endpoint: string; email: string; p256dh: string; auth: string };
export type MessagePush = { title: string; body: string; url?: string; tag?: string };

export function pushPret() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configure = false;
function configurer() {
  if (configure) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "https://lions-eugies.vercel.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configure = true;
}

/**
 * Sends one message to every device of the given e-mails.
 * Devices that no longer exist (uninstalled app, revoked permission) are removed.
 */
export async function pousser(db: SupabaseClient, abonnes: Abonnement[], emails: Iterable<string>, msg: MessagePush) {
  if (!pushPret()) throw new Error("Notifications pas encore configurées (clés VAPID manquantes dans Vercel).");
  configurer();
  const cibles = new Set([...emails].map((e) => e.toLowerCase()));
  const subs = abonnes.filter((a) => cibles.has(a.email));
  const morts: string[] = [];
  let envoyes = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 60 * 60 * 24 });
        envoyes++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) morts.push(s.endpoint);
      }
    }),
  );
  if (morts.length) await db.from("push_abonnements").delete().in("endpoint", morts);
  return { envoyes, appareils: subs.length, personnes: new Set(subs.map((s) => s.email)).size };
}
