"use client";

import { useMemo, useState, useTransition } from "react";
import { enregistrerCagnotte } from "./cagnottes";

type J = { notion_id: string; prenom: string | null; nom: string; actif: boolean; cagnotte: number | null };
const euro = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });
const sansAccent = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const versTexte = (n: number | null) => (n == null ? "" : n.toFixed(2).replace(".", ","));

/** The « cagnotte » of every member (active or not): typed here, saved in Notion and in the app. */
export default function Cagnottes({ joueurs }: { joueurs: J[] }) {
  const [montants, setMontants] = useState<Record<string, number | null>>(() => Object.fromEntries(joueurs.map((j) => [j.notion_id, j.cagnotte])));
  const [saisie, setSaisie] = useState<Record<string, string>>({});
  const [etat, setEtat] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [filtre, setFiltre] = useState<"tous" | "actifs" | "non">("tous");
  const [cherche, setCherche] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [, start] = useTransition();

  const nom = (j: J) => [j.prenom, j.nom].filter(Boolean).join(" ");
  const liste = useMemo(
    () => joueurs
      .filter((j) => (filtre === "tous" ? true : filtre === "actifs" ? j.actif : !j.actif))
      .filter((j) => !cherche || sansAccent(nom(j)).includes(sansAccent(cherche)))
      .sort((a, b) => nom(a).localeCompare(nom(b), "fr")),
    [joueurs, filtre, cherche],
  );
  const total = joueurs.reduce((s, j) => s + (Number(montants[j.notion_id]) || 0), 0);

  const enregistrer = (j: J) => {
    const texte = saisie[j.notion_id] ?? versTexte(montants[j.notion_id]);
    setEnCours(j.notion_id);
    start(async () => {
      const r = await enregistrerCagnotte(j.notion_id, texte);
      setEnCours(null);
      setEtat((e) => ({ ...e, [j.notion_id]: r }));
      if (r.ok) {
        setMontants((m) => ({ ...m, [j.notion_id]: r.montant ?? null }));
        setSaisie((s) => { const c = { ...s }; delete c[j.notion_id]; return c; });
      }
    });
  };

  return (
    <div className="cg">
      <div className="cg-tete">
        <div className="cg-total"><span>Total des cagnottes</span><b className="num">{euro.format(total)}</b></div>
        <div className="rp-liste-choix" role="radiogroup" aria-label="Quels membres montrer">
          {([["tous", `Tous ${joueurs.length}`], ["actifs", `Actifs ${joueurs.filter((j) => j.actif).length}`], ["non", `Non actifs ${joueurs.filter((j) => !j.actif).length}`]] as const).map(([v, t]) => (
            <button key={v} type="button" className={`rp-seg${filtre === v ? " on" : ""}`} onClick={() => setFiltre(v)}>{t}</button>
          ))}
        </div>
        <input className="input cg-cherche" type="search" value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder="🔎 Chercher un membre…" aria-label="Chercher un membre" />
      </div>
      <p className="muted small">Tape le montant puis ✓ (ou Entrée) : il est enregistré dans Notion (colonne « Cagnotte ») et dans l&apos;appli. Case vide = pas de cagnotte.</p>
      <ul className="cg-l">
        {liste.map((j) => {
          const id = j.notion_id;
          const val = saisie[id] ?? versTexte(montants[id]);
          const change = saisie[id] != null && saisie[id] !== versTexte(montants[id]);
          const e = etat[id];
          return (
            <li key={id} className={`cg-li${j.actif ? "" : " inactif"}${change ? " modif" : ""}`}>
              <span className="cg-nom"><b>{nom(j)}</b>{!j.actif ? <small> · non actif</small> : null}</span>
              <span className="cg-saisie">
                <input className="input num" inputMode="decimal" value={val} placeholder="0,00" aria-label={`Cagnotte de ${nom(j)}`}
                  onChange={(x) => setSaisie((s) => ({ ...s, [id]: x.target.value.replace(/[^\d,.\-]/g, "").slice(0, 10) }))}
                  onKeyDown={(x) => x.key === "Enter" && enregistrer(j)} />
                <i aria-hidden="true">€</i>
                <button type="button" className="cg-ok" disabled={enCours === id || !change} onClick={() => enregistrer(j)} aria-label={`Enregistrer la cagnotte de ${nom(j)}`}>{enCours === id ? "…" : "✓"}</button>
              </span>
              {e ? <span className={`cg-msg${e.ok ? " ok" : " err"}`}>{e.message}</span> : null}
            </li>
          );
        })}
        {!liste.length ? <li className="muted small">Aucun membre.</li> : null}
      </ul>
    </div>
  );
}
