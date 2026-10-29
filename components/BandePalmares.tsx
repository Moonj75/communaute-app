"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Trophee } from "./Trophee";
import { classeRang, motRang } from "@/lib/palmares-types";

type T = { place: number | null; equipe: boolean; texte: string };

/**
 * Player fiche: the palmarès band. It slides from one result to the next and stops on each one,
 * which comes to the middle, bigger, lit up and in relief. A tap holds it a few seconds.
 */
export default function BandePalmares({ trophees, duree = 4200 }: { trophees: T[]; duree?: number }) {
  const n = trophees.length;
  const [i, setI] = useState(0);
  const [fige, setFige] = useState(0);
  const [x, setX] = useState(0);
  // One result at a time: it slides to the middle, grows, stays, shrinks back, then the next one comes.
  const [gros, setGros] = useState(false);
  const cadre = useRef<HTMLDivElement>(null);
  const piste = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const reste = fige ? 10000 : duree;
    const a = window.setTimeout(() => setGros(true), fige ? 0 : 950);
    const b = window.setTimeout(() => setGros(false), reste - 650);
    const c = window.setTimeout(() => { setFige(0); setI((v) => (v + 1) % n); }, reste);
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); };
  }, [i, n, duree, fige]);
  // The current result in the middle of the band.
  useLayoutEffect(() => {
    const c = cadre.current, p = piste.current;
    const el = p?.children[i] as HTMLElement | undefined;
    if (!c || !el) return;
    setX(c.clientWidth / 2 - (el.offsetLeft + el.offsetWidth / 2));
  }, [i, n]);
  if (!n) return null;
  return (
    <div ref={cadre} className="bp" onClick={() => setFige(Date.now())}>
      <div ref={piste} className="bp-piste" style={{ transform: `translateX(${x}px)` }}>
        {trophees.map((t, k) => (
          <span key={k} className={`bp-t ${classeRang(t.place)}${k === i ? " on" : ""}${k === i && (gros || n < 2) ? " gros" : ""}`} aria-hidden={k !== i}>
            <Trophee place={t.place} equipe={t.equipe} taille={32} delai={(k % 5) * 0.6} />
            <span className="bp-c"><em>{motRang(t.place, true)}</em><span className="bp-x">{t.texte}</span></span>
          </span>
        ))}
      </div>
    </div>
  );
}
