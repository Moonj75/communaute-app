/* Club e-mails (season's greetings, new season…): the themes and the HTML of the e-mail.
 * Pure functions: the same HTML is shown in the preview and sent. Inline styles only (e-mail clients). */

export type ThemeMail = { id: string; nom: string; ic: string; de: string; a: string; accent: string; sujet: string; titre: string; texte: string; bouton?: string; lien?: string };

export const SITE = "https://lions-eugies.vercel.app";

export const THEMES: ThemeMail[] = [
  { id: "fetes", nom: "Joyeuses fêtes", ic: "🎄", de: "#0f5132", a: "#7a1020", accent: "#e8b923", sujet: "🎄 Joyeuses fêtes de la part des Lions d'Eugies", titre: "Joyeuses fêtes !", texte: "Toute l'équipe des Lions d'Eugies vous souhaite, à vous et à vos proches, de très belles fêtes de fin d'année.\n\nMerci pour cette belle saison passée ensemble autour des terrains. Profitez bien de ces moments en famille !" },
  { id: "annee", nom: "Bonne année", ic: "🎆", de: "#1b1f4b", a: "#5b2a86", accent: "#ffd54a", sujet: "🎆 Bonne année avec les Lions d'Eugies", titre: "Bonne année !", texte: "Que cette nouvelle année vous apporte santé, joie… et de beaux matchs !\n\nOn se retrouve très vite au club pour de nouveaux défis." },
  { id: "reprise", nom: "Reprise de la saison", ic: "⚽", de: "#0b6f78", a: "#0d3b66", accent: "#ffd54a", sujet: "⚽ C'est la reprise aux Lions d'Eugies !", titre: "C'est la reprise !", texte: "La nouvelle saison arrive et nous avons hâte de vous retrouver.\n\nEntraînements, compétitions, championnat du club : tout le programme est dans l'application.", bouton: "Ouvrir l'application", lien: SITE },
  { id: "bravo", nom: "Félicitations", ic: "🏆", de: "#8a6400", a: "#3a2a00", accent: "#ffe27a", sujet: "🏆 Bravo de la part des Lions d'Eugies", titre: "Félicitations !", texte: "Un grand bravo pour ces superbes résultats. Le club est fier de vous !" },
  { id: "libre", nom: "Message libre", ic: "✉️", de: "#1d1716", a: "#4a0d0d", accent: "#ffd54a", sujet: "Des nouvelles des Lions d'Eugies", titre: "Des nouvelles du club", texte: "" },
];

const echap = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type ContenuMail = { theme: string; titre: string; texte: string; signature: string; bouton?: string; lien?: string; salutation: boolean };

/** HTML of the e-mail for one person (« Bonjour Mathéo, » when the first name is known). */
export function construireMail(c: ContenuMail, prenom: string | null): string {
  const t = THEMES.find((x) => x.id === c.theme) || THEMES[THEMES.length - 1];
  const paras = c.texte.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2b2523;">${echap(p).replace(/\n/g, "<br>")}</p>`).join("");
  const bonjour = c.salutation ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2b2523;">Bonjour${prenom ? ` ${echap(prenom)}` : ""},</p>` : "";
  const lienOk = c.lien && /^https?:\/\//i.test(c.lien) ? c.lien : "";
  const bouton = c.bouton && lienOk ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto 20px;"><tr><td style="border-radius:999px;background:${t.de};"><a href="${echap(lienOk)}" style="display:inline-block;padding:13px 28px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">${echap(c.bouton)}</a></td></tr></table>` : "";
  const sign = c.signature.trim() ? `<p style="margin:24px 0 0;font-size:15px;line-height:1.5;color:#2b2523;">${echap(c.signature.trim()).replace(/\n/g, "<br>")}</p>` : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${echap(c.titre)}</title></head>
<body style="margin:0;padding:0;background:#f1eee8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1eee8;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.12);">
<tr><td align="center" style="background:${t.de};background-image:linear-gradient(135deg,${t.de},${t.a});padding:30px 20px 26px;">
<img src="${SITE}/crest.png" width="76" height="76" alt="SC Lions d'Eugies" style="display:block;margin:0 auto 10px;border:0;">
<div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${t.accent};font-weight:bold;">SC Lions d'Eugies</div>
<div style="font-size:44px;line-height:1;margin:14px 0 6px;">${t.ic}</div>
<h1 style="margin:0;font-size:30px;line-height:1.15;color:#ffffff;font-style:italic;font-weight:800;">${echap(c.titre)}</h1>
</td></tr>
<tr><td style="height:5px;background:${t.accent};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:30px 30px 12px;">${bonjour}${paras}${bouton}${sign}</td></tr>
<tr><td align="center" style="padding:18px 24px 26px;border-top:1px solid #eee7dd;">
<a href="${SITE}" style="font-size:13px;color:${t.de};font-weight:bold;text-decoration:none;">🦁 lions-eugies.vercel.app</a>
<p style="margin:8px 0 0;font-size:11px;color:#8b827c;">Vous recevez ce message en tant que membre du SC Lions d'Eugies.</p>
</td></tr></table></td></tr></table></body></html>`;
}

/** Plain text version (for e-mail clients without HTML). */
export function texteBrut(c: ContenuMail, prenom: string | null) {
  return [c.salutation ? `Bonjour${prenom ? ` ${prenom}` : ""},` : "", c.titre, c.texte, c.bouton && c.lien ? `${c.bouton} : ${c.lien}` : "", c.signature, `— SC Lions d'Eugies · ${SITE}`].filter(Boolean).join("\n\n");
}
