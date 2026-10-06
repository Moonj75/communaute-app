"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { envoyerPhoto, retirerPhoto } from "./actions";

/** Shrinks the picture in the browser (max 800 px, JPEG) before sending it. */
async function reduire(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const max = 800;
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error("conversion"))), "image/jpeg", 0.85));
}

export default function Photo({ notionId, url, path, initiales, nom }: { notionId: string; url: string | null; path: string | null; initiales: string; nom: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const src = apercu || url;

  const choisir = (f: File | undefined) => {
    if (!f) return;
    setMsg(null);
    start(async () => {
      try {
        const blob = await reduire(f);
        setApercu(URL.createObjectURL(blob));
        const fd = new FormData();
        fd.set("photo", new File([blob], "photo.jpg", { type: "image/jpeg" }));
        const r = await envoyerPhoto(notionId, path, fd);
        if (!r.ok) {
          setApercu(null);
          setMsg(r.message || "Erreur");
        } else router.refresh();
      } catch {
        setApercu(null);
        setMsg("Cette image n'a pas pu être lue. Essaie une photo JPG ou PNG.");
      }
      if (input.current) input.current.value = "";
    });
  };

  return (
    <div className="photo">
      <div className={`photo-box${pending ? " busy" : ""}`}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`Photo de ${nom}`} />
        ) : (
          <span className="photo-ini" aria-hidden="true">{initiales}</span>
        )}
      </div>
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
                if (!r.ok) setMsg(r.message || "Erreur");
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
      {msg ? <p className="photo-err">{msg}</p> : null}
    </div>
  );
}
