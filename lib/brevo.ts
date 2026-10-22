import "server-only";

/**
 * Sends e-mails through Brevo (transactional API). Vercel settings needed:
 * BREVO_API_KEY (Brevo → SMTP & API → API keys) and MAIL_EXPEDITEUR (an address validated as a sender in Brevo).
 */
export const brevoPret = () => Boolean(process.env.BREVO_API_KEY && process.env.MAIL_EXPEDITEUR);

export async function envoyerUnMail(a: { email: string; nom?: string | null }, sujet: string, html: string, texte: string) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY || "", "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: process.env.MAIL_NOM || "SC Lions d'Eugies", email: process.env.MAIL_EXPEDITEUR },
      to: [{ email: a.email, ...(a.nom ? { name: a.nom } : {}) }],
      subject: sujet,
      htmlContent: html,
      textContent: texte,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 401) throw new Error("Brevo refuse la clé : vérifiez BREVO_API_KEY dans Vercel.");
    if (/sender/i.test(t)) throw new Error("Brevo refuse l'expéditeur : MAIL_EXPEDITEUR doit être une adresse validée dans Brevo (Senders).");
    throw new Error(`Brevo a répondu ${res.status} : ${t.slice(0, 160)}`);
  }
}

/** Many e-mails, a few at a time; returns how many left and the failures. */
export async function envoyerMails(liste: { email: string; nom?: string | null; html: string; texte: string }[], sujet: string) {
  let ok = 0;
  const echecs: string[] = [];
  for (let i = 0; i < liste.length; i += 8) {
    const lot = liste.slice(i, i + 8);
    const r = await Promise.allSettled(lot.map((x) => envoyerUnMail(x, sujet, x.html, x.texte)));
    r.forEach((x, k) => (x.status === "fulfilled" ? ok++ : echecs.push(`${lot[k].email} (${x.reason instanceof Error ? x.reason.message : "erreur"})`)));
    // A refused key or sender: no need to go on.
    if (!ok && echecs.length && /clé|expéditeur/.test(echecs[0])) break;
  }
  return { ok, echecs };
}
