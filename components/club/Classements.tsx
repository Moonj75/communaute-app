import Link from "next/link";
import { LISTES, libelleMois, listeDef, nomComplet, pts, tendance, type LigneClassement, type ListeDef } from "@/lib/classements-types";

const ordinal = (n: number) => (n === 1 ? "1er" : `${n}e`);

function Evo({ e }: { e: string | null }) {
  const t = tendance(e);
  return t ? <span className={`evo ${t.cls}`}>{t.txt}</span> : <span className="evo" />;
}

function clubCourt(l: LigneClassement) {
  if (!l.club) return "—";
  return l.liste === "FBFTS" ? l.club.toUpperCase() : l.club;
}

/**
 * A ranking table. Club rows are highlighted; the signed-in player's own rows glow (fluorescent).
 * `cible` puts an anchor on the row to scroll to.
 */
export function TableClassement({ lignes, def, moi = [], compact = false, ancre = !compact }: { lignes: LigneClassement[]; def: ListeDef; moi?: string[]; compact?: boolean; ancre?: boolean }) {
  const cible = lignes.find((l) => l.joueur_id && moi.includes(l.joueur_id)) || lignes.find((l) => l.eugies);
  return (
    <div className="scroll-x">
      <table className={`t cl-t${compact ? " compact" : ""}`}>
        <thead>
          <tr>
            <th className="r">#</th>
            <th>±</th>
            <th>{def.type === "joueurs" ? "Joueur" : "Club"}</th>
            {def.type === "joueurs" ? <th className="hide-s">Club</th> : null}
            {def.type === "equipes" ? <th>Équipe</th> : null}
            {def.id === "FBFTS" ? <th>Cat.</th> : def.source === "fistf" ? <th className="hide-s">Pays</th> : null}
            <th className="r">Points</th>
            {def.id === "FBFTS" && !compact ? <th className="r hide-s">À défendre</th> : null}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, k) => {
            const estMoi = Boolean(l.joueur_id && moi.includes(l.joueur_id));
            return (
              <tr key={k} id={ancre && l === cible ? "ma-ligne" : undefined} className={estMoi ? "moi" : l.eugies ? "eug" : undefined}>
                <td className="r num rg">{l.rang}</td>
                <td><Evo e={l.evolution} /></td>
                <td className="nm">
                  {def.type === "joueurs" ? (
                    <>
                      <b>{l.nom}</b> {l.prenom}
                      {estMoi ? <span className="moi-tag">C&apos;est toi !</span> : null}
                    </>
                  ) : (
                    <b>{l.nom}</b>
                  )}
                </td>
                {def.type === "joueurs" ? <td className="small hide-s">{clubCourt(l)}</td> : null}
                {def.type === "equipes" ? <td className="small">{l.prenom}</td> : null}
                {def.id === "FBFTS" ? (
                  <td className="small">
                    <b>{l.categorie || "—"}</b>
                    {l.categorie_suivante && l.categorie_suivante !== l.categorie ? <span className="muted"> → {l.categorie_suivante}</span> : null}
                  </td>
                ) : def.source === "fistf" ? (
                  <td className="small hide-s">{l.pays}</td>
                ) : null}
                <td className="r num">{pts(l.points)}</td>
                {def.id === "FBFTS" && !compact ? <td className="r num small muted hide-s">{l.a_defendre ? pts(l.a_defendre) : ""}</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Club places (national clubs ranking + FISTF club teams). */
export function PlacesClub({ clubs }: { clubs: LigneClassement[] }) {
  const nat = clubs.find((l) => l.liste === "FBFTS-Clubs");
  const equipes = clubs.filter((l) => l.liste === "WR-Teams").sort((a, b) => a.rang - b.rang);
  return (
    <div className="club-cl">
      <div className="clt">
        <span className="fl-l">🇧🇪 Clubs belges (FBFTS)</span>
        <span className="clt-v num">{nat ? <><small>#</small>{nat.rang}</> : "—"}</span>
        <span className="muted small">{nat ? `${pts(nat.points)} pts · ${libelleMois(nat.mois, true)}` : "En attente du classement"}</span>
      </div>
      <div className="clt">
        <span className="fl-l">🌍 Équipes de club (FISTF)</span>
        <span className="clt-v num">{equipes[0] ? <><small>#</small>{equipes[0].rang}</> : "—"}</span>
        <span className="muted small">
          {equipes.length ? equipes.map((e) => `${e.prenom || "Team"} ${ordinal(e.rang)}`).join(" · ") : "En attente du classement"}
        </span>
      </div>
    </div>
  );
}

type Joueur = { id: string; nom: string; lignes: LigneClassement[] };

/** One line per club player with his national and world places. */
export function NosJoueurs({ lignes, moi = [], lien = true }: { lignes: LigneClassement[]; moi?: string[]; lien?: boolean }) {
  const parNom = new Map<string, Joueur>();
  for (const l of lignes.filter((x) => x.eugies && x.prenom !== null && x.liste !== "WR-Teams")) {
    const cle = l.joueur_id || `${l.nom}|${l.prenom}`.toLowerCase();
    const j = parNom.get(cle) || { id: cle, nom: nomComplet({ nom: l.nom.charAt(0) + l.nom.slice(1).toLowerCase(), prenom: l.prenom }), lignes: [] };
    if (l.liste === "FBFTS") j.nom = nomComplet(l);
    j.lignes.push(l);
    parNom.set(cle, j);
  }
  const joueurs = [...parNom.values()].sort((a, b) => {
    const fa = a.lignes.find((l) => l.liste === "FBFTS")?.rang ?? 9999;
    const fb = b.lignes.find((l) => l.liste === "FBFTS")?.rang ?? 9999;
    return fa - fb || Math.min(...a.lignes.map((l) => l.rang)) - Math.min(...b.lignes.map((l) => l.rang));
  });
  if (!joueurs.length)
    return <p className="vide">Les classements arrivent : ils sont importés automatiquement au début de chaque mois.</p>;
  return (
    <div className="scroll-x">
      <table className="t cl-t nos">
        <thead>
          <tr>
            <th>Joueur</th>
            <th className="r">🇧🇪 National</th>
            <th>Cat.</th>
            <th>🌍 Mondial FISTF</th>
          </tr>
        </thead>
        <tbody>
          {joueurs.map((j) => {
            const fb = j.lignes.find((l) => l.liste === "FBFTS");
            const wr = j.lignes.filter((l) => l.liste.startsWith("WR-")).sort((a, b) => a.rang - b.rang);
            const estMoi = moi.includes(j.id);
            return (
              <tr key={j.id} className={estMoi ? "moi" : undefined}>
                <td className="nm">
                  <b>{j.nom}</b>
                  {estMoi ? <span className="moi-tag">C&apos;est toi !</span> : null}
                </td>
                <td className="r num rg">{fb ? <>{fb.rang}<small>e</small></> : <span className="muted">—</span>}</td>
                <td className="small">{fb?.categorie || "—"}</td>
                <td className="small">
                  {wr.length
                    ? wr.map((l) => (
                        <span key={l.liste} className="wr-chip">
                          {listeDef(l.liste).court} <b className="num">{l.rang}<small>e</small></b>
                        </span>
                      ))
                    : <span className="muted">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {lien ? (
        <p className="small" style={{ marginTop: 10 }}>
          <Link href="/club/classements">Voir les classements complets →</Link>
        </p>
      ) : null}
    </div>
  );
}

/** Player's own block: one card per ranking with his row glowing in the middle of his neighbours. */
export function MesClassements({ extraits, moi }: { extraits: { liste: string; lignes: LigneClassement[] }[]; moi: string }) {
  if (!extraits.length)
    return (
      <p className="vide">
        Pas encore au classement : il suffit de jouer un tournoi officiel ! Les classements belge (FBFTS) et mondial (FISTF) sont mis à jour chaque mois.
      </p>
    );
  return (
    <div className="mes-cl">
      {extraits.map((x) => {
        const def = listeDef(x.liste);
        const l = x.lignes.find((y) => y.joueur_id === moi)!;
        const t = tendance(l.evolution);
        return (
          <article key={x.liste} className="mcl">
            <header className="mcl-h">
              <span className="fl-l">
                {def.ic} {def.titre}
              </span>
              <span className="muted small">{libelleMois(l.mois, true)}</span>
            </header>
            <div className="mcl-big">
              <span className="mcl-r num">
                {l.rang}
                <small>{l.rang === 1 ? "er" : "e"}</small>
              </span>
              <span className="mcl-d">
                <b className="num">{pts(l.points)} pts</b>
                {l.categorie ? <span>Catégorie <b>{l.categorie}</b>{l.categorie_suivante && l.categorie_suivante !== l.categorie ? ` → ${l.categorie_suivante}` : ""}</span> : null}
                {t ? <span className={`evo ${t.cls}`}>{t.txt === "=" ? "= stable" : t.txt}</span> : null}
              </span>
            </div>
            <TableClassement lignes={x.lignes} def={def} moi={[moi]} compact />
            <Link className="small" href={`/club/classements?l=${def.id}#ma-ligne`}>
              Tout le classement →
            </Link>
          </article>
        );
      })}
    </div>
  );
}

export const LISTES_JOUEURS = LISTES.filter((l) => l.type === "joueurs");
