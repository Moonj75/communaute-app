"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Frame shown on screen (portrait 5:6, same shape as the photo on the player card). */
const W = 300;
const H = 360;
/** Size of the picture that is sent. */
const OUT_W = 600;
const OUT_H = 720;

type Etat = { zoom: number; x: number; y: number };

/**
 * Crop window: drag the picture to place it, zoom with the slider, the mouse wheel or two fingers.
 * Only the part inside the frame is kept.
 */
export default function Recadrage({ src, onValider, onAnnuler }: { src: string; onValider: (b: Blob) => void; onAnnuler: () => void }) {
  const img = useRef<HTMLImageElement | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [e, setE] = useState<Etat>({ zoom: 1, x: 0, y: 0 });
  const pointeurs = useRef(new Map<number, { x: number; y: number }>());
  const pince = useRef<{ dist: number; zoom: number } | null>(null);

  const base = nat ? Math.max(W / nat.w, H / nat.h) : 1;

  const borner = useCallback(
    (s: Etat): Etat => {
      if (!nat) return s;
      const zoom = Math.min(4, Math.max(1, s.zoom));
      const dw = nat.w * base * zoom;
      const dh = nat.h * base * zoom;
      return { zoom, x: Math.min(0, Math.max(W - dw, s.x)), y: Math.min(0, Math.max(H - dh, s.y)) };
    },
    [nat, base],
  );

  useEffect(() => {
    const i = new Image();
    i.onload = () => {
      img.current = i;
      const n = { w: i.naturalWidth, h: i.naturalHeight };
      setNat(n);
      const b = Math.max(W / n.w, H / n.h);
      setE({ zoom: 1, x: (W - n.w * b) / 2, y: (H - n.h * b) / 2 });
    };
    i.src = src;
  }, [src]);

  /** Zoom keeping the centre of the frame (or a given point) still. */
  const zoomer = useCallback(
    (z: number, cx = W / 2, cy = H / 2) =>
      setE((s) => {
        const ancien = base * s.zoom;
        const nz = Math.min(4, Math.max(1, z));
        const neuf = base * nz;
        const px = (cx - s.x) / ancien;
        const py = (cy - s.y) / ancien;
        return borner({ zoom: nz, x: cx - px * neuf, y: cy - py * neuf });
      }),
    [base, borner],
  );

  const down = (ev: React.PointerEvent) => {
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    pointeurs.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointeurs.current.size === 2) {
      const [a, b] = [...pointeurs.current.values()];
      pince.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: e.zoom };
    }
  };
  const move = (ev: React.PointerEvent) => {
    const avant = pointeurs.current.get(ev.pointerId);
    if (!avant) return;
    pointeurs.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointeurs.current.size === 2 && pince.current) {
      const [a, b] = [...pointeurs.current.values()];
      zoomer((pince.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pince.current.dist);
    } else if (pointeurs.current.size === 1) {
      const k = W / (ev.currentTarget as HTMLElement).clientWidth; // screen px → frame px
      setE((s) => borner({ ...s, x: s.x + (ev.clientX - avant.x) * k, y: s.y + (ev.clientY - avant.y) * k }));
    }
  };
  const up = (ev: React.PointerEvent) => {
    pointeurs.current.delete(ev.pointerId);
    if (pointeurs.current.size < 2) pince.current = null;
  };

  const valider = () => {
    if (!img.current || !nat) return;
    const c = document.createElement("canvas");
    c.width = OUT_W;
    c.height = OUT_H;
    const k = OUT_W / W;
    const s = base * e.zoom;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0b0a0a";
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img.current, e.x * k, e.y * k, nat.w * s * k, nat.h * s * k);
    c.toBlob((b) => b && onValider(b), "image/jpeg", 0.88);
  };

  useEffect(() => {
    const esc = (ev: KeyboardEvent) => ev.key === "Escape" && onAnnuler();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onAnnuler]);

  return (
    <div className="crop-bg" role="dialog" aria-modal="true" aria-label="Recadrer la photo">
      <div className="crop">
        <h3>Recadrer la photo</h3>
        <p className="muted small">Glisse la photo pour la placer, zoome avec le curseur (ou avec deux doigts).</p>
        <div
          className="crop-frame"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onWheel={(ev) => {
            const r = ev.currentTarget.getBoundingClientRect();
            const k = W / r.width;
            zoomer(e.zoom * (ev.deltaY < 0 ? 1.08 : 1 / 1.08), (ev.clientX - r.left) * k, (ev.clientY - r.top) * k);
          }}
        >
          {nat ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                width: `${((nat.w * base * e.zoom) / W) * 100}%`,
                left: `${(e.x / W) * 100}%`,
                top: `${(e.y / H) * 100}%`,
              }}
            />
          ) : (
            <span className="muted">Chargement…</span>
          )}
          <span className="crop-grid" aria-hidden="true" />
        </div>
        <label className="crop-zoom">
          <span aria-hidden="true">➖</span>
          <input type="range" min={1} max={4} step={0.01} value={e.zoom} onChange={(ev) => zoomer(Number(ev.currentTarget.value))} aria-label="Zoom" />
          <span aria-hidden="true">➕</span>
        </label>
        <div className="crop-act">
          <button type="button" className="btn" onClick={onAnnuler}>
            Annuler
          </button>
          <button type="button" className="btn primary" onClick={valider} disabled={!nat}>
            ✓ Valider
          </button>
        </div>
      </div>
    </div>
  );
}
