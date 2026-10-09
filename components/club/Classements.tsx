import type React from "react";
import Link from "next/link";
import { couleurCategorie, LISTES, libelleMois, listeDef, nomComplet, pts, resserrer, tendance, type LigneClassement, type ListeDef } from "@/lib/classements-types";
import { Fragment } from "react";

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
  // Only our players listed (filter « Club »): no need to highlight them, the zebra stripes are enough.
  const tousNous = lignes.length > 0 && lignes.every((l) => l.eugies);
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
            const saut = compact && k > 0 && l.rang - lignes[k - 1].rang > 1;
            return (
              <Fragment key={k}>
              {saut ? (
                <tr className="cl-saut" aria-hidden="true"><td colSpan={8}>⋯</td></tr>
              ) : null}
              <tr id={ancre && l === cible ? "ma-ligne" : undefined} className={estMoi ? "moi" : l.eugies && !tousNous ? "eug" : undefined}>
                <td className="r num rg" style={couleurRang(l, def) ? ({ "--cc": couleurRang(l, def) } as React.CSSProperties) : undefined}>{l.rang}</td>
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
                    <b className="cat-c" style={couleurCategorie(l.categorie) ? ({ "--cc": couleurCategorie(l.categorie) } as React.CSSProperties) : undefined}>{l.categorie || "—"}</b>
                    {l.categorie_suivante && l.categorie_suivante !== l.categorie ? <span className="muted"> → {l.categorie_suivante}</span> : null}
                  </td>
                ) : def.source === "fistf" ? (
                  <td className="small hide-s">{l.pays}</td>
                ) : null}
                <td className="r num">{pts(l.points)}</td>
                {def.id === "FBFTS" && !compact ? <td className="r num small muted hide-s">{l.a_defendre ? pts(l.a_defendre) : ""}</td> : null}
              </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Colour of a place: the player's national category (FBFTS) or the FISTF list (Open, Vétérans, U20…). */
function couleurRang(l: LigneClassement, def: ListeDef) {
  if (def.id === "FBFTS") return couleurCategorie(l.categorie);
  if (def.source === "fistf" && def.type === "joueurs") return couleurCategorie(def.court);
  return undefined;
}

const sup = (n: number) => (n === 1 ? "er" : "e");

/** A place, big, with an optional label next to it (category, list…). */
function Place({ l, tag, sous, cat }: { l?: LigneClassement | null; tag?: string | null; sous?: string | null; cat?: string }) {
  if (!l) return <span className="pl pl-vide">—</span>;
  const t = tendance(l.evolution);
  const cc = couleurCategorie(cat || tag);
  return (
    <span className="pl" style={cc ? ({ "--cc": cc } as React.CSSProperties) : undefined}>
      <b className="pl-n num">
        {l.rang}
        <sup>{sup(l.rang)}</sup>
      </b>
      {tag ? <span className="pl-tag" style={couleurCategorie(tag) ? ({ "--cc": couleurCategorie(tag) } as React.CSSProperties) : undefined}>{tag}</span> : null}
      {t && t.cls !== "eq" ? <span className={`evo ${t.cls}`} title="Par rapport au classement précédent">{t.txt}</span> : null}
      {sous ? <span className="pl-sous">{sous}</span> : null}
    </span>
  );
}

/** Club places (national clubs ranking + FISTF club teams). */
export function PlacesClub({ clubs }: { clubs: LigneClassement[] }) {
  const nat = clubs.find((l) => l.liste === "FBFTS-Clubs");
  const equipes = clubs.filter((l) => l.liste === "WR-Teams").sort((a, b) => a.rang - b.rang);
  return (
    <div className="club-places">
      <article className="cp">
        <span className="cp-l">🇧🇪 Classement national des clubs</span>
        <span className="cp-v num">{nat ? <>{nat.rang}<sup>{sup(nat.rang)}</sup></> : "—"}</span>
        <span className="cp-qui v-club">{nat?.nom || "SC Lions d'Eugies"}</span>
        <span className="cp-s">{nat ? `club belge · ${pts(nat.points)} pts` : "En attente du classement"}</span>
        {nat ? <span className="cp-m">FBFTS · {libelleMois(nat.mois, true)}</span> : null}
      </article>
      <article className="cp">
        <span className="cp-l">🌍 Classement international des équipes</span>
        <span className="cp-v num">{equipes[0] ? <>{equipes[0].rang}<sup>{sup(equipes[0].rang)}</sup></> : "—"}</span>
        <span className="cp-qui v-club">{equipes[0] ? `${equipes[0].nom} · ${equipes[0].prenom || "Team A"}` : "SC Lions d'Eugies"}</span>
        <span className="cp-s">{equipes[0] ? `équipe · international · ${pts(equipes[0].points)} pts` : "En attente du classement"}</span>
        {equipes.length > 1 ? (
          <span className="cp-m">
            {equipes.slice(1).map((e) => `${e.prenom} ${ordinal(e.rang)}`).join(" · ")} · FISTF {libelleMois(equipes[0].mois, true)}
          </span>
        ) : null}
      </article>
    </div>
  );
}

type Joueur = { id: string; nom: string; lignes: LigneClassement[] };

/** One line per club player with his national and world places. */
export function NosJoueurs({ lignes, moi = [], lien = true, max = lien ? 12 : 0 }: { lignes: LigneClassement[]; moi?: string[]; lien?: boolean; max?: number }) {
  const parNom = new Map<string, Joueur>();
  for (const l of lignes.filter((x) => x.eugies && x.prenom !== null && x.liste !== "WR-Teams")) {
    const cle = l.joueur_id || `${l.nom}|${l.prenom}`.toLowerCase();
    const j = parNom.get(cle) || { id: cle, nom: nomComplet({ nom: l.nom.charAt(0) + l.nom.slice(1).toLowerCase(), prenom: l.prenom }), lignes: [] };
    if (l.liste === "FBFTS") j.nom = nomComplet(l);
    j.lignes.push(l);
    parNom.set(cle, j);
  }
  const tous = [...parNom.values()].sort((a, b) => {
    const fa = a.lignes.find((l) => l.liste === "FBFTS")?.rang ?? 9999;
    const fb = b.lignes.find((l) => l.liste === "FBFTS")?.rang ?? 9999;
    return fa - fb || Math.min(...a.lignes.map((l) => l.rang)) - Math.min(...b.lignes.map((l) => l.rang));
  });
  // Summary: the best players of the club (and always me), at most `max` lines.
  let joueurs = tous;
  if (max && tous.length > max) {
    joueurs = tous.slice(0, max);
    const miens = tous.filter((j) => moi.includes(j.id) && !joueurs.includes(j));
    if (miens.length) joueurs = [...tous.slice(0, max - miens.length), ...miens];
  }
  const caches = tous.length - joueurs.length;
  if (!joueurs.length)
    return <p className="vide">Les classements arrivent : ils sont importés automatiquement au début de chaque mois.</p>;
  return (
    <div className="nos">
      <div className="nos-h" aria-hidden="true">
        <span>Joueur</span>
        <span>🇧🇪 National</span>
        <span>🌍 International Open</span>
        <span>🌍 International catégorie</span>
      </div>
      <ol className="nos-l">
        {joueurs.map((j) => {
          const fb = j.lignes.find((l) => l.liste === "FBFTS");
          const open = j.lignes.find((l) => l.liste === "WR-Open");
          const cats = j.lignes.filter((l) => l.liste.startsWith("WR-") && l.liste !== "WR-Open").sort((a, b) => a.rang - b.rang);
          const estMoi = moi.includes(j.id);
          return (
            <li key={j.id} className={`nos-j${estMoi ? " moi" : ""}`}>
              <span className="nos-nom">
                <b>{j.nom}</b>
                {estMoi ? <span className="moi-tag">C&apos;est toi !</span> : null}
              </span>
              <span className="nos-c" data-l="🇧🇪 National">
                <Place l={fb} tag={fb?.categorie} sous={fb?.categorie_suivante && fb.categorie_suivante !== fb.categorie ? `→ ${fb.categorie_suivante}` : null} />
              </span>
              <span className="nos-c" data-l="🌍 International Open">
                <Place l={open} cat="Open" />
              </span>
              <span className="nos-c" data-l="🌍 International catégorie">
                <Place l={cats[0]} tag={cats[0] ? listeDef(cats[0].liste).court : null} sous={cats[1] ? `${listeDef(cats[1].liste).court} ${ordinal(cats[1].rang)}` : null} />
              </span>
            </li>
          );
        })}
      </ol>
      {lien ? (
        <Link className="nos-lien" href="/club/classements">
          {caches ? `+ ${caches} autre${caches > 1 ? "s" : ""} joueur${caches > 1 ? "s" : ""} · ` : ""}Voir les classements complets →
        </Link>
      ) : null}
    </div>
  );
}

/** Player's own block: one card per ranking with his row glowing in the middle of his neighbours. */
export function MesClassements({ extraits, moi }: { extraits: { liste: string; lignes: LigneClassement[] }[]; moi: string }) {
  if (!extraits.length)
    return (
      <p className="vide">
        Pas encore au classement : il suffit de jouer un tournoi officiel ! Les classements national (FBFTS) et international (FISTF) sont mis à jour chaque mois.
      </p>
    );
  return (
    <div className="mes-cl">
      {extraits.map((x) => {
        const def = listeDef(x.liste);
        const l = x.lignes.find((y) => y.joueur_id === moi)!;
        const t = tendance(l.evolution);
        return (
          <article key={x.liste} className={`mcl l-${def.source === "fbfts" ? "nat" : x.liste === "WR-Open" ? "open" : "cat"}`}>
            <header className="mcl-h">
              <span className="fl-l">
                {def.ic} {def.titre}
              </span>
              <span className="muted small">{libelleMois(l.mois, true)}</span>
            </header>
            <div className="mcl-big">
              <span className="mcl-r num" style={couleurRang(l, def) ? ({ "--cc": couleurRang(l, def) } as React.CSSProperties) : undefined}>
                {l.rang}
                <small>{l.rang === 1 ? "er" : "e"}</small>
              </span>
              <span className="mcl-d">
                <b className="num">{pts(l.points)} pts</b>
                {l.categorie ? <span>Catégorie <b className="cat-c" style={{ "--cc": couleurCategorie(l.categorie) } as React.CSSProperties}>{l.categorie}</b>{l.categorie_suivante && l.categorie_suivante !== l.categorie ? ` → ${l.categorie_suivante}` : ""}</span> : null}
                {t ? <span className={`evo ${t.cls}`}>{t.txt === "=" ? "= stable" : t.txt}</span> : null}
              </span>
            </div>
            <TableClassement lignes={x.lignes} def={def} moi={[moi]} compact />
            <Link className="small" href={`/club/classements?l=${def.id}#bloc-complet`}>
              Tout le classement →
            </Link>
          </article>
        );
      })}
    </div>
  );
}

export const LISTES_JOUEURS = LISTES.filter((l) => l.type === "joueurs");

/** Full club rankings so the club can see where it stands (our lines highlighted). */
export function ClassementsClubs({ nat: natTout, equipes: eqTout }: { nat: LigneClassement[]; equipes: LigneClassement[] }) {
  // Only the useful part: the first places, then the zone around our club (12 lines at most).
  const nat = resserrer(natTout, (l) => l.eugies);
  const equipes = resserrer(eqTout, (l) => l.eugies);
  if (!nat.length && !equipes.length) return <p className="vide">Les classements des clubs arrivent avec la prochaine mise à jour.</p>;
  const ligne = (l: LigneClassement, k: number, prec?: LigneClassement) => {
    const t = tendance(l.evolution);
    return (
      <Fragment key={k}>
        {prec && l.rang - prec.rang > 1 ? (
          <li key={`s${k}`} className="cc-saut" aria-hidden="true">
            ⋯
          </li>
        ) : null}
        <li key={k} className={`cc-l${l.eugies ? " nous" : ""}`}>
          <span className="cc-r num">
            {l.rang}
            <sup>{sup(l.rang)}</sup>
          </span>
          <span className="cc-n">
            <b>{l.nom}</b>
            {l.liste === "WR-Teams" ? <small>{[l.prenom, l.pays].filter(Boolean).join(" · ")}</small> : null}
          </span>
          <span className="cc-p num">{pts(l.points)}</span>
          <span className={`evo ${t?.cls || ""}`}>{t?.txt || ""}</span>
        </li>
      </Fragment>
    );
  };
  return (
    <div className="cc">
      <section className="cc-b nat">
        <header>
          <span className="cc-k">🇧🇪 Classement national des clubs</span>
          <span className="cc-m">FBFTS · {nat[0] ? libelleMois(nat[0].mois, true) : ""} · {natTout.length} clubs</span>
        </header>
        <div className="cc-cols" aria-hidden="true"><span>Place</span><span>Club</span><span>Points</span><span>±</span></div>
        <ol>{nat.map((l, k) => ligne(l, k, nat[k - 1]))}</ol>
        <Link className="cc-tout" href="/club/classements?l=FBFTS-Clubs#bloc-complet">Classement complet →</Link>
      </section>
      <section className="cc-b monde">
        <header>
          <span className="cc-k">🌍 Classement international des équipes de club</span>
          <span className="cc-m">FISTF · {equipes[0] ? libelleMois(equipes[0].mois, true) : ""} · les premiers et autour de nos équipes</span>
        </header>
        <div className="cc-cols" aria-hidden="true"><span>Place</span><span>Équipe</span><span>Points</span><span>±</span></div>
        <ol>{equipes.map((l, k) => ligne(l, k, equipes[k - 1]))}</ol>
        <Link className="cc-tout" href="/club/classements?l=WR-Teams#bloc-complet">Classement complet →</Link>
      </section>
    </div>
  );
}
