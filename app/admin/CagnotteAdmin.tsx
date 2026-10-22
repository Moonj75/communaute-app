"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { DEPENSES, euro, montantTache, solde, UNITES, type Bareme, type EvenementLie, type Mouvement, type Unite } from "@/lib/cagnotte";
import ChoixEvenement from "@/components/cagnotte/ChoixEvenement";
import { ajouterDepense, attribuerGains, enregistrerBareme, validerMouvement } from "./cagnottes";
import Cagnottes from "./Cagnottes";

type J = { notion_id: string; prenom: string | null; nom: string; actif: boolean; cagnotte: number | null; groupe: string | null };
type Onglet = "soldes" | "valider" | "attribuer" | "depense" | "bareme";
const sansAccent = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const auj = () => new Date().toISOString().slice(0, 10);

/**
 * Kitties, for the staff: balances (and shared kitties), requests to validate, gains to give
 * (task of the scale × times / hours / yearly flat rate), expenses, and the scale itself.
 */
export default function CagnotteAdmin({ joueurs, mouvements, bareme, evenements = [] }: { joueurs: J[]; mouvements: Mouvement[] | null; bareme: Bareme[] | null; evenements?: EvenementLie[] }) {
  const [evG, setEvG] = useState<EvenementLie | null>(null);
  const [evD, setEvD] = useState<EvenementLie | null>(null);
  const router = useRouter();
  const installe = mouvements != null && bareme != null;
  const attente = (mouvements || []).filter((m) => m.statut === "en_attente");
  const [onglet, setOnglet] = useState<Onglet>(attente.length ? "valider" : "soldes");
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const nom = (j?: J | null) => (j ? [j.prenom, j.nom].filter(Boolean).join(" ") : "?");
  const parId = useMemo(() => new Map(joueurs.map((j) => [j.notion_id, j])), [joueurs]);
  const run = (f: () => Promise<{ ok: boolean; message: string }>, apres?: () => void) =>
    start(async () => {
      setInfo(null);
      const r = await f();
      setInfo(r);
      if (r.ok) { apres?.(); router.refresh(); }
    });
  /** Balance of a member's kitty (shared kitty: all its members). */
  const soldeDe = (id: string) => {
    const j = parId.get(id);
    const ids = j?.groupe ? joueurs.filter((x) => x.groupe === j.groupe).map((x) => x.notion_id) : [id];
    return solde((mouvements || []).filter((m) => ids.includes(m.joueur_id)));
  };

  /* ---- To validate ---- */
  const [forcer, setForcer] = useState<Record<string, boolean>>({});
  const [motif, setMotif] = useState<Record<string, string>>({});
  const [conf, setConf] = useState<{ titre: string; texte: string; go: () => void } | null>(null);

  /* ---- Gains ---- */
  const actifs = (bareme || []).filter((b) => b.actif);
  const [tache, setTache] = useState<string>("");
  const [qte, setQte] = useState("1");
  const [tauxLibre, setTauxLibre] = useState("");
  const [libG, setLibG] = useState("");
  const [dateG, setDateG] = useState(auj());
  const [choix, setChoix] = useState<string[]>([]);
  const [cherche, setCherche] = useState("");
  const [tous, setTous] = useState(false);
  useEffect(() => { if (!tache && actifs[0]) setTache(actifs[0].id); }, [actifs, tache]);
  const b = actifs.find((x) => x.id === tache) || null;
  const q = Number(String(qte).replace(",", ".")) || 0;
  const montantG = b ? montantTache(Number(b.taux), q) : Math.round((Number(String(tauxLibre).replace(",", ".")) || 0) * q * 100) / 100;
  const liste = joueurs.filter((j) => (tous || j.actif) && (!cherche || sansAccent(nom(j)).includes(sansAccent(cherche)))).sort((a, x) => nom(a).localeCompare(nom(x), "fr"));

  /* ---- Expense ---- */
  const [qui, setQui] = useState("");
  const [cat, setCat] = useState<string>(DEPENSES[0].id);
  const [mtD, setMtD] = useState("");
  const [libD, setLibD] = useState("");
  const [dateD, setDateD] = useState(auj());
  const [forcerD, setForcerD] = useState(false);

  /* ---- Scale ---- */
  const [lignes, setLignes] = useState(() => (bareme || []).map((x) => ({ id: x.id, nom: x.nom, ic: x.ic, unite: x.unite, taux: String(x.taux).replace(".", ","), actif: x.actif })));
  useEffect(() => { setLignes((bareme || []).map((x) => ({ id: x.id, nom: x.nom, ic: x.ic, unite: x.unite, taux: Number(x.taux).toFixed(2).replace(".", ","), actif: x.actif }))); }, [bareme]);

  const onglets: [Onglet, string, number | null][] = [["soldes", "📊 Soldes", null], ["valider", "✅ À valider", attente.length || null], ["attribuer", "💰 Attribuer", null], ["depense", "💸 Dépense", null], ["bareme", "📋 Barème", null]];

  return (
    <div className="ca">
      {!installe ? <p className="notice err">L&apos;historique des cagnottes n&apos;est pas encore installé : lance le script Supabase « etape17-cagnotte-historique ». En attendant, les soldes restent modifiables à la main.</p> : null}
      {installe ? (
        <nav className="ca-tabs" role="tablist" aria-label="Cagnottes">
          {onglets.map(([id, t, n]) => (
            <button key={id} type="button" role="tab" aria-selected={onglet === id} className={`ca-tab${onglet === id ? " on" : ""}`} onClick={() => { setInfo(null); setOnglet(id); }}>{t}{n ? <span className="ca-badge num">{n}</span> : null}</button>
          ))}
        </nav>
      ) : null}
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}

      {onglet === "soldes" || !installe ? <Cagnottes joueurs={joueurs} mouvements={mouvements} bareme={bareme || []} /> : null}

      {installe && onglet === "valider" ? (
        <div className="ca-sec">
          <p className="muted small">Demandes des joueurs pour utiliser leur cagnotte. Rien n&apos;est déduit avant ta validation. Une confirmation est demandée.</p>
          {!attente.length ? <div className="av-vide"><span aria-hidden="true">✅</span><b>Aucune demande en attente</b></div> : null}
          <ul className="av-l">
            {attente.map((m) => {
              const j = parId.get(m.joueur_id);
              const s = soldeDe(m.joueur_id);
              const apres = s - Number(m.montant);
              return (
                <li key={m.id} className="av-c ca-dem">
                  <p className="av-ou">{new Date(`${m.date}T12:00:00Z`).toLocaleDateString("fr-BE", { day: "numeric", month: "long", timeZone: "UTC" })} · {m.categorie}{j?.groupe ? ` · 👨‍👩‍👧 ${j.groupe}` : ""}</p>
                  <p className="av-duel"><b>{nom(j)}</b><i>demande</i><b className="num">{euro.format(Number(m.montant))}</b></p>
                  <p className="ca-lib">« {m.libelle} »</p>
                  <p className={`ca-solde${apres < 0 ? " neg" : ""}`}>Solde actuel {euro.format(s)} → après : <b className="num">{euro.format(apres)}</b></p>
                  {apres < 0 ? <label className="rp-tous"><input type="checkbox" checked={Boolean(forcer[m.id])} onChange={(e) => setForcer((f) => ({ ...f, [m.id]: e.target.checked }))} /> Autoriser un solde négatif</label> : null}
                  <input className="input" value={motif[m.id] || ""} maxLength={200} placeholder="Motif (si refus, facultatif)" onChange={(e) => setMotif((x) => ({ ...x, [m.id]: e.target.value }))} aria-label="Motif" />
                  <span className="ig-btns">
                    <button type="button" className="btn primary" disabled={pending || (apres < 0 && !forcer[m.id])} onClick={() => setConf({ titre: "Valider la demande", texte: `${nom(j)} · ${m.libelle} : −${euro.format(Number(m.montant))}`, go: () => run(() => validerMouvement(m.id, true, "", Boolean(forcer[m.id])), () => setConf(null)) })}>✓ Valider</button>
                    <button type="button" className="btn" disabled={pending} onClick={() => setConf({ titre: "Refuser la demande", texte: `${nom(j)} · ${m.libelle} (${euro.format(Number(m.montant))})`, go: () => run(() => validerMouvement(m.id, false, motif[m.id] || ""), () => setConf(null)) })}>Refuser</button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {installe && onglet === "attribuer" ? (
        <div className="ca-sec">
          <p className="mini-t">1. La tâche</p>
          <div className="ca-taches">
            {actifs.map((x) => (
              <button key={x.id} type="button" className={`ca-t${tache === x.id ? " on" : ""}`} onClick={() => { setTache(x.id); setQte("1"); }}>
                <span aria-hidden="true">{x.ic}</span><b>{x.nom}</b><small className="num">{euro.format(Number(x.taux))} {UNITES[x.unite].court}</small>
              </button>
            ))}
            <button type="button" className={`ca-t${tache === "" ? " on" : ""}`} onClick={() => setTache("")}><span aria-hidden="true">✍️</span><b>Autre</b><small>montant libre</small></button>
          </div>
          <p className="mini-t">2. Combien</p>
          <div className="as-ligne">
            <label className="f as-court">{b?.unite === "heure" ? "Nombre d'heures" : b?.unite === "forfait" ? "Nombre de forfaits" : "Nombre de fois"}<input className="input num" inputMode="decimal" value={qte} onChange={(e) => setQte(e.target.value.replace(/[^\d,.]/g, "").slice(0, 6))} /></label>
            {!b ? <label className="f as-court">Montant unitaire (€)<input className="input num" inputMode="decimal" value={tauxLibre} placeholder="0,00" onChange={(e) => setTauxLibre(e.target.value.replace(/[^\d,.]/g, "").slice(0, 8))} /></label> : null}
            <label className="f as-court">Date<input className="input" type="date" value={dateG} onChange={(e) => setDateG(e.target.value)} /></label>
            <ChoixEvenement evenements={evenements} valeur={evG?.id || ""} onChange={setEvG} />
            <label className="f">Libellé (facultatif)<input className="input" value={libG} maxLength={120} placeholder={evG ? `${b?.nom || "Aide"} · ${evG.nom}` : b ? `${b.nom}${b.unite === "forfait" ? " 2026–2027" : ""}` : "Ex. Aide au bar"} onChange={(e) => setLibG(e.target.value)} /></label>
          </div>
          <p className="ca-calc">{b ? <>{b.unite === "heure" ? `${qte || 0} h` : `${qte || 0}`} × {euro.format(Number(b.taux))} {b.unite === "forfait" ? "(forfait annuel)" : ""} = </> : null}<b className="num">{euro.format(montantG)}</b> par membre</p>
          <p className="mini-t">3. Pour qui · <b>{choix.length}</b> choisi{choix.length > 1 ? "s" : ""}</p>
          <div className="cg-tete">
            <div className="rp-liste-choix" role="radiogroup" aria-label="Membres">
              <button type="button" className={`rp-seg${!tous ? " on" : ""}`} onClick={() => setTous(false)}>Actifs</button>
              <button type="button" className={`rp-seg${tous ? " on" : ""}`} onClick={() => setTous(true)}>Tous</button>
            </div>
            <input className="input cg-cherche" type="search" value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder="🔎 Chercher…" aria-label="Chercher un membre" />
            {choix.length ? <button type="button" className="btn" onClick={() => setChoix([])}>Tout décocher</button> : null}
          </div>
          <ul className="ca-qui">
            {liste.map((j) => (
              <li key={j.notion_id}><label className={choix.includes(j.notion_id) ? "on" : undefined}><input type="checkbox" checked={choix.includes(j.notion_id)} onChange={(e) => setChoix((c) => (e.target.checked ? [...c, j.notion_id] : c.filter((x) => x !== j.notion_id)))} /> {nom(j)}</label></li>
            ))}
          </ul>
          <button type="button" className="btn primary" disabled={pending || !choix.length || montantG <= 0} onClick={() => setConf({ titre: "Attribuer", texte: `${euro.format(montantG)} à ${choix.length} membre${choix.length > 1 ? "s" : ""} · ${libG || b?.nom || "Autre gain"}`, go: () => run(() => attribuerGains({ baremeId: b?.id || null, libelle: libG || (evG ? `${b?.nom || "Aide"} · ${evG.nom}` : ""), quantite: qte, taux: tauxLibre, ids: choix, date: dateG, evenement: evG ? { id: evG.id, nom: evG.nom } : null }), () => { setConf(null); setChoix([]); setLibG(""); }) })}>
            💰 Attribuer {euro.format(montantG)} à {choix.length} membre{choix.length > 1 ? "s" : ""}
          </button>
        </div>
      ) : null}

      {installe && onglet === "depense" ? (
        <div className="ca-sec">
          <p className="muted small">Une dépense payée avec la cagnotte d&apos;un membre (inscription, hébergement…), enregistrée par le staff : elle est validée tout de suite.</p>
          <label className="f">Membre
            <select className="input" value={qui} onChange={(e) => setQui(e.target.value)}>
              <option value="">Choisir…</option>
              {joueurs.slice().sort((a, x) => nom(a).localeCompare(nom(x), "fr")).map((j) => <option key={j.notion_id} value={j.notion_id}>{nom(j)} · {euro.format(soldeDe(j.notion_id))}{j.groupe ? ` (${j.groupe})` : ""}</option>)}
            </select>
          </label>
          <div className="hc-types">
            {DEPENSES.map((d) => <button key={d.id} type="button" className={`hc-type${cat === d.id ? " on" : ""}`} onClick={() => setCat(d.id)}><span aria-hidden="true">{d.ic}</span>{d.id}</button>)}
          </div>
          <div className="as-ligne">
            <ChoixEvenement evenements={evenements} valeur={evD?.id || ""} onChange={(e) => { setEvD(e); if (e && !libD) setLibD(e.nom); }} />
            <label className="f">Pour quoi ?<input className="input" value={libD} maxLength={120} placeholder="Ex. Open de Paris" onChange={(e) => setLibD(e.target.value)} /></label>
            <label className="f as-court">Montant<input className="input num" inputMode="decimal" value={mtD} placeholder="0,00" onChange={(e) => setMtD(e.target.value.replace(/[^\d,.]/g, "").slice(0, 8))} /></label>
            <label className="f as-court">Date<input className="input" type="date" value={dateD} onChange={(e) => setDateD(e.target.value)} /></label>
          </div>
          {qui ? <p className="ca-solde">Solde actuel : <b className="num">{euro.format(soldeDe(qui))}</b></p> : null}
          <label className="rp-tous"><input type="checkbox" checked={forcerD} onChange={(e) => setForcerD(e.target.checked)} /> Autoriser un solde négatif</label>
          <button type="button" className="btn primary" disabled={pending || !qui || !mtD} onClick={() => setConf({ titre: "Enregistrer la dépense", texte: `${nom(parId.get(qui))} · ${libD || cat} : −${mtD} €`, go: () => run(() => ajouterDepense({ joueurId: qui, categorie: cat, montant: mtD, libelle: libD, date: dateD, forcer: forcerD, evenement: evD ? { id: evD.id, nom: evD.nom } : null }), () => { setConf(null); setMtD(""); setLibD(""); }) })}>💸 Enregistrer la dépense</button>
        </div>
      ) : null}

      {installe && onglet === "bareme" ? (
        <div className="ca-sec">
          <p className="muted small">Chaque tâche avec son tarif : <b>par fois</b> (ouvreur, fermeur…), <b>par heure</b> (organisation de tournoi, brocante…) ou <b>forfait annuel</b> (responsable championnat, responsable déplacements…). Une tâche décochée n&apos;est plus proposée, mais l&apos;historique la garde.</p>
          <ul className="ca-bar">
            {lignes.map((l, i) => (
              <li key={l.id || `n${i}`} className={l.actif ? undefined : "off"}>
                <input className="input ca-ic" value={l.ic} maxLength={4} aria-label="Icône" onChange={(e) => setLignes((x) => x.map((y, k) => (k === i ? { ...y, ic: e.target.value } : y)))} />
                <input className="input" value={l.nom} maxLength={80} aria-label="Tâche" onChange={(e) => setLignes((x) => x.map((y, k) => (k === i ? { ...y, nom: e.target.value } : y)))} />
                <select className="input" value={l.unite} aria-label="Unité" onChange={(e) => setLignes((x) => x.map((y, k) => (k === i ? { ...y, unite: e.target.value as Unite } : y)))}>
                  <option value="fois">par fois</option>
                  <option value="heure">par heure</option>
                  <option value="forfait">forfait annuel</option>
                </select>
                <span className="cg-saisie"><input className="input num" inputMode="decimal" value={l.taux} aria-label="Tarif" onChange={(e) => setLignes((x) => x.map((y, k) => (k === i ? { ...y, taux: e.target.value.replace(/[^\d,.]/g, "").slice(0, 8) } : y)))} /><i aria-hidden="true">€</i></span>
                <label className="rp-tous"><input type="checkbox" checked={l.actif} onChange={(e) => setLignes((x) => x.map((y, k) => (k === i ? { ...y, actif: e.target.checked } : y)))} /> active</label>
              </li>
            ))}
          </ul>
          <span className="ig-btns" style={{ justifyContent: "flex-start" }}>
            <button type="button" className="btn" onClick={() => setLignes((x) => [...x, { id: "", nom: "", ic: "⭐", unite: "heure", taux: "0,00", actif: true }])}>➕ Ajouter une tâche</button>
            <button type="button" className="btn primary" disabled={pending} onClick={() => run(() => enregistrerBareme(lignes.map((l) => ({ ...l, id: l.id || undefined }))))}>💾 Enregistrer le barème</button>
          </span>
        </div>
      ) : null}

      {conf ? (
        <div className="ig-fond" onClick={() => !pending && setConf(null)}>
          <div className="ig-saisie" role="dialog" aria-label={conf.titre} onClick={(e) => e.stopPropagation()}>
            <p className="ig-qui">{conf.titre}</p>
            <p style={{ margin: 0, textAlign: "center", fontWeight: 700 }}>{conf.texte}</p>
            <span className="ig-btns">
              <button type="button" className="btn primary" disabled={pending} onClick={conf.go}>{pending ? "…" : "✓ Confirmer"}</button>
              <button type="button" className="btn" disabled={pending} onClick={() => setConf(null)}>Annuler</button>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
