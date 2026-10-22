"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { dissoudreCagnotte, enregistrerCagnotte, quitterCagnotte, regrouperCagnottes, renommerCagnotte } from "./cagnottes";

type J = { notion_id: string; prenom: string | null; nom: string; actif: boolean; cagnotte: number | null; groupe: string | null };
const euro = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });
const sansAccent = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const versTexte = (n: number | null) => (n == null ? "" : n.toFixed(2).replace(".", ","));

/**
 * The kitty of every member (active or not), typed here and saved in Notion and in the app.
 * Members can share one kitty (« Famille Devreese »): one amount for all of them; or keep their own.
 */
export default function Cagnottes({ joueurs }: { joueurs: J[] }) {
  const router = useRouter();
  const [montants, setMontants] = useState<Record<string, number | null>>(() => Object.fromEntries(joueurs.map((j) => [j.notion_id, j.cagnotte])));
  // After a change on the server (shared kitty made, member removed…), the amounts follow.
  useEffect(() => { setMontants(Object.fromEntries(joueurs.map((j) => [j.notion_id, j.cagnotte]))); }, [joueurs]);
  const [saisie, setSaisie] = useState<Record<string, string>>({});
  const [etat, setEtat] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [filtre, setFiltre] = useState<"tous" | "actifs" | "non">("tous");
  const [cherche, setCherche] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [nomNouveau, setNomNouveau] = useState("");
  const [ajout, setAjout] = useState<Record<string, string>>({});
  const [renomme, setRenomme] = useState<Record<string, string>>({});
  const [dissout, setDissout] = useState<{ groupe: string; garde: string } | null>(null);
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const nom = (j: J) => [j.prenom, j.nom].filter(Boolean).join(" ");
  const visible = (j: J) => (filtre === "tous" ? true : filtre === "actifs" ? j.actif : !j.actif) && (!cherche || sansAccent(nom(j)).includes(sansAccent(cherche)));
  const groupes = useMemo(() => {
    const m = new Map<string, J[]>();
    for (const j of joueurs) if (j.groupe) m.set(j.groupe, [...(m.get(j.groupe) || []), j]);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [joueurs]);
  const solos = joueurs.filter((j) => !j.groupe).sort((a, b) => nom(a).localeCompare(nom(b), "fr"));
  // Total: a shared kitty counted once.
  const total = solos.reduce((s, j) => s + (Number(montants[j.notion_id]) || 0), 0) + groupes.reduce((s, [, ms]) => s + (Number(montants[ms[0].notion_id]) || 0), 0);
  // Ideas: own kitties with the same family name.
  const idees = useMemo(() => {
    const m = new Map<string, J[]>();
    for (const j of solos) { const k = sansAccent(j.nom.trim().split(" ").slice(-1)[0] || j.nom); m.set(k, [...(m.get(k) || []), j]); }
    return [...m.values()].filter((l) => l.length >= 2 && !groupes.some(([g]) => sansAccent(g).includes(sansAccent(l[0].nom.split(" ").slice(-1)[0]))));
  }, [solos, groupes]);

  const action = (cle: string, f: () => Promise<{ ok: boolean; message: string; montant?: number | null }>, apres?: (r: { ok: boolean; message: string; montant?: number | null }) => void) => {
    setEnCours(cle);
    setInfo(null);
    start(async () => {
      const r = await f();
      setEnCours(null);
      setInfo(r);
      if (r.ok) { apres?.(r); router.refresh(); }
    });
  };
  const enregistrer = (id: string, membres: string[]) => {
    const texte = saisie[id] ?? versTexte(montants[id]);
    setEnCours(id);
    start(async () => {
      const r = await enregistrerCagnotte(id, texte);
      setEnCours(null);
      setEtat((e) => ({ ...e, [id]: r }));
      if (r.ok) {
        setMontants((m) => ({ ...m, ...Object.fromEntries(membres.map((x) => [x, r.montant ?? null])) }));
        setSaisie((s) => { const c = { ...s }; delete c[id]; return c; });
      }
    });
  };
  const champ = (id: string, membres: string[], etiquette: string) => {
    const val = saisie[id] ?? versTexte(montants[id]);
    const change = saisie[id] != null && saisie[id] !== versTexte(montants[id]);
    return (
      <span className="cg-saisie">
        <input className="input num" inputMode="decimal" value={val} placeholder="0,00" aria-label={`Cagnotte de ${etiquette}`}
          onChange={(x) => setSaisie((s) => ({ ...s, [id]: x.target.value.replace(/[^\d,.\-]/g, "").slice(0, 10) }))}
          onKeyDown={(x) => x.key === "Enter" && enregistrer(id, membres)} />
        <i aria-hidden="true">€</i>
        <button type="button" className="cg-ok" disabled={enCours === id || !change} onClick={() => enregistrer(id, membres)} aria-label={`Enregistrer la cagnotte de ${etiquette}`}>{enCours === id ? "…" : "✓"}</button>
      </span>
    );
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
      <p className="muted small">Tape le montant puis ✓ (ou Entrée) : enregistré dans Notion (« Cagnotte ») et dans l&apos;appli. Une <b>cagnotte commune</b> (ex. Famille Devreese) a un seul montant pour tous ses membres ; chacun la voit sur sa fiche.</p>
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}

      {/* Shared kitties */}
      {groupes.filter(([, ms]) => ms.some(visible)).length ? <p className="mini-t">👨‍👩‍👧 Cagnottes communes</p> : null}
      <ul className="cg-l">
        {groupes.filter(([, ms]) => ms.some(visible)).map(([g, ms]) => {
          const id = ms[0].notion_id;
          const ids = ms.map((x) => x.notion_id);
          const e = etat[id];
          return (
            <li key={g} className="cg-grp">
              <div className="cg-grp-t">
                <span className="cg-grp-ic" aria-hidden="true">👨‍👩‍👧</span>
                {renomme[g] != null ? (
                  <span className="cg-ren">
                    <input className="input" value={renomme[g]} maxLength={80} onChange={(x) => setRenomme((r) => ({ ...r, [g]: x.target.value }))} aria-label="Nouveau nom" />
                    <button type="button" className="cg-ok" disabled={pending} onClick={() => action(`ren-${g}`, () => renommerCagnotte(g, renomme[g]), () => setRenomme((r) => { const c = { ...r }; delete c[g]; return c; }))}>✓</button>
                  </span>
                ) : <b className="cg-grp-n">{g}</b>}
                {champ(id, ids, g)}
              </div>
              <ul className="cg-mb">
                {ms.map((m) => (
                  <li key={m.notion_id}>
                    {nom(m)}{!m.actif ? <small> · non actif</small> : null}
                    <button type="button" className="cg-x" title="Retirer de la cagnotte commune (il repart avec sa propre cagnotte, à 0 €)" disabled={pending} onClick={() => action(`q-${m.notion_id}`, () => quitterCagnotte(m.notion_id))}>✕</button>
                  </li>
                ))}
              </ul>
              <div className="cg-grp-act">
                <select className="input" value={ajout[g] || ""} onChange={(x) => setAjout((a) => ({ ...a, [g]: x.target.value }))} aria-label="Ajouter un membre">
                  <option value="">＋ Ajouter un membre…</option>
                  {solos.map((s) => <option key={s.notion_id} value={s.notion_id}>{nom(s)}{s.cagnotte ? ` (${euro.format(Number(s.cagnotte))})` : ""}</option>)}
                </select>
                <button type="button" className="btn" disabled={!ajout[g] || pending} onClick={() => action(`aj-${g}`, () => regrouperCagnottes([ajout[g]], g), () => setAjout((a) => ({ ...a, [g]: "" })))}>Ajouter</button>
                <button type="button" className="btn" onClick={() => setRenomme((r) => ({ ...r, [g]: g }))}>✏️ Renommer</button>
                <button type="button" className="btn" onClick={() => setDissout({ groupe: g, garde: ms[0].notion_id })}>✂️ Séparer</button>
              </div>
              {e ? <span className={`cg-msg${e.ok ? " ok" : " err"}`}>{e.message}</span> : null}
            </li>
          );
        })}
      </ul>

      {/* Making a new shared kitty */}
      <div className="cg-nouveau">
        <p className="mini-t">➕ Créer une cagnotte commune</p>
        {idees.length ? (
          <p className="cg-idees">💡 {idees.map((l) => (
            <button key={l[0].notion_id} type="button" className="cg-idee" onClick={() => { setSelection(l.map((x) => x.notion_id)); setNomNouveau(`Famille ${l[0].nom.trim().split(" ").slice(-1)[0]}`); }}>
              Famille {l[0].nom.trim().split(" ").slice(-1)[0]} ({l.length})
            </button>
          ))}</p>
        ) : null}
        <p className="muted small">Coche les membres ci-dessous (✓ à gauche de leur nom), donne un nom, puis « Regrouper ». Leurs montants sont additionnés.</p>
        {selection.length ? (
          <div className="cg-barre">
            <b>{selection.length} membre{selection.length > 1 ? "s" : ""} choisi{selection.length > 1 ? "s" : ""}</b>
            <input className="input" value={nomNouveau} maxLength={80} placeholder="Ex. Famille Devreese" onChange={(e) => setNomNouveau(e.target.value)} aria-label="Nom de la cagnotte commune" />
            <button type="button" className="btn primary" disabled={selection.length < 2 || !nomNouveau.trim() || pending} onClick={() => action("nouveau", () => regrouperCagnottes(selection, nomNouveau), () => { setSelection([]); setNomNouveau(""); })}>👨‍👩‍👧 Regrouper</button>
            <button type="button" className="btn" onClick={() => setSelection([])}>Annuler</button>
          </div>
        ) : null}
      </div>

      {/* Own kitties */}
      <p className="mini-t">👤 Cagnottes individuelles</p>
      <ul className="cg-l">
        {solos.filter(visible).map((j) => {
          const id = j.notion_id;
          const e = etat[id];
          const coche = selection.includes(id);
          return (
            <li key={id} className={`cg-li cg-solo${j.actif ? "" : " inactif"}${coche ? " coche" : ""}`}>
              <label className="cg-sel" title="Choisir pour une cagnotte commune"><input type="checkbox" checked={coche} onChange={(x) => setSelection((s) => (x.target.checked ? [...s, id] : s.filter((y) => y !== id)))} /></label>
              <span className="cg-nom"><b>{nom(j)}</b>{!j.actif ? <small> · non actif</small> : null}</span>
              {champ(id, [id], nom(j))}
              {e ? <span className={`cg-msg${e.ok ? " ok" : " err"}`}>{e.message}</span> : null}
            </li>
          );
        })}
        {!solos.filter(visible).length ? <li className="muted small">Aucun membre.</li> : null}
      </ul>

      {dissout ? (
        <div className="ig-fond" onClick={() => !pending && setDissout(null)}>
          <div className="ig-saisie" role="dialog" aria-label="Séparer la cagnotte commune" onClick={(e) => e.stopPropagation()}>
            <p className="ig-qui">Séparer « {dissout.groupe} »</p>
            <p className="muted small" style={{ textAlign: "center" }}>Chacun retrouve sa propre cagnotte. Le montant ({euro.format(Number(montants[groupes.find(([g]) => g === dissout.groupe)?.[1][0].notion_id || ""]) || 0)}) reste à :</p>
            <select className="input" value={dissout.garde} onChange={(e) => setDissout({ ...dissout, garde: e.target.value })} aria-label="Qui garde le montant">
              {(groupes.find(([g]) => g === dissout.groupe)?.[1] || []).map((m) => <option key={m.notion_id} value={m.notion_id}>{nom(m)}</option>)}
            </select>
            <span className="ig-btns">
              <button type="button" className="btn primary" disabled={pending} onClick={() => action("dis", () => dissoudreCagnotte(dissout.groupe, dissout.garde), () => setDissout(null))}>{pending ? "…" : "✂️ Oui, séparer"}</button>
              <button type="button" className="btn" disabled={pending} onClick={() => setDissout(null)}>Annuler</button>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
