"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Message } from "@/lib/courrier";
import { ROLES, type RoleSeance } from "@/lib/entrainements-types";
import { changerRoleMembre } from "@/app/entrainements/actions";
import { accepterDemande, type RetourDemande } from "./actions";

const BOUTON: Record<string, string> = {
  rejoindre: "➕ Créer sa fiche joueur et ouvrir l'accès",
  parent: "➕ Créer la fiche de l'enfant et ouvrir l'accès",
  membre: "🔑 Mettre sa nouvelle adresse et ouvrir l'accès",
  attente: "🔓 Ouvrir son accès",
  archive: "↩️ Réactiver son compte",
  code: "🔓 Créer sa fiche / ouvrir l'accès",
};
type Etat = "titulaire" | "suppleant" | "aucun";
const SUIVANT: Record<Etat, Etat> = { aucun: "titulaire", titulaire: "suppleant", suppleant: "aucun" };

/** A request from the login help pages, seen by the staff: one tap to open the access, then the roles. */
export default function Demande({ m }: { m: Message }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const c = m.carte as { demande?: { sujet: string; traite?: { notionId?: string; resultat: string; le: string } } } | null | undefined;
  const sujet = c?.demande?.sujet || (/^👋/.test(m.titre) ? "rejoindre" : /^👨/.test(m.titre) ? "parent" : /^🔑/.test(m.titre) ? "membre" : /^⏳/.test(m.titre) ? "attente" : /^🔄/.test(m.titre) ? "archive" : "code");
  const [actif, setActif] = useState(true);
  const [r, setR] = useState<RetourDemande | null>(c?.demande?.traite ? { ok: true, message: `✅ Déjà fait : ${c.demande.traite.resultat}.`, notionId: c.demande.traite.notionId } : null);
  const [roles, setRoles] = useState<Record<RoleSeance, Etat>>({ entraineur: "aucun", ouvreur: "aucun", fermeur: "aucun", buvette: "aucun" });
  const [info, setInfo] = useState<string | null>(null);

  const role = (id: RoleSeance) => {
    if (!r?.notionId) return;
    const etat = SUIVANT[roles[id]];
    setRoles((x) => ({ ...x, [id]: etat }));
    start(async () => { const x = await changerRoleMembre(r.notionId!, id, etat); setInfo(x.ok ? "Rôle enregistré ✓" : x.message); });
  };

  return (
    <div className="dm">
      {!r?.ok ? (
        <>
          {sujet !== "code" && sujet !== "attente" ? (
            <label className="dm-actif"><input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} /> Membre actif cette saison</label>
          ) : null}
          <button type="button" className="btn primary dm-go" disabled={pending} onClick={() => start(async () => { const x = await accepterDemande(m.id, actif); setR(x); if (x.ok) router.refresh(); })}>
            {pending ? "Un instant…" : BOUTON[sujet]}
          </button>
          {r && !r.ok ? <p className="notice err">{r.message}</p> : null}
        </>
      ) : (
        <div className="dm-ok">
          <p className="notice ok">{r.message}</p>
          {r.notionId ? (
            <>
              <p className="dm-q">Ses rôles d&apos;entraînement <small>(touche : ★ titulaire → 🔁 suppléant → rien)</small></p>
              <div className="dm-roles">
                {ROLES.map((x) => (
                  <button key={x.id} type="button" className={`eq-r ${roles[x.id]}`} disabled={pending} onClick={() => role(x.id)}>
                    <span>{x.ic}</span> {x.nom} {roles[x.id] === "titulaire" ? "★" : roles[x.id] === "suppleant" ? "🔁" : ""}
                  </button>
                ))}
              </div>
              {info ? <small className="muted">{info}</small> : null}
              <div className="dm-liens">
                <a className="btn" href={`https://www.notion.so/${r.notionId.replace(/-/g, "")}`} target="_blank" rel="noopener">📝 Compléter sa fiche dans Notion</a>
                <a className="btn" href="/entrainements#bloc-equipe">👥 Équipe et rôles</a>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
