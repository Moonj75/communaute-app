import Link from "next/link";
import { classement, decrireEtape, TYPES, type Competition, type Groupe, type Match } from "@/lib/internes";
import { dateMoyenne } from "@/lib/club-types";
import Grille from "./Grille";
import TableauFinal from "./TableauFinal";

/**
 * One club competition: its stages (chips), and for the chosen stage each group with its standings
 * and its cross table of matches — or the knockout table. Same view for players (read only) and staff (scores).
 */
export default function VueCompet({ c, groupes, matchs, etape, editable = false, moi = [], lien }: {
  c: Competition; groupes: Groupe[]; matchs: Match[]; etape?: number; editable?: boolean; moi?: string[];
  /** Address of a stage (for the chips). */
  lien: (k: number) => string;
}) {
  const derniereCreee = Math.max(-1, ...groupes.map((g) => g.etape));
  const k = etape != null && etape >= 0 && etape <= derniereCreee ? etape : Math.min(c.etape, Math.max(0, derniereCreee));
  const e = c.etapes[k];
  const gs = groupes.filter((g) => g.etape === k).sort((a, b) => a.ordre - b.ordre);
  const ms = matchs.filter((m) => m.etape === k);
  const passeOn = e && e.passage === "qualifies" ? e.qualifies : 0;

  return (
    <div className="ci">
      {c.statut === "terminee" && c.champion ? (
        <div className="ci-champion"><span aria-hidden="true">🏆</span><span><small>{TYPES[c.type].nom} · {c.saison || ""}</small><b>{c.champion}</b><small>Vainqueur</small></span></div>
      ) : null}

      <nav className="ci-etapes" aria-label="Étapes">
        {c.etapes.map((x, i) => {
          const dispo = i <= derniereCreee;
          const cls = `ci-et${i === k ? " on" : ""}${i < c.etape || c.statut === "terminee" ? " fini" : ""}${!dispo ? " futur" : ""}`;
          const dedans = <><span className="ci-et-n">{i + 1}</span><span className="ci-et-t">{x.nom}</span></>;
          return dispo ? <Link key={i} href={lien(i)} scroll={false} className={cls} aria-current={i === k ? "step" : undefined}>{dedans}</Link> : <span key={i} className={cls} title="Pas encore commencée">{dedans}</span>;
        })}
      </nav>

      {e ? (
        <p className="ci-info">
          {e.debut || e.fin ? <span>📅 {e.debut ? dateMoyenne(e.debut) : "…"} → {e.fin ? dateMoyenne(e.fin) : "…"}</span> : null}
          <span>{decrireEtape(e, k === c.etapes.length - 1)}</span>
          <span>Victoire {c.pts_v} pts · nul {c.pts_n} · défaite {c.pts_d}</span>
        </p>
      ) : null}

      {!gs.length ? <p className="vide">Cette étape n&apos;a pas encore commencé.</p> : null}

      {e?.format === "elimination" && gs[0] ? (
        <section className="panel ci-g"><div className="bd"><TableauFinal joueurs={gs[0].joueurs} matchs={ms} editable={editable && c.statut === "en_cours"} moi={moi} /></div></section>
      ) : (
        gs.map((g, gi) => {
          const lignes = classement(g.joueurs, ms.filter((m) => m.groupe_id === g.id), c);
          const niveau = k > 0 && c.etapes[k - 1]?.passage === "niveaux" && gs.length > 1 ? (gi === 0 ? "haut" : gi === gs.length - 1 ? "bas" : "milieu") : "";
          return (
            <section key={g.id} className={`panel ci-g${niveau ? ` niv-${niveau}` : ""}`}>
              <div className="hd"><h2>{g.nom}</h2><span className="muted small">{g.joueurs.length} joueurs</span></div>
              <div className="bd">
                <div className="scroll-x">
                  <table className="t ci-cl">
                    <thead><tr><th>#</th><th>Joueur</th><th title="Joués">J</th><th title="Gagnés">G</th><th title="Nuls">N</th><th title="Perdus">P</th><th className="c-bp" title="Buts pour">BP</th><th className="c-bc" title="Buts contre">BC</th><th title="Différence">Diff</th><th title="Points">Pts</th></tr></thead>
                    <tbody>
                      {lignes.map((l) => (
                        <tr key={l.id} className={`${moi.includes(l.id) ? "moi " : ""}${passeOn && l.rang <= passeOn ? "qualif" : ""}`}>
                          <td className="num">{l.rang}</td>
                          <td><b>{l.nom}</b></td>
                          <td className="num">{l.j}</td><td className="num">{l.g}</td><td className="num">{l.n}</td><td className="num">{l.p}</td>
                          <td className="num c-bp">{l.bp}</td><td className="num c-bc">{l.bc}</td><td className="num">{l.diff > 0 ? `+${l.diff}` : l.diff}</td>
                          <td className="num ci-pts">{l.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mini-t">Matchs</p>
                <Grille joueurs={g.joueurs} matchs={ms.filter((m) => m.groupe_id === g.id)} editable={editable && c.statut === "en_cours" && k === c.etape} moi={moi} />
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
