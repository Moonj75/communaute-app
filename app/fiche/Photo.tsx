"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { envoyerPhoto, retirerPhoto } from "./actions";
import Recadrage from "./Recadrage";

export default function Photo({ notionId, url, path, initiales, nom }: { notionId: string; url: string | null; path: string | null; initiales: string; nom: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; txt: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const src = apercu || url;

  const choisir = (f: File | undefined) => {
    if (!f) return;
    setMsg(null);
    if (!f.type.startsWith("image/")) {
      setMsg({ ok: false, txt: "Choisis une image (JPG ou PNG)." });
      return;
    }
    setSource(URL.createObjectURL(f));
    if (input.current) input.current.value = "";
  };

  const envoyer = (blob: Blob) => {
    if (source) URL.revokeObjectURL(source);
    setSource(null);
    setApercu(URL.createObjectURL(blob));
    start(async () => {
      const fd = new FormData();
      fd.set("photo", new File([blob], "photo.jpg", { type: "image/jpeg" }));
      const r = await envoyerPhoto(notionId, path, fd);
      if (!r.ok) {
        setApercu(null);
        setMsg({ ok: false, txt: r.message || "Erreur" });
      } else {
        if (r.message) setMsg({ ok: true, txt: r.message });
        router.refresh();
      }
    });
  };

  return (
    <div className="photo">
      <button
        type="button"
        className={`photo-box${pending ? " busy" : ""}`}
        onClick={() => input.current?.click()}
        aria-label={src ? `Changer la photo de ${nom}` : `Ajouter une photo de ${nom}`}
        disabled={pending}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`Photo de ${nom}`} />
        ) : (
          <span className="photo-ini" aria-hidden="true">{initiales}</span>
        )}
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => choisir(e.currentTarget.files?.[0])} />
      <div className="photo-act">
        <button type="button" className="btn small-btn" disabled={pending} onClick={() => input.current?.click()}>
          {pending ? "Envoi…" : src ? "📷 Changer" : "📷 Ajouter une photo"}
        </button>
        {src && !pending ? (
          <button
            type="button"
            className="linkbtn"
            onClick={() =>
              start(async () => {
                const r = await retirerPhoto(notionId, path);
                if (!r.ok) setMsg({ ok: false, txt: r.message || "Erreur" });
                else {
                  setApercu(null);
                  router.refresh();
                }
              })
            }
          >
            Retirer
          </button>
        ) : null}
      </div>
      {msg ? <p className={msg.ok ? "photo-ok" : "photo-err"}>{msg.txt}</p> : null}
      {source ? (
        <Recadrage
          src={source}
          onValider={envoyer}
          onAnnuler={() => {
            URL.revokeObjectURL(source);
            setSource(null);
          }}
        />
      ) : null}
    </div>
  );
}
