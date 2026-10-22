"use client";

import { useEffect, useMemo, useState } from "react";
import { detailCalcul, euro, icone, saisonDe, solde, type Bareme, type Mouvement } from "@/lib/cagnotte";

/**
 * Side panel with a kitty's detailed history: balance, this season's gains and expenses,
 * every movement (validated, waiting, refused). Full screen on a phone.
 */
export default function Historique({ titre, sousTitre, mouvements, bareme, noms, onClose, actions, enBas }: {
  titre: string;
  sousTitre?: string;
  mouvements: Mouvement[];
  bareme: Bareme[];
  /** Names of the members (shared kitty: who earned or spent). */
  noms?: Record<string, string>;
  onClose: () => void;
  /** Extra buttons on a movement (staff: cancel). */
  actions?: (m: Mouvement) => React.ReactNode;
  /** Extra block at the bottom (player: ask to use the kitty). */
  enBas?: React.ReactNode;
}) {
  const saison = saisonDe(new Date().toISOString());
  const [tout, setTout] = useState(false);
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);
  const s = solde(mouvements);
  const deSaison = mouvements.filter((m) => saisonDe(m.date) === saison);
  const gagne = deSaison.filter((m) => m.statut === "valide" && m.sens === "gain").reduce((x, m) => x + Number(m.montant), 0);
  const depense = deSaison.filter((m) => m.statut === "valide" && m.sens === "depense").reduce((x, m) => x + Number(m.montant), 0);
  const attente = mouvements.filter((m) => m.statut === "en_attente");
  const liste = useMemo(() => (tout ? mouvements : deSaison).slice().sort((a, b) => b.date.localeCompare(a.date) || b.cree_le.localeCompare(a.cree_le)), [tout, mouvements, deSaison]);
  const parMois = useMemo(() => {
    const g = new Map<string, Mouvement[]>();
    for (const m of liste) {
      const k = new Date(`${m.date}T12:00:00Z`).toLocaleDateString("fr-BE", { month: "long", year: "numeric", timeZone: "UTC" });
      g.set(k, [...(g.get(k) || []), m]);
    }
    return [...g.entries()];
  }, [liste]);

  return (
    <div className="hc-fond" onClick={onClose}>
      <aside className="hc" role="dialog" aria-label={`Historique de la cagnotte · ${titre}`} onClick={(e) => e.stopPropagation()}>
        <header className="hc-tete">
          <span className="hc-ic" aria-hidden="true">💰</span>
          <span className="hc-t"><b>{titre}</b>{sousTitre ? <small>{sousTitre}</small> : null}</span>
          <button type="button" className="hc-x" onClick={onClose} aria-label="Fermer">✕</button>
        </header>
        <div className="hc-solde"><small>Solde</small><b className="num or-brillant">{euro.format(s)}</b></div>
        <div className="hc-chiffres">
          <span className="g"><small>Gagné {saison}</small><b className="num">+{euro.format(gagne)}</b></span>
          <span className="d"><small>Dépensé {saison}</small><b className="num">−{euro.format(depense)}</b></span>
          {attente.length ? <span className="a"><small>En attente</small><b className="num">{attente.length}</b></span> : null}
        </div>
        <div className="rp-liste-choix hc-filtre" role="radiogroup" aria-label="Période">
          <button type="button" className={`rp-seg${!tout ? " on" : ""}`} onClick={() => setTout(false)}>Saison {saison}</button>
          <button type="button" className={`rp-seg${tout ? " on" : ""}`} onClick={() => setTout(true)}>Tout l&apos;historique</button>
        </div>
        <div className="hc-liste">
          {!liste.length ? <p className="muted small hc-vide">Aucun mouvement {tout ? "" : "cette saison"}.</p> : null}
          {parMois.map(([mois, ms]) => (
            <section key={mois}>
              <p className="hc-mois">{mois}</p>
              <ul>
                {ms.map((m) => (
                  <li key={m.id} className={`hc-m ${m.sens} s-${m.statut}`}>
                    <span className="hc-mi" aria-hidden="true">{icone(m, bareme)}</span>
                    <span className="hc-mt">
                      <b>{m.libelle || m.categorie}</b>
                      <small>
                        {new Date(`${m.date}T12:00:00Z`).toLocaleDateString("fr-BE", { day: "numeric", month: "short", timeZone: "UTC" })}
                        {m.libelle && m.categorie && m.libelle !== m.categorie ? ` · ${m.categorie}` : ""}
                        {detailCalcul(m) ? ` · ${detailCalcul(m)}` : ""}
                        {noms && noms[m.joueur_id] ? ` · ${noms[m.joueur_id]}` : ""}
                        {m.evenement ? ` · 📅 ${m.evenement}` : ""}
                      </small>
                      {m.statut === "en_attente" ? <em className="hc-st a">⏳ En attente de validation</em> : m.statut === "refuse" ? <em className="hc-st r">{m.motif === "Annulé par le staff" ? "Annulé" : `Refusé${m.motif ? ` : ${m.motif}` : ""}`}</em> : null}
                      {actions ? actions(m) : null}
                    </span>
                    <span className="hc-mm num">{m.sens === "gain" ? "+" : "−"}{euro.format(Number(m.montant))}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        {enBas ? <div className="hc-bas">{enBas}</div> : null}
      </aside>
    </div>
  );
}
