"use client";

import { useState } from "react";

function b64url(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Creates the VAPID key pair in YOUR browser (never sent anywhere), to paste into Vercel. */
export default function Cles() {
  const [cles, setCles] = useState<{ pub: string; priv: string; cron: string } | null>(null);
  const [copie, setCopie] = useState<string | null>(null);

  const generer = async () => {
    const k = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    const pub = b64url(await crypto.subtle.exportKey("raw", k.publicKey));
    const jwk = await crypto.subtle.exportKey("jwk", k.privateKey);
    const alea = new Uint8Array(24);
    crypto.getRandomValues(alea);
    setCles({ pub, priv: jwk.d || "", cron: b64url(alea.buffer) });
  };
  const copier = async (nom: string, v: string) => {
    await navigator.clipboard.writeText(v);
    setCopie(nom);
    setTimeout(() => setCopie(null), 1500);
  };

  if (!cles)
    return (
      <button type="button" className="btn primary" onClick={generer}>
        🔑 Générer mes clés
      </button>
    );
  const lignes: [string, string][] = [
    ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", cles.pub],
    ["VAPID_PRIVATE_KEY", cles.priv],
    ["CRON_SECRET", cles.cron],
  ];
  return (
    <div className="cles">
      <p className="small muted">Ces clés viennent d&apos;être créées dans ton navigateur. Colle chacune dans Vercel → Settings → Environment Variables (nom à gauche, valeur à droite), puis redéploie. Ne les partage avec personne.</p>
      {lignes.map(([nom, v]) => (
        <div key={nom} className="cle">
          <code className="cle-n">{nom}</code>
          <code className="cle-v">{v.slice(0, 12)}…</code>
          <button type="button" className="btn small-btn" onClick={() => copier(nom, v)}>
            {copie === nom ? "Copié ✓" : "Copier la valeur"}
          </button>
        </div>
      ))}
    </div>
  );
}
