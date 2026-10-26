"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type Gain = { id: string; montant: number; libelle: string; valide_le: string };
const euro = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** Slot-machine « ting-ting » and a little rain of coins, made by the browser (no sound file). */
function ting() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    const ac = new AC();
    if (ac.state === "suspended") { void ac.resume(); }
    if (ac.state !== "running") { void ac.close(); return false; }
    const t0 = ac.currentTime + 0.02;
    const maitre = ac.createGain();
    maitre.gain.value = 0.32;
    maitre.connect(ac.destination);
    const note = (f: number, t: number, d: number, type: OscillatorType = "triangle", v = 1) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(maitre);
      o.start(t);
      o.stop(t + d + 0.02);
      // A bell sounds with a higher overtone.
      const h = ac.createOscillator();
      const hg = ac.createGain();
      h.type = "sine";
      h.frequency.setValueAtTime(f * 2.76, t);
      hg.gain.setValueAtTime(0.0001, t);
      hg.gain.exponentialRampToValueAtTime(v * 0.35, t + 0.005);
      hg.gain.exponentialRampToValueAtTime(0.0001, t + d * 0.5);
      h.connect(hg).connect(maitre);
      h.start(t);
      h.stop(t + d);
    };
    // « Ting-ting » then the coins falling into the tray.
    note(1318.5, t0, 0.5);
    note(1975.5, t0 + 0.12, 0.9);
    for (let i = 0; i < 9; i++) note(2400 + Math.random() * 1600, t0 + 0.45 + i * 0.055 + Math.random() * 0.02, 0.12, "square", 0.12);
    window.setTimeout(() => void ac.close(), 2000);
    return true;
  } catch {
    return false;
  }
}

/**
 * « +20 € » pop-up when the kitty goes up: on opening the app (gains not seen yet) and live,
 * when the notification arrives while the app is open.
 */
export default function PluieGain({ gains, cle }: { gains: Gain[]; cle: string }) {
  const k = `cag-vu:${cle.toLowerCase()}`;
  const [montre, setMontre] = useState<{ total: number; libelle: string; n: number } | null>(null);
  const [sortie, setSortie] = useState(false);
  const fin = useRef<number | null>(null);
  const sonFait = useRef(false);

  const fermer = useCallback(() => {
    setSortie(true);
    window.setTimeout(() => { setMontre(null); setSortie(false); }, 380);
  }, []);

  const afficher = useCallback((total: number, libelle: string, n: number) => {
    sonFait.current = ting();
    setSortie(false);
    setMontre({ total, libelle, n });
    if (fin.current) clearTimeout(fin.current);
    fin.current = window.setTimeout(fermer, 7000);
  }, [fermer]);

  // On opening: the gains validated since the last visit.
  useEffect(() => {
    let vu: string | null = null;
    try { vu = localStorage.getItem(k); } catch { /* storage unavailable */ }
    // First time on this device: only the gains of the last 3 days.
    const seuil = vu || new Date(Date.now() - 3 * 864e5).toISOString();
    const neufs = gains.filter((g) => g.valide_le > seuil);
    const dernier = gains.length ? gains[gains.length - 1].valide_le : seuil;
    try { localStorage.setItem(k, dernier > seuil ? dernier : seuil); } catch { /* storage unavailable */ }
    if (!neufs.length) return;
    const total = Math.round(neufs.reduce((s, g) => s + g.montant, 0) * 100) / 100;
    const t = window.setTimeout(() => afficher(total, neufs.length === 1 ? neufs[0].libelle : `${neufs.length} gains`, neufs.length), 900);
    return () => clearTimeout(t);
  }, [gains, k, afficher]);

  // Live: the service worker passes on the kitty notifications while the app is open.
  useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw) return;
    const recu = (e: MessageEvent) => {
      const d = e.data || {};
      if (d.type !== "cagnotte" || !(d.montant > 0)) return;
      try { localStorage.setItem(k, new Date().toISOString()); } catch { /* storage unavailable */ }
      afficher(Number(d.montant), String(d.libelle || "Cagnotte"), 1);
    };
    sw.addEventListener("message", recu);
    return () => sw.removeEventListener("message", recu);
  }, [k, afficher]);

  // Browsers only allow sound after a tap: if it was blocked, it plays on the first tap.
  useEffect(() => {
    if (!montre || sonFait.current) return;
    const go = () => { if (!sonFait.current) sonFait.current = ting(); };
    window.addEventListener("pointerdown", go, { once: true });
    return () => window.removeEventListener("pointerdown", go);
  }, [montre]);

  if (!montre) return null;
  return (
    <div className={`pg${sortie ? " sort" : ""}`} role="status" aria-live="polite">
      <div className="pg-pieces" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => <i key={i} style={{ "--x": `${(i * 37) % 100}%`, "--d": `${(i % 7) * 0.09}s`, "--r": `${(i * 53) % 360}deg` } as React.CSSProperties} />)}
      </div>
      <Link href="/fiche" className="pg-carte" onClick={fermer}>
        <span className="pg-ic" aria-hidden="true">💰</span>
        <span className="pg-txt">
          <b className="pg-mt num">+{euro.format(montre.total)}</b>
          <small>{montre.n > 1 ? `${montre.libelle} dans ta cagnotte` : `${montre.libelle} · dans ta cagnotte`}</small>
        </span>
      </Link>
      <button type="button" className="pg-x" onClick={fermer} aria-label="Fermer">✕</button>
    </div>
  );
}
