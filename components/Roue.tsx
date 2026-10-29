"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trophee } from "./Trophee";
import { classeRang, motRang } from "@/lib/palmares-types";
import "./roue.css";

/** One result of the wheel. */
export type Cran = { id: string; place: number | null; equipe: boolean; qui: string; competition: string; categorie: string | null; saison: string | null };

const H_C = 150; // highlighted card
const H_V = 50; // neighbours
const ECART = 6;

/**
 * Palmarès « wheel »: the results pass one after the other through the middle of a fixed frame,
 * where the current one is shown big, like on the player fiche (dark card, cup or medal, rank word).
 * The band goes down: the next result comes from above. Home: automatic; palmarès page: by hand
 * (swipe, wheel, arrows, or a tap on a neighbour), the highlighted card always stays in the middle.
 */
export default function Roue({ crans, auto = false, voisins: maxV = 3, duree = 5000, debut = 0, surChange, outil }: { crans: Cran[]; auto?: boolean; voisins?: number; duree?: number; debut?: number; surChange?: (i: number) => void; /** Small tool on the highlighted card (staff: remove). */ outil?: (c: Cran) => React.ReactNode }) {
  const n = crans.length;
  const [i, setI] = useState(Math.min(debut, Math.max(0, n - 1)));
  const [pause, setPause] = useState(false);
  const y0 = useRef<number | null>(null);
  // The frame takes the height left on the screen (CSS); as many neighbours as fit are shown.
  const boite = useRef<HTMLDivElement>(null);
  const [haut, setHaut] = useState(0);
  useEffect(() => {
    const b = boite.current;
    if (!b) return;
    const maj = () => setHaut(b.clientHeight);
    maj();
    const ro = new ResizeObserver(maj);
    ro.observe(b);
    return () => ro.disconnect();
  }, []);
  const voisins = haut ? Math.max(1, Math.min(maxV, Math.floor((haut - H_C - 8) / 2 / (H_V + ECART)))) : Math.min(2, maxV);
  const roule = useRef(0);
  useEffect(() => { setI((v) => (v >= n ? 0 : v)); }, [n]);
  const aller = useCallback((k: number) => { if (!n) return; const v = ((k % n) + n) % n; setI(v); surChange?.(v); }, [n, surChange]);
  useEffect(() => {
    if (!auto || pause || n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => aller(i + 1), duree);
    return () => clearTimeout(t);
  }, [auto, pause, n, i, duree, aller]);
  if (!n) return <p className="vide">Pas encore de résultat… le premier arrive ! 💪</p>;
  const boucle = n > voisins * 2 + 1;
  // Distance of item k to the middle: < 0 above (coming), > 0 below (gone).
  const ecart = (k: number) => {
    let e = k - i;
    if (boucle) { e = ((e % n) + n) % n; if (e > n / 2) e -= n; }
    return -e;
  };
  const pos = (d: number) => (d === 0 ? 0 : Math.sign(d) * (H_C / 2 + ECART + (Math.abs(d) - 1) * (H_V + ECART) + H_V / 2));
  return (
    <div className="roue-bloc">
    <div ref={boite} className={`roue${auto ? " auto" : ""}`}
      onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}
      onWheel={(e) => { if (auto) return; const t = Date.now(); if (t - roule.current < 260 || Math.abs(e.deltaY) < 8) return; roule.current = t; aller(i + (e.deltaY > 0 ? 1 : -1)); }}
      onTouchStart={(e) => { setPause(true); y0.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => {
        const d = y0.current === null ? 0 : e.changedTouches[0].clientY - y0.current;
        // The band goes down: pulling it down shows the next one.
        if (Math.abs(d) > 30) aller(i + (d > 0 ? 1 : -1) * Math.max(1, Math.round(Math.abs(d) / 90)));
        y0.current = null;
        window.setTimeout(() => setPause(false), 6000);
      }}
      onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); aller(i + 1); } if (e.key === "ArrowUp") { e.preventDefault(); aller(i - 1); } }}
      tabIndex={0} aria-roledescription="carrousel" aria-label="Palmarès"
    >
      <span className="roue-guide" aria-hidden="true" style={{ height: H_C + 8 }} />
      {crans.map((c, k) => {
        const d = ecart(k);
        if (Math.abs(d) > voisins + 1) return null;
        const p = c.place;
        const centre = d === 0;
        const rc = classeRang(p);
        return (
          <div key={c.id} className={`rc ${rc}${centre ? " c" : ""}`} aria-hidden={!centre}
            style={{ height: centre ? H_C : H_V, transform: `translateY(${pos(d) - (centre ? H_C : H_V) / 2}px)`, opacity: Math.abs(d) > voisins ? 0 : centre ? 1 : Math.abs(d) === 1 ? 0.8 : 0.45, zIndex: 10 - Math.abs(d) }}
            onClick={() => !centre && aller(k)}>
            {centre ? (
              <>
                {outil ? <span className="rc-outil">{outil(c)}</span> : null}
                <span className="rc-ic"><Trophee key={`${c.id}-${i}`} place={p} equipe={c.equipe} taille={p === 1 ? 104 : 84} /></span>
                <span className="rc-t">
                  <span className={`rc-mot ${rc}`}>{motRang(p)}</span>
                  <b className="rc-qui">{c.qui}</b>
                  <span className="rc-co">{c.competition}</span>
                  <span className="rc-pied">
                    <span className={`pk-badge ${c.equipe ? "eq" : "in"}`}>{c.equipe ? "👥 Par équipe" : "👤 Individuel"}</span>
                    {c.categorie ? <span className="rc-cat">{c.categorie}</span> : null}
                    {c.saison ? <span className="rc-sz">{c.saison}</span> : null}
                  </span>
                </span>
              </>
            ) : (
              <>
                <Trophee place={p} equipe={c.equipe} taille={36} />
                <span className={`rc-mot ${rc}`}>{motRang(p, true)}</span>
                <span className="rc-l"><b>{c.qui}</b> · {c.competition}</span>
              </>
            )}
          </div>
        );
      })}
      {auto ? <span className="roue-barre" aria-hidden="true"><i key={i} style={{ animationDuration: `${duree}ms`, animationPlayState: pause ? "paused" : "running" }} /></span> : null}
    </div>
    {!auto ? (
      <div className="roue-fl">
        <button type="button" aria-label="Résultat précédent" onClick={() => aller(i - 1)}>▲</button>
        <span className="roue-n num">{i + 1}<small> / {n}</small></span>
        <button type="button" aria-label="Résultat suivant" onClick={() => aller(i + 1)}>▼</button>
      </div>
    ) : null}
    </div>
  );
}
