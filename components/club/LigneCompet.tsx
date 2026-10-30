"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Drapeau from "@/components/Drapeau";
import { paysEv } from "@/lib/drapeaux";

export type InfoCompet = {
  id: string;
  nom: string;
  jour: string;
  mois: string;
  dateLongue: string;
  rebours: string;
  lieu: string | null;
  limite: string | null;
  validation: string | null;
  oui: number;
  peutEtre: number;
  non: number;
  attente: number;
  total: number;
  objectif: number | null;
  fiche: string;
  passe: boolean;
  choisie: boolean;
  hrefFiche: string;
  hrefTableau: string;
};

const pc = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/**
 * One competition in « Toutes les compétitions ». With the mouse: hovering opens it larger with the useful
 * information, a click opens the event's page. On a phone: a first tap opens it, then the buttons lead on.
 */
export default function LigneCompet({ x }: { x: InfoCompet }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const clic = () => {
    const souris = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (souris) router.push(x.hrefFiche);
    else setOuvert((o) => !o);
  };
  return (
    <div className={`cp-l${x.choisie ? " on" : ""}${x.passe ? " past" : ""}${ouvert ? " ouvert" : ""}`}>
      <button type="button" className="cp-tete" onClick={clic} aria-expanded={ouvert} title="Ouvrir la fiche de l'évènement">
        <span className="row-d"><b className="num">{x.jour}</b><small>{x.mois}</small></span>
        <span className="row-main">
          <b><Drapeau code={paysEv(x)} />{x.nom}</b>
          <span className="bar3" aria-label={`${x.oui} oui, ${x.peutEtre} peut-être, ${x.non} non`}>
            <i className="o" style={{ width: `${pc(x.oui, x.total)}%` }} />
            <i className="m" style={{ width: `${pc(x.peutEtre, x.total)}%` }} />
            <i className="n" style={{ width: `${pc(x.non, x.total)}%` }} />
          </span>
          <small>{x.oui} oui · {x.attente} en attente · {x.rebours}</small>
        </span>
        <span className="cp-fl" aria-hidden="true">›</span>
      </button>
      <div className="cp-plus">
        <div className="cp-in">
          <p className="cp-quand">📅 {x.dateLongue}{x.lieu ? ` · 📍 ${x.lieu}` : ""}</p>
          <div className="cp-chiffres">
            <span className="o"><b className="num">{x.oui}</b>Oui</span>
            <span className="m"><b className="num">{x.peutEtre}</b>Peut-être</span>
            <span className="n"><b className="num">{x.non}</b>Non</span>
            <span className="p"><b className="num">{x.attente}</b>En attente</span>
          </div>
          <p className="cp-infos">
            {x.objectif ? <span>🎯 Objectif {x.oui}/{x.objectif}</span> : null}
            {x.limite ? <span>⏱️ Réponses avant le {x.limite}</span> : null}
            {x.validation ? <span>🔒 Validation le {x.validation}</span> : null}
            <span>🧳 {x.fiche}</span>
          </p>
          <div className="cp-act">
            <Link className="btn primary" href={x.hrefFiche}>📋 Fiche de l&apos;évènement</Link>
            <Link className="btn" href={x.hrefTableau} scroll={false}>📊 Voir dans le tableau de bord</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
