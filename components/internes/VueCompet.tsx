import Link from "next/link";
import { classement, evolutions, decrireEtape, TYPES, type Competition, type Groupe, type Match } from "@/lib/internes";
import { dateMoyenne } from "@/lib/club-types";
import Grille from "./Grille";
import Onglets from "./Onglets";
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
        gs.map((g, gi) => (
          <section key={g.id} className={`panel ci-g${gs.length > 1 ? (gi === 0 ? " niv-haut" : gi === gs.length - 1 ? " niv-bas" : "") : ""}`}>
            {gs.length > 1 ? <div className="hd"><h2>{g.nom}</h2><span className="muted small">{g.joueurs.length} joueurs</span></div> : null}
            <div className="bd"><TableauFinal joueurs={g.joueurs} matchs={ms.filter((m) => m.groupe_id === g.id)} editable={editable && c.statut === "en_cours"} moi={moi} /></div>
          </section>
        ))
      ) : (
        <Onglets
          cle={`${c.id}-${k}`}
          onglets={gs.map((g, gi) => {
          const mg = ms.filter((m) => m.groupe_id === g.id);
          const lignes = classement(g.joueurs, mg, c);
          const evo = evolutions(g.joueurs, mg, c);
          const commence = mg.some((m) => m.joue);
          // Who goes up: the qualified ones, or the top half when the best go on together.
          const derniereEtape = k >= c.etapes.length - 1 || e?.passage === "fin";
          const monte = derniereEtape ? 0 : e?.passage === "qualifies" ? e.qualifies : Math.ceil(g.joueurs.length / 2);
          const ligue = /diamond/i.test(g.nom) ? " lg-diamond" : /gold/i.test(g.nom) ? " lg-gold" : /silver/i.test(g.nom) ? " lg-silver" : /bronze/i.test(g.nom) ? " lg-bronze" : /fair play/i.test(g.nom) ? " lg-fair" : "";
          const niveau = k > 0 && c.etapes[k - 1]?.passage === "niveaux" && gs.length > 1 ? (gi === 0 ? "haut" : gi === gs.length - 1 ? "bas" : "milieu") : "";
          const joues = mg.filter((m) => m.joue).length;
          return {
            id: g.id,
            nom: g.nom,
            info: `${g.joueurs.length} joueurs · ${joues}/${mg.length} matchs`,
            classe: ligue || (niveau ? ` niv-${niveau}` : ""),
            moi: g.joueurs.some((j) => moi.includes(j.id)),
            contenu: (
            <section className={`panel ci-g${niveau && !ligue ? ` niv-${niveau}` : ""}${ligue}`}>
              <div className="hd"><h2>{g.nom}</h2><span className="muted small">{g.joueurs.length} joueurs · {joues}/{mg.length} matchs joués</span></div>
              <div className="bd ci-duo">
                <div className="ci-duo-cl">
                <p className="mini-t">Classement</p>
                <div className="scroll-x">
                  <table className="t ci-cl">
                    <thead><tr><th>#</th><th className="c-evo" aria-label="Évolution"></th><th>Joueur</th><th title="Joués">J</th><th title="Gagnés">G</th><th title="Nuls">N</th><th title="Perdus">P</th><th className="c-bp" title="Buts pour">BP</th><th className="c-bc" title="Buts contre">BC</th><th title="Différence">Diff</th><th title="Points">Pts</th></tr></thead>
                    <tbody>
                      {lignes.map((l) => {
                        const d = evo.get(l.id) || 0;
                        const premier = commence && l.rang === 1;
                        const haut = commence && !premier && monte > 0 && l.rang <= monte;
                        return (
                        <tr key={l.id} className={`${moi.includes(l.id) ? "moi " : ""}${passeOn && l.rang <= passeOn ? "qualif " : ""}${premier ? "ci-1er " : ""}${haut ? "ci-haut " : ""}${monte && l.rang === monte ? "ci-coupe" : ""}`}>
                          <td className="num ci-rg">{premier ? <span className="ci-couronne" aria-label="1er">👑</span> : l.rang}</td>
                          <td className="c-evo">{d > 0 ? <span className="ci-up" title={`${d} place${d > 1 ? "s" : ""} gagnée${d > 1 ? "s" : ""}`}>▲{d}</span> : d < 0 ? <span className="ci-down" title={`${-d} place${d < -1 ? "s" : ""} perdue${d < -1 ? "s" : ""}`}>▼{-d}</span> : null}</td>
                          <td>{premier ? <b className="ci-brille">{l.nom}</b> : <b>{l.nom}</b>}</td>
                          <td className="num">{l.j}</td><td className="num">{l.g}</td><td className="num">{l.n}</td><td className="num">{l.p}</td>
                          <td className="num c-bp">{l.bp}</td><td className="num c-bc">{l.bc}</td><td className="num">{l.diff > 0 ? `+${l.diff}` : l.diff}</td>
                          <td className="num ci-pts">{l.pts}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {monte && commence ? <p className="ci-leg"><span className="ci-leg-1">👑 1er</span><span className="ci-leg-h">{e?.passage === "qualifies" ? "Qualifiés" : "Montent dans la poule du haut"}</span><span><b className="ci-up">▲</b>/<b className="ci-down">▼</b> places au dernier match</span></p> : null}
                </div>
                <div className="ci-duo-mx">
                <p className="mini-t">Matchs</p>
                <Grille joueurs={g.joueurs} matchs={mg} editable={editable && c.statut === "en_cours" && k === c.etape} moi={moi} />
                </div>
              </div>
            </section>
            ),
          };
        })}
        />
      )}
    </div>
  );
}
