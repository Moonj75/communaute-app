"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES_P, JEUNES, classeRang, libSaison, cleSaison, compter, icRang, libelleRang, motRang, placeDe, triMedailles, triVitrine, type ResultatP } from "@/lib/palmares-types";
import { Trophee } from "./Trophee";
import { ajouterResultat, importerHistorique, rafraichirPalmares, supprimerResultat, traiterProposition, type RetourP } from "@/lib/palmares-actions";
import "./palmares.css";
import Roue, { type Cran } from "./Roue";
import Drapeau from "./Drapeau";
import { emblemeResultat, paysResultat } from "@/lib/drapeaux";
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
      <span className="pa-s">{libSaison(r.saison)}</span>
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
      <span className="pk-co"><Drapeau code={paysResultat(r)} />{r.competition}</span>
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
            <p className="pk-sz">{libSaison(s)} <small>{m.or ? `🏆 ${m.or} ` : ""}{m.argent ? `🥈 ${m.argent} ` : ""}{m.bronze ? `🥉 ${m.bronze} ` : ""}· {l.length} résultat{l.length > 1 ? "s" : ""}</small></p>
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

const versCran = (r: ResultatP, noms: Noms): Cran => ({ id: r.id, place: placeDe(r), equipe: estEquipe(r), qui: quiDe(r, noms), competition: r.competition, categorie: r.categorie, saison: r.saison, date: r.date, scoreFinale: r.scoreFinale, adversaire: r.adversaire, pays: paysResultat(r), embleme: emblemeResultat(r) });
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
      {saisons.map((s) => <option key={s} value={s}>{libSaison(s)}</option>)}
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

/** A club competition of the calendar, proposed in the form (past ones only: a result comes after the event). */
export type CompetCal = { id: string; nom: string; date: string; fin: string | null; lieu: string | null; pays?: string | null };
const RANGS_SAISIE: { id: string; court: string; place: number }[] = [
  { id: "Huitième de finaliste", court: "8e de finale", place: 9 },
  { id: "Quart de finaliste", court: "¼ de finale", place: 5 },
  { id: "Demi-finaliste", court: "½ finale", place: 3 },
  { id: "Finaliste", court: "Finaliste", place: 2 },
  { id: "Vainqueur", court: "Vainqueur", place: 1 },
];
const jourLong = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const jourCourt = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
/** The days of an event (2 for a week-end tournament). */
const joursDe = (c: CompetCal) => {
  if (!c.fin || c.fin <= c.date) return [c.date];
  const out: string[] = [];
  for (let d = new Date(c.date + "T12:00:00Z"); out.length < 4; d.setUTCDate(d.getUTCDate() + 1)) { const x = d.toISOString().slice(0, 10); if (x > c.fin) break; out.push(x); }
  return out;
};

/**
 * Form to add a result (validated at once for the people in charge, proposed for the others):
 * the competition is chosen among the club's events, then individual or team, the day (2-day tournaments),
 * who, the category and the result (8e → winner).
 */
export function AjoutResultat({ joueurs, competitions, responsable, moi, initial }: { joueurs: { id: string; nom: string; archive?: boolean }[]; competitions: CompetCal[]; responsable: boolean; moi: string[]; /** Prefilled from the post-competition notification. */ initial?: { competition: string; date: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [info, setInfo] = useState<RetourP | null>(null);
  const depart = initial?.competition ? competitions.find((c) => c.nom === initial.competition && (!initial.date || initial.date === c.date)) || competitions.find((c) => c.nom === initial.competition) : undefined;
  const [ev, setEv] = useState<string>(depart?.id || "");
  const [mode, setMode] = useState<"" | "ind" | "eq">("");
  const [jour, setJour] = useState("");
  const [choisis, setChoisis] = useState<string[]>([]);
  const [equipe, setEquipe] = useState("");
  const [rang, setRang] = useState("");
  // « Autre place »: any final place typed in (e.g. 18th).
  const [placeLibre, setPlaceLibre] = useState("");
  const [cat, setCat] = useState("");
  const [cherche, setCherche] = useState("");
  const [toutes, setToutes] = useState(false);
  const [q, setQ] = useState("");
  const c = competitions.find((x) => x.id === ev);
  const jours = c ? joursDe(c) : [];
  const listeEv = competitions.filter((x) => !q || x.nom.toLowerCase().includes(q.toLowerCase()));
  const vus = toutes || q ? listeEv : listeEv.slice(0, 6);
  // A player (not responsable) adds his own result: individual = himself (or one of his family fiches);
  // team = he is in it, with his teammates if he wants.
  const miens = joueurs.filter((j) => moi.includes(j.id));
  const proposes = (!responsable && mode === "ind" ? miens : joueurs).filter((j) => !choisis.includes(j.id) && (!cherche || j.nom.toLowerCase().includes(cherche.toLowerCase()) || (!responsable && mode === "ind"))).slice(0, cherche || (!responsable && mode === "ind") ? 8 : 0);
  const choisirEv = (id: string) => { setEv(id); const x = competitions.find((y) => y.id === id); setJour(x && joursDe(x).length === 1 ? x.date : ""); };
  const choisirMode = (m: "ind" | "eq") => {
    setMode(m);
    if (m === "ind") { setEquipe(""); setChoisis((x) => (!responsable ? moi.slice(0, 1) : x.slice(0, 1).length ? x.slice(0, 1) : moi.slice(0, 1))); if (jour === "tout") setJour(""); }
    else if (!responsable) setChoisis((x) => (x.some((y) => moi.includes(y)) ? x : [...moi.slice(0, 1), ...x]));
  };
  const ajouterJ = (id: string) => { setChoisis((x) => (mode === "ind" ? [id] : [...x, id])); setCherche(""); };
  const sansMoi = !responsable && moi.length > 0 && !choisis.some((y) => moi.includes(y));
  const manque = !c ? "Choisis la compétition" : sansMoi && mode ? "Ton propre résultat : ajoute-toi" : !mode ? "Individuel ou par équipe ?" : jours.length > 1 && !jour ? "Choisis le jour" : mode === "ind" && choisis.length !== 1 ? "Choisis le joueur" : mode === "eq" && !equipe ? "Choisis l'équipe (Team A / Team B)" : !rang ? "Choisis le résultat" : rang === "Autre place" && !(Number(placeLibre) >= 1) ? "Indique la place (ex. 18)" : null;
  const envoyer = (fd: FormData) => start(async () => {
    choisis.forEach((x) => fd.append("joueurs", x));
    const r = await ajouterResultat(fd);
    setInfo(r);
    if (r.ok) { setRang(""); setChoisis(mode === "ind" ? [] : choisis); router.refresh(); }
  });
  return (
    <form action={envoyer} className="pa-form af">
      {!responsable ? <p className="notice">📨 Ajoute <b>ton propre résultat</b> : il sera vérifié par le responsable palmarès, puis il apparaîtra dans ton palmarès et celui du club.</p> : null}
      <input type="hidden" name="ev" value={ev} />
      <input type="hidden" name="jour" value={jour === "tout" ? (c?.date || "") : jour} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="equipe" value={equipe} />
      <input type="hidden" name="categorie" value={cat} />
      <input type="hidden" name="rang" value={rang} />

      <div className="af-etape"><span className="af-n">1</span><b>La compétition</b> <small className="muted">(dans nos évènements)</small></div>
      {competitions.length > 6 ? <input className="input" type="search" placeholder="🔎 Chercher une compétition…" value={q} onChange={(e) => setQ(e.target.value)} /> : null}
      <div className="af-evs">
        {vus.map((x) => (
          <button type="button" key={x.id} className={`af-ev${ev === x.id ? " on" : ""}`} onClick={() => choisirEv(x.id)}>
            <b><Drapeau code={x.pays ?? null} />{x.nom}</b>
            <small>📅 {jourCourt(x.date)}{x.fin && x.fin > x.date ? " · 2 jours" : ""}{x.lieu ? ` · ${x.lieu}` : ""}</small>
          </button>
        ))}
        {!vus.length ? <p className="vide">Aucune compétition passée dans le calendrier. Ajoute d&apos;abord l&apos;évènement (Staff → Évènements).</p> : null}
      </div>
      {!toutes && !q && listeEv.length > 6 ? <button type="button" className="btn en-mini" onClick={() => setToutes(true)}>Voir les {listeEv.length - 6} autres compétitions</button> : null}

      {c ? (
        <>
          <div className="af-etape"><span className="af-n">2</span><b>Individuel ou par équipe ?</b></div>
          <div className="af-2">
            <button type="button" className={`af-gros${mode === "ind" ? " on" : ""}`} onClick={() => choisirMode("ind")}>👤<b>Individuel</b></button>
            <button type="button" className={`af-gros eq${mode === "eq" ? " on" : ""}`} onClick={() => choisirMode("eq")}>👥<b>Par équipe</b></button>
          </div>
        </>
      ) : null}

      {c && mode && jours.length > 1 ? (
        <>
          <div className="af-etape"><span className="af-n">3</span><b>Quel jour ?</b> <small className="muted">{mode === "ind" ? "(un tournoi individuel se joue sur un jour)" : ""}</small></div>
          <div className="pa-chips">
            {jours.map((d) => <button type="button" key={d} className={`pa-chip af-jour${jour === d ? " on" : ""}`} onClick={() => setJour(d)}>{jourLong(d)}</button>)}
            {mode === "eq" ? <button type="button" className={`pa-chip af-jour${jour === "tout" ? " on" : ""}`} onClick={() => setJour("tout")}>Les {jours.length} jours</button> : null}
          </div>
        </>
      ) : null}

      {c && mode ? (
        <>
          <div className="af-etape"><span className="af-n">{jours.length > 1 ? 4 : 3}</span><b>{mode === "ind" ? "Le joueur" : "L'équipe"}</b></div>
          {mode === "eq" ? (
            <div className="af-2">
              {["Team A", "Team B"].map((t) => <button type="button" key={t} className={`af-gros eq${equipe === t ? " on" : ""}`} onClick={() => setEquipe(t)}><span className="af-team">TEAM<small>{t.slice(5)}</small></span></button>)}
            </div>
          ) : null}
          <div className="pa-chips">
            {choisis.map((id) => <button type="button" key={id} className="pa-chip on" onClick={() => setChoisis((x) => x.filter((y) => y !== id))}>{joueurs.find((j) => j.id === id)?.nom || "?"} ✕</button>)}
          </div>
          {(mode === "eq" || !choisis.length) && (responsable || mode === "eq") ? <input className="input" placeholder={mode === "eq" ? "🔎 Ajouter les joueurs de l'équipe (facultatif)…" : "🔎 Chercher le joueur…"} value={cherche} onChange={(e) => setCherche(e.target.value)} /> : null}
          {proposes.length ? <div className="pa-chips">{proposes.map((j) => <button type="button" key={j.id} className="pa-chip" onClick={() => ajouterJ(j.id)}>+ {j.nom}{j.archive ? " (ancien)" : ""}</button>)}</div> : null}

          <div className="af-etape"><span className="af-n">{jours.length > 1 ? 5 : 4}</span><b>La catégorie</b></div>
          <div className="pa-chips">{CATEGORIES_P.slice(0, 10).map((x) => <button type="button" key={x} className={`pa-chip${cat === x ? " on" : ""}`} onClick={() => setCat((y) => (y === x ? "" : x))}>{x}</button>)}</div>

          <div className="af-etape"><span className="af-n">{jours.length > 1 ? 6 : 5}</span><b>Le résultat</b></div>
          <div className="af-rangs">
            {RANGS_SAISIE.map((r) => (
              <button type="button" key={r.id} className={`af-rang ${classeRang(r.place)}${rang === r.id ? " on" : ""}`} onClick={() => setRang(r.id)}>
                <Trophee place={r.place} equipe={mode === "eq"} taille={r.place === 1 ? 46 : 38} /><b>{r.court}</b>
              </button>
            ))}
            <button type="button" className={`af-rang rx${rang === "Autre place" ? " on" : ""}`} onClick={() => setRang("Autre place")}>
              <Trophee place={Number(placeLibre) || null} equipe={mode === "eq"} taille={38} /><b>Autre place</b>
            </button>
          </div>
          {rang === "Autre place" ? (
            <label className="af-place">
              <span>Place obtenue</span>
              <input className="input num" name="place" inputMode="numeric" maxLength={3} placeholder="18" value={placeLibre} autoFocus onChange={(e) => setPlaceLibre(e.target.value.replace(/\D/g, "").slice(0, 3))} />
              <b>{placeLibre ? (placeLibre === "1" ? "er" : "e") : "e"}</b>
            </label>
          ) : null}
          {rang === "Vainqueur" || rang === "Finaliste" ? (
            <div className="af-finale">
              <p className="af-finale-t">⚔️ Le match de la finale <small className="muted">(facultatif)</small></p>
              <div className="af-score">
                <span><small>{mode === "eq" ? equipe || "Nous" : joueurs.find((j) => j.id === choisis[0])?.nom.split(" ")[0] || "Nous"}</small><input className="input num" name="fNous" inputMode="numeric" maxLength={2} placeholder="–" /></span>
                <b>–</b>
                <span><small>Adversaire</small><input className="input num" name="fEux" inputMode="numeric" maxLength={2} placeholder="–" /></span>
              </div>
              <input className="input" name="fAdv" maxLength={80} placeholder={mode === "eq" ? "Contre quelle équipe ? (ex. Rome)" : "Contre qui ? (ex. Jean Dupont)"} />
            </div>
          ) : null}
          <label className="f">Lien vers les résultats <small className="muted">(facultatif)</small><input className="input" name="lien" type="url" placeholder="https://…" /></label>
        </>
      ) : null}

      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      <button className="btn primary" type="submit" disabled={pending || Boolean(manque)} style={{ minHeight: 52 }}>{pending ? "Enregistrement…" : manque ? manque : responsable ? "✅ Enregistrer dans le palmarès" : "📨 Proposer ce résultat"}</button>
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
