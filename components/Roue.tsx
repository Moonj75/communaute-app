"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trophee } from "./Trophee";
import { classeRang, libSaison, motRang } from "@/lib/palmares-types";
import Drapeau from "./Drapeau";
import { NOM_PAYS } from "@/lib/drapeaux";
import { couleurCategorie } from "@/lib/classements-types";
import "./roue.css";

/** The name on its plaque: first name small, family name big (several players: one per line). */
/** « Team A »: TEAM big, the letter small (a club team, not a player). */
const equipeDe = (x: string) => x.trim().match(/^team\s+(.+)$/i);
function Equipe({ x }: { x: RegExpMatchArray }) {
  return <span className="rc-team"><b className="rc-nom">Team</b><small>{x[1]}</small></span>;
}
function nomBeau(qui: string) {
  const tous = qui.split(/\s*,\s*/).filter(Boolean);
  const eq = tous.map(equipeDe).find(Boolean);
  const gens = tous.filter((g) => !equipeDe(g));
  if (eq) return <>{<Equipe x={eq} />}{gens.length ? <span className="rc-plusieurs petit">{gens.map((g) => <b key={g}>{g}</b>)}</span> : null}</>;
  if (gens.length > 1) return <span className="rc-plusieurs">{gens.map((g) => <b key={g}>{g}</b>)}</span>;
  const m = qui.trim().split(/\s+/);
  const prenom = m.length > 1 ? m[0] : "";
  const nom = m.length > 1 ? m.slice(1).join(" ") : m[0] || "?";
  // Long family names get a smaller size, so they are never cut in the middle of a word.
  const lg = Math.max(...nom.split(/\s+/).map((x) => x.length));
  return <>{prenom ? <span className="rc-pre">{prenom}</span> : null}<b className={`rc-nom${lg > 11 ? " tres-long" : lg > 8 ? " long" : ""}`}>{nom}</b></>;
}

/** One result of the wheel. */
export type Cran = { id: string; place: number | null; equipe: boolean; qui: string; competition: string; categorie: string | null; saison: string | null; date?: string | null; scoreFinale?: string | null; adversaire?: string | null; /** Country of the tournament (flag). */ pays?: string | null; /** Above the cup: « club » (Eugies crest) or a country code (national team). */ embleme?: string | null };

/** « 12 octobre 2025 », or the season when the day is not known. */
function Quand({ c }: { c: Cran }) {
  if (!c.date) return c.saison ? <span className="rc-date"><small>Saison</small><b>{libSaison(c.saison)}</b></span> : null;
  const d = new Date(c.date.slice(0, 10) + "T12:00:00Z");
  const mois = d.toLocaleDateString("fr-BE", { month: "long", timeZone: "UTC" });
  // Two neat lines: « 4 octobre » then the year.
  return <span className="rc-date"><b>{d.getUTCDate()} {mois}</b><small>{d.getUTCFullYear()}</small></span>;
}
/** Pause after a tap on the card or on an arrow, before the wheel goes on by itself. */
const ARRET = 12000;

const H_C = 168; // highlighted card
const H_V = 50; // neighbours
const ECART = 6;

/**
 * Palmarès « wheel »: the results pass one after the other through the middle of a fixed frame,
 * where the current one is shown big, like on the player fiche (dark card, cup or medal, rank word).
 * The band goes down: the next result comes from above. Home: automatic; palmarès page: by hand
 * (swipe, wheel, arrows, or a tap on a neighbour), the highlighted card always stays in the middle.
 */
export default function Roue({ crans, auto = false, voisins: maxV = 3, duree = 7000, debut = 0, surChange, outil, compact = false }: { crans: Cran[]; auto?: boolean; /** Home page: a shorter frame. */ compact?: boolean; voisins?: number; duree?: number; debut?: number; surChange?: (i: number) => void; /** Small tool on the highlighted card (staff: remove). */ outil?: (c: Cran) => React.ReactNode }) {
  const n = crans.length;
  const [i, setI] = useState(Math.min(debut, Math.max(0, n - 1)));
  const [pause, setPause] = useState(false);
  // Held still (tap on the highlighted card, arrows, swipe): the wheel waits, then goes on gently.
  const [fige, setFige] = useState(0);
  const arreter = useCallback(() => setFige(Date.now()), []);
  useEffect(() => {
    if (!fige) return;
    const t = window.setTimeout(() => setFige(0), ARRET);
    return () => clearTimeout(t);
  }, [fige]);
  const arret = pause || fige > 0;
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
    if (!auto || arret || n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => aller(i + 1), duree);
    return () => clearTimeout(t);
  }, [auto, arret, n, i, duree, aller]);
  const pas = (k: number) => { arreter(); aller(i + k); };
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
    <div ref={boite} className={`roue${compact ? " auto" : ""}`}
      onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}
      onWheel={(e) => { const t = Date.now(); if (t - roule.current < 260 || Math.abs(e.deltaY) < 8) return; roule.current = t; pas(e.deltaY > 0 ? 1 : -1); }}
      onTouchStart={(e) => { y0.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => {
        const d = y0.current === null ? 0 : e.changedTouches[0].clientY - y0.current;
        // The band goes down: pulling it down shows the next one.
        if (Math.abs(d) > 30) { arreter(); aller(i + (d > 0 ? 1 : -1) * Math.max(1, Math.round(Math.abs(d) / 90))); }
        y0.current = null;
      }}
      onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); pas(1); } if (e.key === "ArrowUp") { e.preventDefault(); pas(-1); } }}
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
          <div key={c.id} className={`rc ${rc}${centre ? " c" : ""}${centre && fige ? " fige" : ""}`} aria-hidden={!centre}
            style={{ height: centre ? H_C : H_V, transform: `translateY(${pos(d) - (centre ? H_C : H_V) / 2}px)`, opacity: Math.abs(d) > voisins ? 0 : centre ? 1 : Math.abs(d) === 1 ? 0.8 : 0.45, zIndex: 10 - Math.abs(d) }}
            onClick={() => { arreter(); if (!centre) aller(k); }}>
            {centre ? (
              <>
                {outil ? <span className="rc-outil">{outil(c)}</span> : null}
                {/* Left: the cup (place written on it), the rank word, individual or team. */}
                <span className="rc-g">
                  <span className="rc-ic"><Trophee key={`${c.id}-${i}`} place={p} equipe={c.equipe} taille={p === 1 ? 74 : 62} /></span>
                  <span className={`rc-mot ${rc}`}>{motRang(p, true)}</span>
                  <span className={`pk-badge ${c.equipe ? "eq" : "in"}`}>{c.equipe ? "👥 Équipe" : "👤 Individuel"}</span>
                </span>
                {/* Middle: who. */}
                <span className="rc-m">
                  {/* Above the player: for whom he played — the club (Eugies crest) or Belgium (national team). */}
                  {c.embleme ? (
                    <span className={`rc-em${c.embleme === "club" ? " club" : " pays"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {c.embleme === "club" ? <img src="/crest.png" alt="" /> : <Drapeau code={c.embleme} />}
                      <small>{c.embleme === "club" ? "Eugies" : NOM_PAYS[c.embleme] || c.embleme}</small>
                    </span>
                  ) : null}
                  {nomBeau(c.qui)}{c.categorie ? <span className="rc-mcat" style={couleurCategorie(c.categorie) ? ({ "--cc": couleurCategorie(c.categorie) } as React.CSSProperties) : undefined}>{c.categorie}</span> : null}</span>
                {/* Right: the event, big. */}
                <span className="rc-d">
                  {c.pays ? <span className="rc-flag"><Drapeau code={c.pays} /></span> : null}
                  <b className="rc-ev">{c.competition}</b>
                  <Quand c={c} />
                  {c.scoreFinale || c.adversaire ? <span className="rc-fin">⚔️{c.scoreFinale ? <b className="num"> {c.scoreFinale.replace("-", "–")}</b> : null}{c.adversaire ? <> vs <b>{c.adversaire}</b></> : null}</span> : null}
                </span>
              </>
            ) : (
              <>
                <span className="rc-vg"><Trophee place={p} equipe={c.equipe} taille={34} /><span className={`rc-mot ${rc}`}>{motRang(p, true)}</span></span>
                <b className="rc-vn">{c.qui}</b>
                <span className="rc-ve"><Drapeau code={c.pays ?? null} />{c.competition}</span>
              </>
            )}
          </div>
        );
      })}
      {auto ? <span className="roue-barre" aria-hidden="true"><i key={`${i}-${fige}`} style={{ animationDuration: `${duree}ms`, animationPlayState: arret ? "paused" : "running" }} /></span> : null}
      {fige ? <span className="roue-fige" key={fige}>⏸ Arrêté un instant<i style={{ animationDuration: `${ARRET}ms` }} /></span> : null}
    </div>
    <div className={`roue-fl${compact ? " petit" : ""}`}>
      <button type="button" aria-label="Résultat précédent" onClick={() => pas(-1)}>▲</button>
      <span className="roue-n num">{i + 1}<small> / {n}</small></span>
      <button type="button" aria-label="Résultat suivant" onClick={() => pas(1)}>▼</button>
    </div>
    </div>
  );
}
