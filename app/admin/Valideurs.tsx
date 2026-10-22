"use client";

import { useMemo, useState, useTransition } from "react";
import { ROLE_VALIDEUR } from "@/lib/internes";
import { basculerValideur } from "./valideurs";

type J = { notion_id: string; prenom: string | null; nom: string; actif: boolean; roles: string[] | null; email: string | null };
const sansAccent = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Choosing the validators of the club competitions (usually active members). */
export default function Valideurs({ joueurs }: { joueurs: J[] }) {
  const [oui, setOui] = useState<Record<string, boolean>>(() => Object.fromEntries(joueurs.map((j) => [j.notion_id, (j.roles || []).includes(ROLE_VALIDEUR)])));
  const [voirTous, setVoirTous] = useState(false);
  const [cherche, setCherche] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [, start] = useTransition();
  const nom = (j: J) => [j.prenom, j.nom].filter(Boolean).join(" ");
  const liste = useMemo(
    () => joueurs
      .filter((j) => voirTous || j.actif || oui[j.notion_id])
      .filter((j) => !cherche || sansAccent(nom(j)).includes(sansAccent(cherche)))
      .sort((a, b) => Number(oui[b.notion_id]) - Number(oui[a.notion_id]) || nom(a).localeCompare(nom(b), "fr")),
    [joueurs, voirTous, cherche, oui],
  );
  const nb = Object.values(oui).filter(Boolean).length;
  const basculer = (j: J) => {
    const v = !oui[j.notion_id];
    setEnCours(j.notion_id);
    start(async () => {
      const r = await basculerValideur(j.notion_id, v);
      setEnCours(null);
      setMsg((m) => ({ ...m, [j.notion_id]: r }));
      if (r.ok) setOui((o) => ({ ...o, [j.notion_id]: v }));
    });
  };
  return (
    <div className="vl">
      <p className="muted small">Un valideur voit, dans « Compétitions du club », les scores en attente et peut les valider (avec confirmation), comme un administrateur, sauf ses propres matchs. Le rôle est enregistré dans Notion (« Rôles » → ✅ Valideur). <b>{nb} valideur{nb > 1 ? "s" : ""}</b>.</p>
      <div className="cg-tete">
        <div className="rp-liste-choix" role="radiogroup" aria-label="Quels membres montrer">
          <button type="button" className={`rp-seg${!voirTous ? " on" : ""}`} onClick={() => setVoirTous(false)}>Membres actifs</button>
          <button type="button" className={`rp-seg${voirTous ? " on" : ""}`} onClick={() => setVoirTous(true)}>Tous les membres</button>
        </div>
        <input className="input cg-cherche" type="search" value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder="🔎 Chercher un membre…" aria-label="Chercher un membre" />
      </div>
      <ul className="cg-l">
        {liste.map((j) => {
          const on = oui[j.notion_id];
          const m = msg[j.notion_id];
          return (
            <li key={j.notion_id} className={`cg-li vl-li${on ? " on" : ""}${j.actif ? "" : " inactif"}`}>
              <span className="cg-nom"><b>{nom(j)}</b>{!j.actif ? <small> · non actif</small> : null}{!j.email ? <small> · sans compte de connexion</small> : null}</span>
              <button type="button" className={`vl-b${on ? " on" : ""}`} disabled={enCours === j.notion_id} onClick={() => basculer(j)} aria-pressed={on}>
                {enCours === j.notion_id ? "…" : on ? "✅ Valideur" : "＋ Nommer"}
              </button>
              {m && !m.ok ? <span className="cg-msg err">{m.message}</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
