"use client";

import type React from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogoClub } from "./Classements";
import { couleurCategorie, libelleMois, pts, resserrer, tendance, type LigneClassement } from "@/lib/classements-types";

const sup = (n: number) => (n === 1 ? "er" : "e");

/**
 * « Le club » block: a National / International switch, then side by side
 * the club's ranking (clubs or club teams) and our players' ranking for the same scope.
 */
export default function ClubDuo({ nat, equipes, eug, moi = [] }: { nat: LigneClassement[]; equipes: LigneClassement[]; eug: LigneClassement[]; moi?: string[] }) {
  const [vue, setVue] = useState<"nat" | "int">("nat");
  // The National / International band is fixed; both tables' headers stick right under it.
  const racine = useRef<HTMLDivElement>(null);
  const bande = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const b = bande.current, r = racine.current;
    if (!b || !r) return;
    const maj = () => r.style.setProperty("--duo-h", `${b.offsetHeight}px`);
    maj();
    const ro = new ResizeObserver(maj);
    ro.observe(b);
    return () => ro.disconnect();
  }, []);
  const intl = vue === "int";
  const clubsTout = intl ? equipes : nat;
  const clubs = resserrer(clubsTout, (l) => l.eugies);
  const joueurs = eug.filter((l) => l.prenom !== null && l.liste === (intl ? "WR-Open" : "FBFTS")).sort((a, b) => a.rang - b.rang);
  const mois = clubs[0]?.mois || joueurs[0]?.mois;

  const evo = (e: string | null) => {
    const t = tendance(e);
    return <span className={`evo ${t?.cls || ""}`}>{t?.txt || ""}</span>;
  };

  return (
    <div ref={racine} className={`duo ${intl ? "monde" : "nat"}`}>
      <div ref={bande} className="duo-bande"><div className="duo-choix" role="tablist" aria-label="Portée du classement">
        <button type="button" role="tab" aria-selected={!intl} className={!intl ? "on" : ""} onClick={() => setVue("nat")}>🇧🇪 National</button>
        <button type="button" role="tab" aria-selected={intl} className={intl ? "on" : ""} onClick={() => setVue("int")}>🌍 International</button>
        {mois ? <span className="duo-mois">{libelleMois(mois, true)}</span> : null}
      </div></div>
      <div className="duo-cols">
        <section className={`cc-b ${intl ? "monde" : "nat"}`}>
          <div className="duo-tete">
            <header>
              <span className="cc-k">{intl ? "Équipes de club · FISTF" : "Clubs · FBFTS"}</span>
            </header>
            <div className="cc-cols" aria-hidden="true"><span>Place</span><span>{intl ? "Équipe" : "Club"}</span><span>Points</span><span>±</span></div>
          </div>
          {clubs.length ? (
            <ol>
              {clubs.map((l, k) => (
                <Fragment key={k}>
                  {k > 0 && l.rang - clubs[k - 1].rang > 1 ? <li className="cc-saut" aria-hidden="true">⋯</li> : null}
                  <li className={`cc-l${l.eugies ? " nous" : ""}`}>
                    <span className="cc-r num">{l.rang}<sup>{sup(l.rang)}</sup></span>
                    <span className="cc-n">{l.eugies ? <LogoClub /> : null}<b>{l.nom}</b>{intl && l.prenom ? <small>{l.prenom}</small> : null}</span>
                    <span className="cc-p num">{pts(l.points)}</span>
                    {evo(l.evolution)}
                  </li>
                </Fragment>
              ))}
            </ol>
          ) : <p className="vide">Pas encore importé.</p>}
          <Link className="cc-tout" href={`/club/classements?l=${intl ? "WR-Teams" : "FBFTS-Clubs"}#ma-ligne`}>Classement complet →</Link>
        </section>

        <section className={`cc-b duo-j ${intl ? "monde" : "nat"}`}>
          <div className="duo-tete">
            <header>
              <span className="cc-k">{intl ? "Nos joueurs · International Open" : "Nos joueurs · National"}</span>
            </header>
            <div className="cc-cols" aria-hidden="true"><span>Place</span><span>Joueur</span><span>{intl ? "Points" : "Cat."}</span><span>±</span></div>
          </div>
          {joueurs.length ? (
            <ol>
              {joueurs.map((l, k) => {
                const cc = couleurCategorie(l.categorie);
                const estMoi = Boolean(l.joueur_id && moi.includes(l.joueur_id));
                return (
                  <li key={k} className={`cc-l${estMoi ? " moi" : ""}`}>
                    <span className="cc-r num">{l.rang}<sup>{sup(l.rang)}</sup></span>
                    <span className="cc-n"><b><span className="duo-pre">{l.prenom} </span>{l.nom}</b></span>
                    {intl ? (
                      <span className="cc-p num">{pts(l.points)}</span>
                    ) : (
                      <span className="cc-p"><b className="cat-c" title={l.categorie || undefined} style={cc ? ({ "--cc": cc } as React.CSSProperties) : undefined}>{l.categorie && l.categorie.length > 4 ? `${l.categorie.slice(0, 3)}.` : l.categorie || "—"}</b></span>
                    )}
                    {evo(l.evolution)}
                  </li>
                );
              })}
            </ol>
          ) : <p className="vide">Aucun joueur classé.</p>}
          <Link className="cc-tout" href={`/club/classements?l=${intl ? "WR-Open" : "FBFTS"}&f=club`}>Tous nos joueurs →</Link>
        </section>
      </div>
    </div>
  );
}
