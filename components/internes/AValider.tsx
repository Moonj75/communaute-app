"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AValider as Item } from "@/lib/internes";
import { validerMatch } from "@/app/internes/actions";
import FeuilleScore from "./FeuilleScore";

/**
 * Validators: the scores typed by the players and not validated yet, one card per match.
 * A tap opens the score sheet with the players' scores ready: one more tap and it counts in the standings.
 */
export default function AValider({ items }: { items: Item[]; miens?: string[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState<Item | null>(null);
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [faits, setFaits] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const liste = items.filter((x) => !faits.includes(x.match.id) && (!t || `${x.a.nom} ${x.b.nom} ${x.groupe}`.toLowerCase().includes(t)));
  const prenom = (n: string) => n.split(" ")[0];

  if (!liste.length && !t) return <div className="av-vide"><span aria-hidden="true">✅</span><b>Aucun score à valider</b><small>Tout est à jour. Pour mettre un score toi-même, touche la case du match dans le tableau du championnat ou de la coupe.</small>{info?.ok ? <p className="notice ok">{info.message}</p> : null}</div>;

  return (
    <div className="av av2">
      <p className="muted small">Scores mis par les joueurs. Touche un match pour le valider (ou corriger le score).</p>
      {items.length > 6 ? <input className="input" type="search" placeholder="🔎 Chercher un joueur…" value={q} onChange={(e) => setQ(e.target.value)} /> : null}
      {info && !ouvert ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      <ul className="av2-l">
        {liste.map((it) => {
          const { match: m, a, b } = it;
          const p = m.prop_a || m.prop_b;
          return (
            <li key={m.id}>
              <button type="button" className={`av2-c${it.desaccord ? " desac" : ""}`} onClick={() => { setInfo(null); setOuvert(it); }}>
                <span className="av2-ou">{it.compet} · {it.etape}{it.groupe ? ` · ${it.groupe}` : ""}</span>
                <span className="av2-duel">
                  <b>{a.nom}</b>
                  <span className="av2-s num">{it.desaccord ? "?" : p ? `${p.a}–${p.b}` : "–"}</span>
                  <b>{b.nom}</b>
                </span>
                <span className="av2-etat">{it.desaccord ? "⚠️ Scores différents" : `⏳ Mis par ${prenom(m.prop_a ? a.nom : b.nom)}, en attente`}<em>Valider ›</em></span>
              </button>
            </li>
          );
        })}
      </ul>
      {ouvert ? (
        <FeuilleScore
          titre="Valider le score"
          ou={`${ouvert.compet} · ${ouvert.etape}${ouvert.groupe ? ` · ${ouvert.groupe}` : ""}`}
          gauche={{ id: ouvert.a.id, nom: ouvert.a.nom }}
          droite={{ id: ouvert.b.id, nom: ouvert.b.nom }}
          init={{ a: (ouvert.match.prop_a || ouvert.match.prop_b)?.a ?? 0, b: (ouvert.match.prop_a || ouvert.match.prop_b)?.b ?? 0, v: (ouvert.match.prop_a || ouvert.match.prop_b)?.v ?? null }}
          propositions={[ouvert.match.prop_a ? { auteur: prenom(ouvert.a.nom), ...ouvert.match.prop_a } : null, ouvert.match.prop_b ? { auteur: prenom(ouvert.b.nom), ...ouvert.match.prop_b } : null].filter((x): x is NonNullable<typeof x> => Boolean(x))}
          ko={ouvert.ko ? "passe" : null}
          note="Le score compte aussitôt dans le classement. Les deux joueurs sont prévenus."
          enregistrer={async (x, y, v) => {
            const r = await validerMatch(ouvert.match.id, x, y, v);
            setInfo(r);
            if (r.ok) { setFaits((f) => [...f, ouvert.match.id]); router.refresh(); }
            return r;
          }}
          fermer={() => setOuvert(null)}
        />
      ) : null}
    </div>
  );
}
