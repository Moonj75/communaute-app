"use client";

import { useMemo, useState, useTransition } from "react";
import { avancement, CHAMPS, GROUPES, rempli, type Champ, type Valeur } from "@/lib/logistique";
import { sauverFiche } from "../actions";

type Personne = { id: string; nom: string };

/**
 * Logistics sheet editor: every field shows ✓ when filled, can be marked « Pas utile »
 * (then hidden from players). « Publier » unlocks when every field is ready.
 */
export default function Editeur(p: { id: string; url: string; statut: string | null; initiales: Record<string, Valeur>; masquesInit: string[]; actifs: Personne[]; joueurs: Personne[] }) {
  const [v, setV] = useState<Record<string, Valeur>>(p.initiales);
  const [masques, setMasques] = useState<string[]>(p.masquesInit);
  const [statut, setStatut] = useState(p.statut);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [modifie, setModifie] = useState(false);
  const [pending, start] = useTransition();
  const av = useMemo(() => avancement(v, masques), [v, masques]);
  const publiee = statut === "Prête";

  const changer = (cle: string, x: Valeur) => {
    setV((o) => ({ ...o, [cle]: x }));
    setModifie(true);
    setMsg(null);
  };
  const basculer = (cle: string) => {
    setMasques((m) => (m.includes(cle) ? m.filter((k) => k !== cle) : [...m, cle]));
    setModifie(true);
    setMsg(null);
  };
  const envoyer = (action: "brouillon" | "publier" | "depublier") =>
    start(async () => {
      const r = await sauverFiche(p.id, v, masques, action);
      setMsg({ ok: r.ok, t: r.message });
      if (r.ok) {
        setModifie(false);
        if (r.statut) setStatut(r.statut);
      }
    });

  const saisie = (c: Champ) => {
    const x = v[c.cle];
    const dis = masques.includes(c.cle);
    switch (c.type) {
      case "long":
        return <textarea className="input area" rows={3} disabled={dis} value={(x as string) || ""} placeholder={c.aide} onChange={(e) => changer(c.cle, e.currentTarget.value)} />;
      case "nombre":
      case "euro":
      case "km":
        return (
          <span className="fe-num">
            <input className="input" type="number" inputMode="decimal" min={0} step="any" disabled={dis} value={typeof x === "number" ? x : ""} onChange={(e) => changer(c.cle, e.currentTarget.value === "" ? null : Number(e.currentTarget.value))} />
            <span className="fe-unite">{c.type === "euro" ? "€" : c.type === "km" ? "km" : ""}</span>
          </span>
        );
      case "multi":
        return (
          <span className="fe-chips">
            {c.options!.map((o) => {
              const on = Array.isArray(x) && x.includes(o);
              return (
                <button key={o} type="button" disabled={dis} className={`fe-chip${on ? " on" : ""}`} onClick={() => changer(c.cle, on ? (x as string[]).filter((y) => y !== o) : [...((x as string[]) || []), o])}>
                  {on ? "✓ " : ""}
                  {o === "Carte identite" ? "Carte d'identité" : o}
                </button>
              );
            })}
          </span>
        );
      case "select":
        return (
          <span className="fe-chips">
            {c.options!.map((o) => (
              <button key={o} type="button" disabled={dis} className={`fe-chip${x === o ? " on" : ""}`} onClick={() => changer(c.cle, x === o ? null : o)}>
                {o}
              </button>
            ))}
          </span>
        );
      case "coche":
        return (
          <span className="fe-chips">
            {[true, false].map((o) => (
              <button key={String(o)} type="button" disabled={dis} className={`fe-chip${x === o ? " on" : ""}`} onClick={() => changer(c.cle, o)}>
                {o ? "Oui" : "Non"}
              </button>
            ))}
          </span>
        );
      case "ref": {
        const liste = c.source === "actifs" ? p.actifs : p.joueurs;
        return (
          <select className="input" disabled={dis} value={(x as string) || ""} onChange={(e) => changer(c.cle, e.currentTarget.value || null)}>
            <option value="">— Choisir —</option>
            {liste.map((o) => (
              <option key={o.id} value={o.id}>{o.nom}</option>
            ))}
          </select>
        );
      }
      default:
        return (
          <input
            className="input"
            type={c.type === "email" ? "email" : c.type === "tel" ? "tel" : "text"}
            disabled={dis}
            value={(x as string) || ""}
            placeholder={c.aide}
            onChange={(e) => changer(c.cle, e.currentTarget.value)}
          />
        );
    }
  };

  return (
    <div className="fe">
      <div className="fe-tete">
        <div className="fe-av">
          <span className="fe-av-n num">
            {av.prets}
            <small>/{av.total}</small>
          </span>
          <span className="fe-av-t">{av.complet ? "Tout est prêt : tu peux publier" : `${av.total - av.prets} champ${av.total - av.prets > 1 ? "s" : ""} à compléter`}</span>
          <span className="fe-barre"><span style={{ width: `${(av.prets / av.total) * 100}%` }} /></span>
        </div>
        <span className={`fe-statut ${publiee ? "pub" : "brou"}`}>{publiee ? "✓ Publiée" : "✎ Brouillon"}</span>
      </div>

      {GROUPES.map((g) => {
        const champs = CHAMPS.filter((c) => c.groupe === g.id);
        const ok = champs.filter((c) => masques.includes(c.cle) || rempli(c, v[c.cle])).length;
        return (
          <section key={g.id} className={`fe-g g-${g.c}`}>
            <header>
              <h3>
                <span aria-hidden="true">{g.ic}</span> {g.titre}
              </h3>
              <span className={`fe-g-n${ok === champs.length ? " ok" : ""}`}>
                {ok}/{champs.length}
              </span>
            </header>
            {champs.map((c) => {
              const masque = masques.includes(c.cle);
              const fait = rempli(c, v[c.cle]);
              const etat = masque ? "na" : fait ? "ok" : "vide";
              return (
                <div key={c.cle} className={`fe-c ${etat}`}>
                  <span className="fe-ind" title={masque ? "Pas utile : caché aux joueurs" : fait ? "Rempli" : "À remplir"} aria-hidden="true">
                    {masque ? "–" : fait ? "✓" : ""}
                  </span>
                  <label className="fe-l">
                    <span className="fe-lb">{c.label}</span>
                    {saisie(c)}
                  </label>
                  <button type="button" className={`fe-na${masque ? " on" : ""}`} onClick={() => basculer(c.cle)} aria-pressed={masque}>
                    {masque ? "↺ Utile" : "Pas utile"}
                  </button>
                </div>
              );
            })}
          </section>
        );
      })}

      <div className="fe-bar">
        {msg ? <span className={`fe-msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</span> : modifie ? <span className="fe-msg">Modifications non enregistrées</span> : <a className="fe-msg" href={p.url} target="_blank" rel="noopener">Ouvrir dans Notion ↗</a>}
        <button type="button" className="btn" disabled={pending || !modifie} onClick={() => envoyer("brouillon")}>
          {pending ? "…" : "💾 Enregistrer"}
        </button>
        {publiee ? (
          <button type="button" className="btn" disabled={pending} onClick={() => envoyer("depublier")}>Repasser en brouillon</button>
        ) : null}
        <button type="button" className="btn primary" disabled={pending || !av.complet || (publiee && !modifie)} onClick={() => envoyer("publier")} title={av.complet ? undefined : "Remplis ou marque « Pas utile » tous les champs"}>
          {publiee ? "🚀 Republier" : "🚀 Publier"}
        </button>
      </div>
    </div>
  );
}
