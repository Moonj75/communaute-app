"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Tabs of the groups of a stage (Poule A, Poule B, Diamond League…): only the chosen group is shown,
 * with its standings and its matches side by side. The choice is remembered for the stage.
 */
export default function Onglets({ cle, onglets }: { cle: string; onglets: { id: string; nom: string; info: string; classe: string; moi: boolean; contenu: ReactNode }[] }) {
  const defaut = onglets.find((o) => o.moi)?.id || onglets[0]?.id;
  const [actif, setActif] = useState(defaut);
  useEffect(() => {
    try { const v = sessionStorage.getItem(`poule-${cle}`); if (v && onglets.some((o) => o.id === v)) setActif(v); } catch { /* not available */ }
  }, [cle, onglets]);
  const choisir = (id: string) => {
    setActif(id);
    try { sessionStorage.setItem(`poule-${cle}`, id); } catch { /* not available */ }
  };
  if (onglets.length === 1) return <>{onglets[0].contenu}</>;
  const o = onglets.find((x) => x.id === actif) || onglets[0];
  return (
    <div className="og">
      <nav className="og-tabs" role="tablist" aria-label="Poules">
        {onglets.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === o.id} className={`og-tab${x.classe}${x.id === o.id ? " on" : ""}`} onClick={() => choisir(x.id)}>
            <b>{x.nom}</b>
            <small>{x.info}{x.moi ? " · toi" : ""}</small>
          </button>
        ))}
      </nav>
      <div role="tabpanel" key={o.id} className="og-panel">{o.contenu}</div>
    </div>
  );
}
