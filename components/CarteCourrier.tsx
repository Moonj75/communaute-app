/* Every message of the Courrier (relance, notification, message) in the same careful layout as the club e-mails:
 * coloured band with the crest and a big icon, the title, then the text on a white card. Inline styles only. */

const GENRES = {
  relance: { nom: "Relance", ic: "⏰", de: "#9a4a00", a: "#4a1600", accent: "#ffb84d" },
  notification: { nom: "Notification", ic: "🔔", de: "#0b4f6c", a: "#10233f", accent: "#ffd54a" },
  message: { nom: "Message", ic: "✉️", de: "#1d1716", a: "#4a0d0d", accent: "#ffd54a" },
} as const;

/** « 🎄 Joyeuses fêtes » → icon « 🎄 » and title « Joyeuses fêtes ». */
function separer(titre: string) {
  const m = titre.match(/^((?:\p{Extended_Pictographic}|\p{Emoji_Component}|️|‍)+)\s*/u);
  return m && /\p{Extended_Pictographic}/u.test(m[1]) ? { ic: m[1].trim(), t: titre.slice(m[0].length) } : { ic: null, t: titre };
}

export default function CarteCourrier({ type, titre, texte, de }: { type: string; titre: string; texte: string | null; de?: string | null }) {
  const g = GENRES[(type in GENRES ? type : "message") as keyof typeof GENRES];
  const { ic, t } = separer(titre);
  const paras = (texte || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,.25)", margin: "4px 0 12px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div style={{ background: `linear-gradient(135deg, ${g.de}, ${g.a})`, padding: "20px 16px 18px", textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/crest.png" width={52} height={52} alt="" style={{ display: "block", margin: "0 auto 6px" }} />
        <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: g.accent, fontWeight: 700 }}>SC Lions d&apos;Eugies · {g.nom}</div>
        <div style={{ fontSize: 34, lineHeight: 1, margin: "10px 0 4px" }} aria-hidden="true">{ic || g.ic}</div>
        <div style={{ margin: 0, fontSize: 22, lineHeight: 1.2, color: "#fff", fontStyle: "italic", fontWeight: 800 }}>{t}</div>
      </div>
      <div style={{ height: 4, background: g.accent }} />
      <div style={{ padding: "18px 18px 14px", color: "#2b2523" }}>
        {paras.length
          ? paras.map((p, i) => (
              <p key={i} style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.55, color: "#2b2523", whiteSpace: "pre-line" }}>{p}</p>
            ))
          : <p style={{ margin: "0 0 12px", fontSize: 15, color: "#8b827c" }}>—</p>}
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "#8b827c", borderTop: "1px solid #eee7dd", paddingTop: 10 }}>— {de || "SC Lions d'Eugies"}</p>
      </div>
    </div>
  );
}
