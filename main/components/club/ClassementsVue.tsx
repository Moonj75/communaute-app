"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Blocs from "@/components/Blocs";
import LogoFistf from "@/components/LogoFistf";
import { LISTES, SOURCES, libelleMois, listeDef, pts, couleurCategorie, type LigneClassement, type ListeDef } from "@/lib/classements-types";
import { Evo, LogoClub, clubCourt, couleurRang } from "./Classements";

/** Rankings already received during this visit: switching back to one is instant. */
const memoire = new Map<string, LigneClassement[]>();
const enCours = new Map<string, Promise<LigneClassement[]>>();

function charger(l: string): Promise<LigneClassement[]> {
  const deja = memoire.get(l);
  if (deja) return Promise.resolve(deja);
  const p = enCours.get(l);
  if (p) return p;
  const q = fetch(`/api/classements?l=${encodeURIComponent(l)}`, { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { lignes: LigneClassement[] }) => {
      memoire.set(l, d.lignes);
      return d.lignes;
    })
    .finally(() => enCours.delete(l));
  enCours.set(l, q);
  return q;
}

type Filtre = "" | "club" | "bel";
const VISIBLES = ["FBFTS-Clubs", "WR-Teams", "FBFTS", "WR-Open"];
const INTER = LISTES.filter((l) => l.source === "fistf");
const court = (l: ListeDef) => l.court.replace(/^International\s+/, "");
/** Rows drawn at once; the rest of a long list follows right after, out of sight. */
const PREMIERS = 150;

/** One ranking table, always the same size and font: it scrolls inside its frame. */
function Table({ lignes, def, moi, cadre }: { lignes: LigneClassement[]; def: ListeDef; moi: string[]; cadre: React.RefObject<HTMLDivElement | null> }) {
  const cible = useMemo(() => lignes.findIndex((l) => l.joueur_id && moi.includes(l.joueur_id)) >= 0 ? lignes.findIndex((l) => l.joueur_id && moi.includes(l.joueur_id)) : lignes.findIndex((l) => l.eugies), [lignes, moi]);
  const debut = Math.max(PREMIERS, cible + 40);
  const [n, setN] = useState(Math.min(lignes.length, debut));
  useEffect(() => {
    if (n >= lignes.length) return;
    const t = window.setTimeout(() => setN(lignes.length), 60);
    return () => clearTimeout(t);
  }, [n, lignes.length]);
  const tousNous = lignes.length > 0 && lignes.every((l) => l.eugies);

  // Our row in the middle of the frame, at once, before the table is shown (no visible jump).
  useLayoutEffect(() => {
    const c = cadre.current;
    if (!c) return;
    const r = cible >= 0 ? c.querySelector<HTMLElement>("#ma-ligne") : null;
    c.scrollTop = r ? Math.max(0, r.offsetTop - (c.clientHeight - r.offsetHeight) / 2) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lignes]);

  const info = def.id === "FBFTS" ? "Cat." : def.type === "equipes" ? "Équipe" : def.source === "fistf" ? "Pays" : "";
  return (
    <table className="clv-t">
      <colgroup>
        <col className="k-rg" />
        <col />
        <col className="k-evo" />
        {info ? <col className="k-info" /> : null}
        <col className="k-pts" />
      </colgroup>
      <thead>
        <tr>
          <th className="r">#</th>
          <th>{def.type === "joueurs" ? "Joueur" : "Club"}</th>
          <th>±</th>
          {info ? <th>{info}</th> : null}
          <th className="r">Points</th>
        </tr>
      </thead>
      <tbody>
        {lignes.slice(0, n).map((l, k) => {
          const estMoi = Boolean(l.joueur_id && moi.includes(l.joueur_id));
          const cc = couleurRang(l, def);
          return (
            <tr key={k} id={k === cible ? "ma-ligne" : undefined} className={[estMoi || (k === cible && !tousNous) ? "moi" : l.eugies && !tousNous ? "eug" : "", k === cible ? "cible" : ""].filter(Boolean).join(" ") || undefined}>
              <td className="r num rg" style={cc ? ({ "--cc": cc } as React.CSSProperties) : undefined}>{l.rang}</td>
              <td className="nm">
                {def.type === "joueurs" ? <><b>{l.nom}</b> {l.prenom}</> : <b>{l.nom}</b>}
                {estMoi ? <span className="moi-tag">Toi</span> : k === cible && !tousNous ? <span className="moi-tag">Nous</span> : null}
                {def.type === "joueurs" ? <small className="clv-club">{l.eugies ? <LogoClub /> : clubCourt(l)}</small> : null}
              </td>
              <td className="evo-c"><Evo e={l.evolution} /></td>
              {info === "Cat." ? (
                <td className="c"><b className="cat-c" style={couleurCategorie(l.categorie) ? ({ "--cc": couleurCategorie(l.categorie) } as React.CSSProperties) : undefined}>{l.categorie && l.categorie.length > 4 ? `${l.categorie.slice(0, 3)}.` : l.categorie || "—"}</b></td>
              ) : info === "Équipe" ? <td className="c small">{l.prenom}</td> : info === "Pays" ? <td className="c small">{l.pays}</td> : null}
              <td className="r num">{pts(l.points)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * The rankings page, all in the browser once open: changing list, filter or tab never reloads the page.
 * Lists already seen are kept; the main ones are fetched quietly in the background.
 */
export default function ClassementsVue(p: {
  l: string;
  f: Filtre;
  lignes: LigneClassement[];
  visiteur: boolean;
  moi: string[];
  compte: Record<string, number>;
  nosLignes: Record<string, number>;
}) {
  const [l, setL] = useState(p.l);
  const [f, setF] = useState<Filtre>(p.f);
  const [toutes, setToutes] = useState<LigneClassement[]>(() => {
    memoire.set(p.l, p.lignes);
    return p.lignes;
  });
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const cadre = useRef<HTMLDivElement>(null);
  const def = listeDef(l);
  const groupe = l === "FBFTS" ? "nat" : l === "FBFTS-Clubs" ? "clubs" : "int";

  const choisir = useCallback((nl: string, nf: Filtre = f) => {
    const filtre: Filtre = p.visiteur ? "club" : nf === "bel" && listeDef(nl).source !== "fistf" ? "" : nf;
    setErreur(null);
    window.history.replaceState(null, "", `/club/classements?l=${nl}${filtre && !p.visiteur ? `&f=${filtre}` : ""}`);
    const deja = memoire.get(nl);
    if (deja) { setL(nl); setF(filtre); setToutes(deja); return; }
    setAttente(true);
    charger(nl)
      .then((d) => { setL(nl); setF(filtre); setToutes(d); })
      .catch(() => setErreur("Ce classement n'a pas pu être chargé. Vérifie ta connexion."))
      .finally(() => setAttente(false));
  }, [f, p.visiteur]);

  // The main lists are fetched quietly once the page is shown, so they open at once later.
  useEffect(() => {
    const listes = p.visiteur ? VISIBLES : ["FBFTS", "FBFTS-Clubs", "WR-Open", "WR-Teams", ...INTER.map((x) => x.id)];
    let i = 0;
    let arret = false;
    const suite = () => {
      if (arret || i >= listes.length) return;
      const x = listes[i++];
      charger(x).catch(() => null).finally(() => window.setTimeout(suite, 250));
    };
    const t = window.setTimeout(suite, 1200);
    return () => { arret = true; clearTimeout(t); };
  }, [p.visiteur]);

  const lignes = useMemo(() => (f === "club" ? toutes.filter((x) => x.eugies) : f === "bel" ? toutes.filter((x) => x.pays === "BEL") : toutes), [toutes, f]);
  const aMoi = lignes.some((x) => x.joueur_id && p.moi.includes(x.joueur_id));
  const aNous = aMoi || lignes.some((x) => x.eugies);
  const allerMaLigne = () => {
    const c = cadre.current;
    const r = c?.querySelector<HTMLElement>("#ma-ligne");
    if (c && r) c.scrollTo({ top: Math.max(0, r.offsetTop - (c.clientHeight - r.offsetHeight) / 2), behavior: "smooth" });
  };
  const FILTRES: { id: Filtre; txt: string; fistf?: boolean }[] = [
    { id: "", txt: "Tout" },
    { id: "club", txt: "🦁 Eugies" },
    { id: "bel", txt: "🇧🇪 Belges", fistf: true },
  ];
  const mois = toutes[0]?.mois;

  const contenu = (
    <div className="clv ecran-fixe">
      {groupe === "int" && !p.visiteur ? (
        <nav className="clv-tabs" aria-label="Classements internationaux">
          {INTER.map((x) => (
            <button key={x.id} type="button" className={x.id === l ? "on" : undefined} aria-current={x.id === l ? "page" : undefined} onPointerEnter={() => charger(x.id).catch(() => null)} onClick={() => choisir(x.id)}>
              {court(x)}
              {p.nosLignes[x.id] ? <span className="cl-n">{p.nosLignes[x.id]}</span> : null}
            </button>
          ))}
        </nav>
      ) : null}
      <div className="clv-barre">
        {!p.visiteur ? (
          <div className="clv-filtres" role="radiogroup" aria-label="Filtre">
            {FILTRES.filter((x) => !x.fistf || def.source === "fistf").map((x) => (
              <button key={x.id || "tout"} type="button" role="radio" aria-checked={f === x.id} className={f === x.id ? "on" : undefined} onClick={() => setF(x.id)}>{x.txt}</button>
            ))}
          </div>
        ) : <span />}
        {aNous && f !== "club" ? <button type="button" className="clv-moi" onClick={allerMaLigne}>{aMoi ? "◎ Ma ligne" : "◎ Notre club"}</button> : null}
      </div>
      <section className={`clv-panel${attente ? " attente" : ""}`}>
        <header className="clv-tete">
          <h2>{def.source === "fistf" ? <LogoFistf taille={18} /> : <span aria-hidden="true">{def.ic}</span>} {def.titre}</h2>
          <span>{mois ? libelleMois(mois, true) : ""} · {p.compte[l] || toutes.length} classés · <a href={SOURCES[def.source].page} target="_blank" rel="noopener">source ↗</a></span>
          <i className="clv-charge" aria-hidden="true" />
        </header>
        <div className="clv-cadre" ref={cadre}>
          {erreur ? <p className="vide">{erreur}</p> : lignes.length ? <Table key={`${l}-${f}`} lignes={lignes} def={def} moi={p.moi} cadre={cadre} /> : <p className="vide">Ce classement n&apos;a pas encore été importé.</p>}
        </div>
      </section>
      <p className="cl-legende small">
        <span className="lg moi" /> {aMoi ? "toi" : "notre club"} <span className="lg eug" /> autres joueurs ou équipes d&apos;Eugies
      </p>
    </div>
  );

  const lien = (id: string, titre: string, ic: React.ReactNode) => ({ id, titre, ic, onClick: () => choisir(id) });
  return (
    <Blocs
      page="Classements"
      blocs={[{ id: "complet", titre: def.titre, ic: def.source === "fistf" ? <LogoFistf taille={22} /> : def.ic, contenu }]}
      pages={p.visiteur ? [
        lien("FBFTS-Clubs", "Club 🇧🇪", "🦁"),
        lien("WR-Teams", "Club FISTF", <LogoFistf taille={22} />),
        lien("FBFTS", "Joueurs 🇧🇪", "🇧🇪"),
        lien("WR-Open", "Joueurs FISTF", <LogoFistf taille={22} />),
      ] : [
        { ...lien("FBFTS", "National", "🇧🇪"), id: "nat" },
        { ...lien("FBFTS-Clubs", "Clubs belges", "🏟️"), id: "clubs" },
        { id: "int", titre: "International", ic: <LogoFistf taille={22} />, onClick: () => choisir(groupe === "int" ? l : "WR-Open") },
      ]}
      pageActuelle={p.visiteur ? l : groupe}
    />
  );
}
