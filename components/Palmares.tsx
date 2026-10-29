"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES_P, JEUNES, RANGS, classeRang, cleSaison, compter, icRang, libelleRang, motRang, placeDe, triMedailles, triVitrine, type ResultatP } from "@/lib/palmares-types";
import { Trophee } from "./Trophee";
import { ajouterResultat, importerHistorique, rafraichirPalmares, supprimerResultat, traiterProposition, type RetourP } from "@/lib/palmares-actions";
import "./palmares.css";
import Roue, { type Cran } from "./Roue";
import Blocs from "./Blocs";
import type { Exploit } from "@/lib/palmares-types";

type Noms = Record<string, string>;
const quiDe = (r: ResultatP, noms: Noms) => [...r.joueurs.map((j) => noms[j] || "?"), ...(r.equipe ? [r.equipe] : [])].join(", ");

/** One line of result: medal, rank · competition, who (optional) and category, season. */
function Ligne({ r, noms, montrerQui = true, actions }: { r: ResultatP; noms?: Noms; montrerQui?: boolean; actions?: React.ReactNode }) {
  return (
    <li className={`pa-l${r.statut === "À valider" ? " attente" : ""}`}>
      <span className="pa-md" aria-hidden="true">{icRang(r.rang)}</span>
      <span className="pa-t">
        <b>{libelleRang(r)}</b> · {r.competition}
        <small>{[montrerQui && noms ? quiDe(r, noms) : null, r.categorie, r.parEquipe && !r.equipe ? "par équipe" : null].filter(Boolean).join(" · ")}</small>
      </span>
      <span className="pa-s">{r.saison || ""}</span>
      {actions}
    </li>
  );
}

function Compteurs({ m, total }: { m: ReturnType<typeof compter>; total?: boolean }) {
  return (
    <div className="pa-tot">
      <div><b>{m.or}</b><span>🥇 {total ? "titres" : ""}</span></div>
      <div><b>{m.argent}</b><span>🥈 {total ? "finales" : ""}</span></div>
      <div><b>{m.bronze}</b><span>🥉 {total ? "demi-finales" : ""}</span></div>
      {!total ? <div><b>{m.total}</b><span>résultats</span></div> : null}
    </div>
  );
}

const estEquipe = (r: ResultatP) => r.parEquipe || Boolean(r.equipe);
const FILTRES: { id: string; nom: string; f: (r: ResultatP) => boolean }[] = [
  { id: "tout", nom: "Tout", f: () => true },
  { id: "ind", nom: "👤 Individuel", f: (r) => !estEquipe(r) },
  { id: "eq", nom: "👥 Par équipe", f: estEquipe },
  { id: "be", nom: "🇧🇪 Belgique", f: (r) => r.type === "Belgique" },
  { id: "int", nom: "🌍 International", f: (r) => r.type === "International" },
  { id: "jeunes", nom: "🧒 Jeunes", f: (r) => JEUNES.test(r.categorie || "") },
  { id: "club", nom: "🦁 Interne", f: (r) => r.type === "Interne" },
];

/** One trophy card: picture, rank word (VICTOIRE / FINALE big), who, competition, individual or team. */
function Carte({ r, qui, delai = 0, action }: { r: ResultatP; qui?: string; delai?: number; action?: React.ReactNode }) {
  const p = placeDe(r);
  const c = classeRang(p);
  const eq = estEquipe(r);
  return (
    <li className={`pk ${c}${r.statut === "À valider" ? " attente" : ""}`}>
      {r.categorie ? <span className="pk-cat">{r.categorie}</span> : null}
      {action}
      <Trophee place={p} equipe={eq} taille={52} delai={delai} />
      <span className={`pk-pl ${c}`}>{motRang(p)}</span>
      {qui ? <b className="pk-qui">{qui}</b> : null}
      <span className="pk-co">{r.competition}</span>
      <span className={`pk-badge ${eq ? "eq" : "in"}`}>{eq ? "👥 Par équipe" : "👤 Individuel"}</span>
    </li>
  );
}

/** Cards grouped by season (newest first, victories first in each season); long seasons and old seasons fold away. */
function SaisonsCartes({ liste, noms, ouvertes = 2, parSaison = 6, actions }: { liste: ResultatP[]; noms?: Noms; ouvertes?: number; parSaison?: number; actions?: (r: ResultatP) => React.ReactNode }) {
  const [tout, setTout] = useState(false);
  const [ouv, setOuv] = useState<string[]>([]);
  const saisons = useMemo(() => {
    const m = new Map<string, ResultatP[]>();
    for (const r of liste) m.set(r.saison || "Sans date", [...(m.get(r.saison || "Sans date") || []), r]);
    return [...m.entries()].map(([s, l]) => [s, l.sort(triVitrine)] as const).sort((a, b) => cleSaison(b[0]) - cleSaison(a[0]));
  }, [liste]);
  if (!liste.length) return <p className="vide">Pas encore de résultat… le premier arrive ! 💪</p>;
  const vues = tout ? saisons : saisons.slice(0, ouvertes);
  return (
    <div className="pa-saisons">
      {vues.map(([s, l]) => {
        const m = compter(l);
        const plein = ouv.includes(s);
        const montre = plein ? l : l.slice(0, parSaison);
        return (
          <section key={s}>
            <p className="pk-sz">{s} <small>{m.or ? `🏆 ${m.or} ` : ""}{m.argent ? `🥈 ${m.argent} ` : ""}{m.bronze ? `🥉 ${m.bronze} ` : ""}· {l.length} résultat{l.length > 1 ? "s" : ""}</small></p>
            <ul className="pk-grille">{montre.map((r, i) => <Carte key={r.id} r={r} qui={noms ? quiDe(r, noms) : undefined} delai={(i % 6) * 0.5} action={actions?.(r)} />)}</ul>
            {l.length > parSaison ? <button type="button" className="btn en-mini pa-plus" onClick={() => setOuv((o) => (plein ? o.filter((x) => x !== s) : [...o, s]))}>{plein ? "Replier" : `+ ${l.length - parSaison} autres résultats de ${s}`}</button> : null}
          </section>
        );
      })}
      {saisons.length > ouvertes ? <button type="button" className="btn pa-plus" onClick={() => setTout((t) => !t)}>{tout ? "Replier" : `Voir les ${saisons.length - ouvertes} saisons précédentes`}</button> : null}
    </div>
  );
}

const initiales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("") || "?";

/** Victory counter: the number big, gold, in the display font; finals and semi-finals next to it. */
function Victoires({ m, titre = "Victoires", sous }: { m: ReturnType<typeof compter>; titre?: string; sous?: string }) {
  return (
    <div className="vk">
      <span className="vk-cup"><Trophee place={1} taille={58} /></span>
      <b className="vk-n num">{m.or}</b>
      <span className="vk-l"><b>{titre}</b>{sous ? <small>{sous}</small> : null}</span>
      <span className="vk-p"><span><Trophee place={2} taille={26} delai={0.7} />{m.argent}</span><span><Trophee place={3} taille={26} delai={1.4} />{m.bronze}</span></span>
    </div>
  );
}

const versCran = (r: ResultatP, noms: Noms): Cran => ({ id: r.id, place: placeDe(r), equipe: estEquipe(r), qui: quiDe(r, noms), competition: r.competition, categorie: r.categorie, saison: r.saison, date: r.date });
const FILTRES_R = FILTRES.filter((x) => x.id !== "club");

/**
 * The palmarès page, one screen per page, chosen in the bottom bar (like the rankings):
 * Honneur (victories, podium), Résultats (the wheel: the chosen result always in the middle), then the tools.
 */
export function PalmaresPages({ resultats, noms, gerer = false, outils, initial }: { resultats: ResultatP[]; noms: Noms; gerer?: boolean; /** Other pages (add, validate, import), drawn on the server. */ outils: { id: string; titre: string; ic: string; badge?: string | null; contenu: React.ReactNode }[]; initial?: string }) {
  const [page, setPage] = useState(initial || "honneur");
  // Old links (« /palmares#bloc-ajouter », notifications) open the right page.
  useEffect(() => {
    const lire = () => { const h = window.location.hash.replace(/^#bloc-/, ""); if (h === "club") setPage("honneur"); else if (h) setPage(h); };
    lire();
    window.addEventListener("hashchange", lire);
    return () => window.removeEventListener("hashchange", lire);
  }, []);
  const [f, setF] = useState("tout");
  const [sz, setSz] = useState("");
  const router = useRouter();
  const [pending, start] = useTransition();
  const valides = useMemo(() => resultats.filter((r) => r.statut === "Validé"), [resultats]);
  const saisons = useMemo(() => [...new Set(valides.map((r) => r.saison).filter((s): s is string => Boolean(s)))].sort((a, b) => cleSaison(b) - cleSaison(a)), [valides]);
  const deSaison = valides.filter((r) => !sz || r.saison === sz);
  const ind = compter(deSaison.filter((r) => !estEquipe(r)));
  const eq = compter(deSaison.filter(estEquipe));
  const honneur = useMemo(() => {
    const m = new Map<string, ResultatP[]>();
    for (const r of deSaison) for (const k of r.joueurs.length ? r.joueurs : r.equipe ? [r.equipe] : []) m.set(k, [...(m.get(k) || []), r]);
    return [...m.entries()].map(([k, l]) => ({ k, nom: noms[k] || k, m: compter(l) })).filter((x) => x.m.or + x.m.argent + x.m.bronze > 0).sort((a, b) => triMedailles(a.m, b.m)).slice(0, 6);
  }, [deSaison, noms]);
  const filtre = FILTRES.find((x) => x.id === f)!.f;
  const crans = useMemo(() => deSaison.filter(filtre).sort(triVitrine).map((r) => versCran(r, noms)), [deSaison, filtre, noms]);
  const podium = [honneur[1], honneur[0], honneur[2]];
  const choixSaison = (
    <select className="pa-sel" value={sz} onChange={(e) => setSz(e.target.value)} aria-label="Saison">
      <option value="">Toutes les saisons</option>
      {saisons.map((s) => <option key={s}>{s}</option>)}
    </select>
  );

  const vueHonneur = (
    <div className="pa pa-ecran">
      <div className="pk-split">
        {[{ m: ind, e: false }, { m: eq, e: true }].map(({ m, e }) => (
          <div key={String(e)} className={`pk-sp ${e ? "eq" : "in"}`}>
            <span className="pk-sp-t">{e ? "👥 Par équipe" : "👤 Individuel"}</span>
            <span className="pk-sp-v"><Trophee place={1} equipe={e} taille={40} /><b className="num">{m.or}</b><small>victoire{m.or > 1 ? "s" : ""}</small></span>
            <span className="pk-sp-a">🥈 {m.argent} · 🥉 {m.bronze}</span>
          </div>
        ))}
      </div>
      <div className="pa-ligne"><p className="pa-h">🏆 Tableau d&apos;honneur</p>{choixSaison}</div>
      <div className="pk-pod">
        {podium.map((x, i) => x ? (
          <div key={x.k} className={`pk-pc p${i === 1 ? 1 : i === 0 ? 2 : 3}`}>
            {i === 1 ? <span className="pk-pc-cup"><Trophee place={1} taille={54} /></span> : <span className="pk-rk">{i === 0 ? 2 : 3}</span>}
            <span className="pk-av">{initiales(x.nom)}</span>
            <b>{x.nom}</b>
            <span className="pk-pv"><b className="num">{x.m.or}</b> 🏆</span>
            <small>🥈{x.m.argent} 🥉{x.m.bronze}</small>
          </div>
        ) : <div key={i} />)}
      </div>
      {honneur.length > 3 ? (
        <ol className="pk-hl">
          {honneur.slice(3).map((x, i) => <li key={x.k}><span className="pa-rk">{i + 4}</span><b>{x.nom}</b><i><b className="pk-hv num">{x.m.or}</b> 🏆 · 🥈{x.m.argent} 🥉{x.m.bronze}</i></li>)}
        </ol>
      ) : null}
    </div>
  );

  const vueResultats = (
    <div className="pa pa-ecran">
      <div className="pa-filtres" role="tablist">
        {FILTRES_R.map((x) => <button key={x.id} type="button" role="tab" aria-selected={f === x.id} className={f === x.id ? "on" : undefined} onClick={() => setF(x.id)}>{x.nom}</button>)}
        {choixSaison}
        {gerer ? <button type="button" title="Mettre à jour depuis Notion" disabled={pending} onClick={() => start(async () => { await rafraichirPalmares(); router.refresh(); })}>🔄</button> : null}
      </div>
      <Roue key={`${f}-${sz}`} crans={crans} voisins={3} auto
        outil={gerer ? (c) => <button type="button" className="pa-x" disabled={pending} title="Retirer ce résultat" onClick={() => { if (window.confirm("Retirer ce résultat ?")) start(async () => { await supprimerResultat(c.id); router.refresh(); }); }}>✕</button> : undefined} />
    </div>
  );

  const pages = [
    { id: "honneur", titre: "Honneur", ic: "🏆", contenu: vueHonneur },
    { id: "resultats", titre: "Résultats", ic: "📜", contenu: vueResultats },
    ...outils,
  ];
  const actuelle = pages.find((x) => x.id === page) || pages[0];
  return (
    <Blocs
      page="Palmarès"
      blocs={[{ id: actuelle.id, titre: actuelle.titre, ic: actuelle.ic, contenu: actuelle.contenu }]}
      pages={pages.map((x) => ({ id: x.id, titre: x.titre, ic: x.ic, onClick: () => setPage(x.id) }))}
      pageActuelle={actuelle.id}
    />
  );
}

/** A player's own palmarès (in his fiche): same trophy cards, without his name on each. */
export function PalmaresJoueur({ resultats }: { resultats: ResultatP[] }) {
  const valides = resultats.filter((r) => r.statut === "Validé");
  const attente = resultats.filter((r) => r.statut === "À valider");
  return (
    <div className="pa">
      <Compteurs m={compter(valides)} />
      {attente.length ? <p className="muted small">⏳ {attente.length} résultat{attente.length > 1 ? "s" : ""} en attente de validation.</p> : null}
      <SaisonsCartes liste={valides} ouvertes={2} parSaison={4} />
      <a className="btn primary pa-ajout" href="/palmares#bloc-ajouter">➕ Ajouter un résultat</a>
    </div>
  );
}

/** Home page block: the victories counter, then the wheel of exploits (one at a time, big, in the middle). */
export function PalmaresAccueil({ exploits, totaux }: { /** Chosen on the server: victories first, newest first. */ exploits: Exploit[]; totaux: ReturnType<typeof compter> }) {
  return (
    <div className="pa">
      <Victoires m={totaux} sous="du club, toutes saisons" />
      <Roue crans={exploits} auto compact voisins={2} />
      <a className="btn primary pa-ajout" href="/palmares">🏆 Tout le palmarès du club →</a>
    </div>
  );
}

/** Form to add a result (validated at once for the people in charge, proposed for the others). */
export function AjoutResultat({ joueurs, competitions, responsable, moi, initial }: { joueurs: { id: string; nom: string; archive?: boolean }[]; competitions: { nom: string; date: string }[]; responsable: boolean; moi: string[]; /** Prefilled from the post-competition notification. */ initial?: { competition: string; date: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [info, setInfo] = useState<RetourP | null>(null);
  const [choisis, setChoisis] = useState<string[]>(moi.slice(0, 1));
  const [equipe, setEquipe] = useState("");
  const [rang, setRang] = useState("");
  const [cat, setCat] = useState("");
  const [compet, setCompet] = useState(initial?.competition || "");
  const [date, setDate] = useState(initial?.date || "");
  const [cherche, setCherche] = useState("");
  const proposes = joueurs.filter((j) => !choisis.includes(j.id) && (!cherche || j.nom.toLowerCase().includes(cherche.toLowerCase()))).slice(0, cherche ? 8 : 0);
  const envoyer = (fd: FormData) => start(async () => {
    choisis.forEach((c) => fd.append("joueurs", c));
    const r = await ajouterResultat(fd);
    setInfo(r);
    if (r.ok) { setRang(""); setCompet(""); setDate(""); setChoisis(moi.slice(0, 1)); setEquipe(""); router.refresh(); }
  });
  return (
    <form action={envoyer} className="pa-form">
      {!responsable ? <p className="muted small">Ton résultat sera vérifié par le responsable palmarès avant d&apos;apparaître.</p> : null}
      <label className="f">Compétition
        <input className="input" name="competition" list="pa-compets" required value={compet} placeholder="Ex. Open de Frameries" onChange={(e) => {
          setCompet(e.target.value);
          const c = competitions.find((x) => x.nom === e.target.value);
          if (c) setDate(c.date);
        }} />
        <datalist id="pa-compets">{competitions.map((c) => <option key={c.nom + c.date} value={c.nom}>{c.date}</option>)}</datalist>
      </label>
      <label className="f">Date <small className="muted">(la saison est calculée toute seule)</small>
        <input className="input" type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="f">Joueur(s)
        <div className="pa-chips">
          {choisis.map((id) => <button type="button" key={id} className="pa-chip on" onClick={() => setChoisis((c) => c.filter((x) => x !== id))}>{joueurs.find((j) => j.id === id)?.nom || "?"} ✕</button>)}
          {["Team A", "Team B"].map((t) => <button type="button" key={t} className={`pa-chip${equipe === t ? " on" : ""}`} onClick={() => setEquipe((e) => (e === t ? "" : t))}>👥 {t}</button>)}
        </div>
        <input className="input" placeholder="🔎 Ajouter un joueur…" value={cherche} onChange={(e) => setCherche(e.target.value)} />
        {proposes.length ? <div className="pa-chips">{proposes.map((j) => <button type="button" key={j.id} className="pa-chip" onClick={() => { setChoisis((c) => [...c, j.id]); setCherche(""); }}>+ {j.nom}{j.archive ? " (ancien)" : ""}</button>)}</div> : null}
        <input type="hidden" name="equipe" value={equipe} />
      </div>
      <div className="f">Catégorie
        <div className="pa-chips">{CATEGORIES_P.slice(0, 10).map((c) => <button type="button" key={c} className={`pa-chip${cat === c ? " on" : ""}`} onClick={() => setCat((x) => (x === c ? "" : c))}>{c}</button>)}</div>
        <input type="hidden" name="categorie" value={cat} />
      </div>
      <div className="f">Résultat
        <div className="pa-rangs">{RANGS.map((r) => <button type="button" key={r.id} className={`pa-chip${rang === r.id ? " on" : ""}`} onClick={() => setRang(r.id)}>{r.ic} {r.court}</button>)}</div>
        <input type="hidden" name="rang" value={rang} />
        {rang === "Autre place" ? <input className="input" name="place" type="number" min={1} max={999} placeholder="Place obtenue (ex. 9)" required /> : null}
      </div>
      <label className="pa-coche"><input type="checkbox" name="parEquipe" /> Résultat par équipe</label>
      <label className="f">Lien vers les résultats <small className="muted">(facultatif)</small><input className="input" name="lien" type="url" placeholder="https://…" /></label>
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      <button className="btn primary" type="submit" disabled={pending || !rang} style={{ minHeight: 50 }}>{pending ? "Enregistrement…" : responsable ? "✅ Enregistrer dans le palmarès" : "📨 Proposer ce résultat"}</button>
    </form>
  );
}

/** Responsable / staff: the results proposed by the players. */
export function AValider({ liste, noms }: { liste: ResultatP[]; noms: Noms }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  if (!liste.length) return <p className="vide">Rien à valider pour le moment ✓</p>;
  return (
    <div className="pa">
      {info ? <p className="notice ok">{info}</p> : null}
      <ul className="pa-liste">
        {liste.map((r) => (
          <Ligne key={r.id} r={r} noms={noms} actions={
            <span className="pa-act">
              <small>par {r.proposePar || "?"}</small>
              <button type="button" className="btn primary en-mini" disabled={pending} onClick={() => start(async () => { const x = await traiterProposition(r.id, true); setInfo(x.message); router.refresh(); })}>✅ Valider</button>
              <button type="button" className="btn en-mini" disabled={pending} onClick={() => start(async () => { const x = await traiterProposition(r.id, false); setInfo(x.message); router.refresh(); })}>✕ Refuser</button>
            </span>
          } />
        ))}
      </ul>
    </div>
  );
}

/** Staff, once: imports the history (35 per round, goes on by itself until the end). */
export function ImportHistorique({ deja }: { deja: number }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const lancer = async () => {
    setEnCours(true);
    for (let i = 0; i < 30; i++) {
      const r = await importerHistorique().catch((e) => ({ ok: false, message: e instanceof Error ? e.message : "Erreur", reste: 0 }));
      setMsg(r.message);
      if (!r.ok || !r.reste) break;
    }
    setEnCours(false);
    router.refresh();
  };
  return (
    <div className="pa">
      <p className="muted small">Copie dans Notion les 519 résultats du document du palmarès (1990 → 2026/2027). Les résultats déjà présents sont ignorés : tu peux relancer sans risque. {deja ? `${deja} résultats sont déjà dans Notion.` : ""}</p>
      <button type="button" className="btn primary" disabled={enCours} onClick={lancer}>{enCours ? "Import en cours… garde la page ouverte" : "📥 Importer le palmarès historique"}</button>
      {msg ? <p className="notice ok">{msg}</p> : null}
    </div>
  );
}
