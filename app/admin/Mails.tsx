"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { construireMail, THEMES, type ContenuMail } from "@/lib/mail-modele";
import { envoyerMailClub, type Cible } from "./mails";

type J = { notion_id: string; email: string | null; prenom: string | null; nom: string; actif: boolean };
const CLE = "lions-mail-brouillon";
const SIGNATURE = "Sportivement,\nLe comité du SC Lions d'Eugies 🦁";
const sansAccent = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Writing a club e-mail (season's greetings, new season…): a theme, the text, a live preview, then send. */
export default function Mails({ joueurs, brevo }: { joueurs: J[]; brevo: boolean }) {
  const t0 = THEMES[0];
  const [theme, setTheme] = useState(t0.id);
  const [sujet, setSujet] = useState(t0.sujet);
  const [titre, setTitre] = useState(t0.titre);
  const [texte, setTexte] = useState(t0.texte);
  const [signature, setSignature] = useState(SIGNATURE);
  const [bouton, setBouton] = useState("");
  const [lien, setLien] = useState("");
  const [salutation, setSalutation] = useState(true);
  const [cible, setCible] = useState<Cible>("tous");
  const [choix, setChoix] = useState<string[]>([]);
  const [cherche, setCherche] = useState("");
  const [parMail, setParMail] = useState(brevo);
  const [parCourrier, setParCourrier] = useState(true);
  const [parNotif, setParNotif] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const pret = useRef(false);

  // The draft is kept in this browser: leaving the page loses nothing.
  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem(CLE) || "null");
      if (b) { setTheme(b.theme); setSujet(b.sujet); setTitre(b.titre); setTexte(b.texte); setSignature(b.signature); setBouton(b.bouton || ""); setLien(b.lien || ""); setSalutation(b.salutation !== false); }
    } catch { /* nothing saved */ }
    pret.current = true;
  }, []);
  useEffect(() => {
    if (!pret.current) return;
    try { localStorage.setItem(CLE, JSON.stringify({ theme, sujet, titre, texte, signature, bouton, lien, salutation })); } catch { /* storage unavailable */ }
  }, [theme, sujet, titre, texte, signature, bouton, lien, salutation]);

  const choisirTheme = (id: string) => {
    const t = THEMES.find((x) => x.id === id)!;
    setTheme(id);
    setSujet(t.sujet);
    setTitre(t.titre);
    if (t.texte || id !== "libre") setTexte(t.texte);
    setBouton(t.bouton || "");
    setLien(t.lien || "");
  };

  const contenu: ContenuMail = { theme, titre, texte, signature, bouton, lien, salutation };
  const apercu = useMemo(() => construireMail(contenu, "Mathéo"), [theme, titre, texte, signature, bouton, lien, salutation]); // eslint-disable-line react-hooks/exhaustive-deps

  const avecMail = joueurs.filter((j) => j.email);
  const vises = avecMail.filter((j) => (cible === "actifs" ? j.actif : cible === "non" ? !j.actif : cible === "choix" ? choix.includes(j.notion_id) : true));
  const nb = new Set(vises.map((j) => j.email!.toLowerCase())).size;
  const nom = (j: J) => [j.prenom, j.nom].filter(Boolean).join(" ");
  const liste = avecMail.filter((j) => !cherche || sansAccent(nom(j)).includes(sansAccent(cherche))).sort((a, b) => nom(a).localeCompare(nom(b), "fr"));

  const envoyer = (test: boolean) =>
    start(async () => {
      setInfo(null);
      const r = await envoyerMailClub({ sujet, contenu, cible, choix, parMail, parCourrier, parNotif, test });
      setInfo(r);
      setConfirmer(false);
    });

  return (
    <div className="ml">
      <div className="ml-themes" role="radiogroup" aria-label="Modèle">
        {THEMES.map((t) => (
          <button key={t.id} type="button" className={`ml-th${theme === t.id ? " on" : ""}`} style={{ "--a": t.de, "--b": t.a, "--c": t.accent } as React.CSSProperties} onClick={() => choisirTheme(t.id)} aria-pressed={theme === t.id}>
            <span aria-hidden="true">{t.ic}</span><b>{t.nom}</b>
          </button>
        ))}
      </div>

      <div className="ml-duo">
        <div className="ml-form">
          <label className="f">Objet du mail<input className="input" value={sujet} maxLength={150} onChange={(e) => setSujet(e.target.value)} /></label>
          <label className="f">Grand titre<input className="input" value={titre} maxLength={120} onChange={(e) => setTitre(e.target.value)} /></label>
          <label className="rp-tous ml-sal"><input type="checkbox" checked={salutation} onChange={(e) => setSalutation(e.target.checked)} /> Commencer par « Bonjour <i>prénom</i>, » (chaque membre reçoit son prénom)</label>
          <label className="f">Message <small className="muted">(une ligne vide = un nouveau paragraphe)</small>
            <textarea className="input ml-texte" rows={8} value={texte} maxLength={8000} onChange={(e) => setTexte(e.target.value)} />
          </label>
          <details className="ml-plus" open={Boolean(bouton)}>
            <summary>➕ Ajouter un bouton (lien)</summary>
            <div className="as-ligne">
              <label className="f">Texte du bouton<input className="input" value={bouton} maxLength={60} placeholder="Ex. Ouvrir l'application" onChange={(e) => setBouton(e.target.value)} /></label>
              <label className="f">Lien<input className="input" value={lien} maxLength={300} placeholder="https://…" onChange={(e) => setLien(e.target.value)} /></label>
            </div>
          </details>
          <label className="f">Signature<textarea className="input" rows={2} value={signature} maxLength={300} onChange={(e) => setSignature(e.target.value)} /></label>

          <fieldset className="ml-fs">
            <legend>Destinataires · <b>{nb} adresse{nb > 1 ? "s" : ""}</b></legend>
            <div className="rp-liste-choix" role="radiogroup" aria-label="Destinataires">
              {([["tous", "Tous les membres"], ["actifs", "Actifs"], ["non", "Non actifs"], ["choix", "Choisir…"]] as const).map(([v, l]) => (
                <button key={v} type="button" className={`rp-seg${cible === v ? " on" : ""}`} onClick={() => setCible(v)}>{l}</button>
              ))}
            </div>
            {cible === "choix" ? (
              <div className="ml-choix">
                <input className="input" type="search" value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder="🔎 Chercher…" aria-label="Chercher un membre" />
                <ul>
                  {liste.map((j) => (
                    <li key={j.notion_id}><label><input type="checkbox" checked={choix.includes(j.notion_id)} onChange={(e) => setChoix((c) => (e.target.checked ? [...c, j.notion_id] : c.filter((x) => x !== j.notion_id)))} /> {nom(j)}{!j.actif ? <small className="muted"> · non actif</small> : null}</label></li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="muted small">Une famille (même adresse) reçoit un seul mail : « Bonjour Mathéo et Lina ». Les membres sans adresse e-mail ne reçoivent rien.</p>
          </fieldset>

          <fieldset className="ml-fs">
            <legend>Envoyer par</legend>
            <label className="rp-tous"><input type="checkbox" checked={parMail} disabled={!brevo} onChange={(e) => setParMail(e.target.checked)} /> 📧 E-mail (dans leur boîte mail){!brevo ? <small className="muted"> · pas encore branché (Brevo)</small> : null}</label>
            <label className="rp-tous"><input type="checkbox" checked={parCourrier} onChange={(e) => setParCourrier(e.target.checked)} /> 📬 Courrier de l&apos;application</label>
            <label className="rp-tous"><input type="checkbox" checked={parNotif} onChange={(e) => setParNotif(e.target.checked)} /> 🔔 Notification sur le téléphone</label>
          </fieldset>

          <div className="ml-bas">
            <button type="button" className="btn" disabled={pending} onClick={() => envoyer(true)}>📨 M&apos;envoyer un test</button>
            <button type="button" className="btn primary" disabled={pending || !nb} onClick={() => { setInfo(null); setConfirmer(true); }}>🚀 Envoyer à {nb} adresse{nb > 1 ? "s" : ""}</button>
          </div>
          {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
        </div>

        <div className="ml-apercu">
          <p className="mini-t">Aperçu (tel que reçu)</p>
          <div className="ml-obj"><small>Objet</small><b>{sujet || "—"}</b></div>
          <iframe title="Aperçu du mail" srcDoc={apercu} className="ml-frame" sandbox="" />
        </div>
      </div>

      {confirmer ? (
        <div className="ig-fond" onClick={() => !pending && setConfirmer(false)}>
          <div className="ig-saisie" role="dialog" aria-label="Confirmer l'envoi" onClick={(e) => e.stopPropagation()}>
            <p className="ig-qui">Confirmer l&apos;envoi</p>
            <p style={{ margin: 0, textAlign: "center" }}>« <b>{sujet}</b> »<br />à <b>{nb} adresse{nb > 1 ? "s" : ""}</b> par {[parMail && "e-mail", parCourrier && "courrier de l'appli", parNotif && "notification"].filter(Boolean).join(", ")}.</p>
            <p className="muted small" style={{ textAlign: "center" }}>Un envoi ne peut pas être annulé. Astuce : fais d&apos;abord un test.</p>
            <span className="ig-btns">
              <button type="button" className="btn primary" disabled={pending} onClick={() => envoyer(false)}>{pending ? "Envoi…" : "🚀 Oui, envoyer"}</button>
              <button type="button" className="btn" disabled={pending} onClick={() => setConfirmer(false)}>Annuler</button>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
