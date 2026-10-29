"use client";

import type React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Evo, LogoClub, clubCourt, couleurRang } from "./Classements";
import { couleurCategorie, libelleMois, listeDef, pts, type LigneClassement } from "@/lib/classements-types";
import LogoFistf from "@/components/LogoFistf";
import "./duo.css";

/**
 * « Le club » block of the home page, drawn like the Classements page: a National / International switch,
 * then « Clubs » / « Nos joueurs », and one ranking table in a frame where our line is always in the middle, lit up.
 */
export default function ClubDuo({ nat, equipes, eug, moi = [] }: { nat: LigneClassement[]; equipes: LigneClassement[]; eug: LigneClassement[]; moi?: string[] }) {
  const [vue, setVue] = useState<"nat" | "int">("nat");
  const [qui, setQui] = useState<"clubs" | "joueurs">("clubs");
  const cadre = useRef<HTMLDivElement>(null);
  const intl = vue === "int";
  const id = qui === "clubs" ? (intl ? "WR-Teams" : "FBFTS-Clubs") : intl ? "WR-Open" : "FBFTS";
  const def = listeDef(id);
  const lignes = qui === "clubs" ? (intl ? equipes : nat) : eug.filter((l) => l.prenom !== null && l.liste === id).sort((a, b) => a.rang - b.rang);
  const iMoi = lignes.findIndex((l) => l.joueur_id && moi.includes(l.joueur_id));
  const cible = iMoi >= 0 ? iMoi : lignes.findIndex((l) => l.eugies);
  const tousNous = qui === "joueurs";
  const mois = lignes[0]?.mois;

  // Our line in the middle of the frame, before it is shown.
  useLayoutEffect(() => {
    const c = cadre.current;
    const r = c?.querySelector<HTMLElement>(".cible");
    if (c) c.scrollTop = r ? Math.max(0, r.offsetTop - (c.clientHeight - r.offsetHeight) / 2) : 0;
  }, [id, lignes.length]);

  const info = id === "FBFTS" ? "Cat." : def.type === "equipes" ? "Équipe" : "";
  return (
    <div className={`duo2 ${intl ? "monde" : "nat"}`}>
      <div className="duo-choix" role="tablist" aria-label="Portée du classement">
        <button type="button" role="tab" aria-selected={!intl} className={!intl ? "on" : ""} onClick={() => setVue("nat")}>🇧🇪 National</button>
        <button type="button" role="tab" aria-selected={intl} className={intl ? "on" : ""} onClick={() => setVue("int")}><LogoFistf /> International</button>
      </div>
      <section className="clv-panel">
        <header className="clv-tete duo2-tete">
          <h2>{intl ? <LogoFistf taille={18} /> : <span aria-hidden="true">🇧🇪</span>} {qui === "clubs" ? (intl ? "Équipes de club · FISTF" : "Clubs de Belgique") : intl ? "Nos joueurs · FISTF Open" : "Nos joueurs · National"}</h2>
          <span>{mois ? libelleMois(mois, true) : ""}</span>
          <div className="duo2-qui" role="tablist">
            <button type="button" role="tab" aria-selected={qui === "clubs"} className={qui === "clubs" ? "on" : undefined} onClick={() => setQui("clubs")}>🦁 {intl ? "Équipes" : "Clubs"}</button>
            <button type="button" role="tab" aria-selected={qui === "joueurs"} className={qui === "joueurs" ? "on" : undefined} onClick={() => setQui("joueurs")}>👤 Nos joueurs</button>
          </div>
        </header>
        <div className="clv-cadre duo2-cadre" ref={cadre}>
          {lignes.length ? (
            <table className="clv-t" key={id}>
              <colgroup><col className="k-rg" /><col /><col className="k-evo" />{info ? <col className="k-info" /> : null}<col className="k-pts" /></colgroup>
              <thead><tr><th className="r">#</th><th>{def.type === "joueurs" ? "Joueur" : "Club"}</th><th>±</th>{info ? <th>{info}</th> : null}<th className="r">Points</th></tr></thead>
              <tbody>
                {lignes.map((l, k) => {
                  const estMoi = Boolean(l.joueur_id && moi.includes(l.joueur_id));
                  const cc = couleurRang(l, def);
                  const nous = !tousNous && l.eugies;
                  return (
                    <tr key={k} className={[estMoi || (k === cible && !tousNous) ? "moi" : nous ? "eug" : "", k === cible ? "cible" : ""].filter(Boolean).join(" ") || undefined}>
                      <td className="r num rg" style={cc ? ({ "--cc": cc } as React.CSSProperties) : undefined}>{l.rang}</td>
                      <td className="nm">
                        {def.type === "joueurs" ? <><b>{l.nom}</b> {l.prenom}</> : <>{l.eugies ? <LogoClub /> : null} <b>{l.nom}</b></>}
                        {estMoi ? <span className="moi-tag">Toi</span> : k === cible && !tousNous ? <span className="moi-tag">Nous</span> : null}
                        {def.type === "joueurs" && !tousNous ? <small className="clv-club">{l.eugies ? <LogoClub /> : clubCourt(l)}</small> : null}
                      </td>
                      <td className="evo-c"><Evo e={l.evolution} /></td>
                      {info === "Cat." ? (
                        <td className="c"><b className="cat-c" style={couleurCategorie(l.categorie) ? ({ "--cc": couleurCategorie(l.categorie) } as React.CSSProperties) : undefined}>{l.categorie && l.categorie.length > 4 ? `${l.categorie.slice(0, 3)}.` : l.categorie || "—"}</b></td>
                      ) : info === "Équipe" ? <td className="c small">{l.prenom}</td> : null}
                      <td className="r num">{pts(l.points)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <p className="vide">Pas encore importé.</p>}
        </div>
        <Link className="duo2-tout" href={qui === "clubs" ? `/club/classements?l=${id}#ma-ligne` : `/club/classements?l=${id}&f=club`}>Classement complet →</Link>
      </section>
    </div>
  );
}
