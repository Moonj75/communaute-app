"use client";

import { useEffect, useRef, useState } from "react";
import { Trophee } from "./Trophee";
import { classeRang, motRang, type Exploit } from "@/lib/palmares-types";
import "./palmares.css";

const DUREE = 3000;

/**
 * Home page showcase of the palmarès: the big trophy (cup for a victory, medal with its place otherwise)
 * with « VICTOIRE » / « FINALE » written big, then a row of cards (trophy + event + season) that moves on by itself.
 * Touch to pause, swipe or tap a card to choose.
 */
export default function Vitrine({ exploits }: { exploits: Exploit[] }) {
  const [i, setI] = useState(0);
  const [pause, setPause] = useState(false);
  const x0 = useRef<number | null>(null);
  const piste = useRef<HTMLDivElement>(null);
  const n = exploits.length;
  useEffect(() => {
    if (pause || n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setI((v) => (v + 1) % n), DUREE);
    return () => clearTimeout(t);
  }, [pause, n, i]);
  // The current card stays in view (the row slides along).
  useEffect(() => {
    const el = piste.current?.children[i] as HTMLElement | undefined;
    const p = piste.current?.parentElement;
    if (el && p) p.scrollTo({ left: Math.max(0, el.offsetLeft - 8), behavior: "smooth" });
  }, [i]);
  if (!n) return null;
  const x = exploits[i];
  const choisir = (k: number) => { setI(((k % n) + n) % n); setPause(true); window.setTimeout(() => setPause(false), 6000); };
  return (
    <div
      className={`vt ${classeRang(x.place)}`}
      aria-roledescription="carrousel"
      aria-label="Palmarès du club"
      onTouchStart={(e) => { setPause(true); x0.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const d = x0.current === null ? 0 : e.changedTouches[0].clientX - x0.current;
        if (Math.abs(d) > 40) choisir(i + (d < 0 ? 1 : -1));
        x0.current = null;
        window.setTimeout(() => setPause(false), 5000);
      }}
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
    >
      <div className="vt-h" key={x.id}>
        <span className="vt-ic"><Trophee place={x.place} equipe={x.equipe} taille={108} /></span>
        <div className="vt-t">
          <div className={`vt-mot ${classeRang(x.place)}`}>{motRang(x.place)}</div>
          <h4>{x.competition}</h4>
          <p>{[x.qui, x.categorie, x.saison].filter(Boolean).join(" · ")}</p>
          {x.equipe ? <span className="vt-eq">👥 Par équipe</span> : null}
        </div>
      </div>
      <div className="vt-cartes">
        <div className="vt-piste" ref={piste}>
          {exploits.map((e, k) => (
            <button key={e.id} type="button" className={`vt-c${k === i ? " on" : ""}`} onClick={() => choisir(k)} aria-label={`${motRang(e.place)} · ${e.competition}`}>
              <Trophee place={e.place} equipe={e.equipe} taille={30} delai={(k % 5) * 0.5} />
              <b>{e.competition}</b>
              <small>{e.saison || ""}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
