"use client";

import { useState, useTransition } from "react";
import { categorieFinale } from "@/lib/categories";
import { enregistrerCoordonnees, type Coordonnees as C } from "./actions";

export type PersonneProfil = {
  notion_id: string;
  prenom: string | null;
  nom: string;
  categorie: string | null;
  telephone: string | null;
  date_naissance?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  nationalite?: string | null;
  licence?: string | null;
  code_fistf?: string | null;
};

const dateFr = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
function age(d: string) {
  const n = new Date(d + "T12:00:00");
  const t = new Date();
  return t.getFullYear() - n.getFullYear() - (t.getMonth() < n.getMonth() || (t.getMonth() === n.getMonth() && t.getDate() < n.getDate()) ? 1 : 0);
}

/** Contact details of one person: shown, and editable with « Modifier ». */
export default function Coordonnees({ p, email, nouvelEmail = null }: { p: PersonneProfil; email: string; /** Change waiting for a validation. */ nouvelEmail?: string | null }) {
  const init: C = { telephone: p.telephone || "", naissance: p.date_naissance || "", adresse: p.adresse || "", codePostal: p.code_postal || "", ville: p.ville || "", nationalite: p.nationalite || "" };
  const [v, setV] = useState<C>(init);
  const [vu, setVu] = useState<C>(init);
  const [edit, setEdit] = useState(false);
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const cat = categorieFinale(p.categorie, vu.naissance || null) || "Open";
  const catApres = categorieFinale(p.categorie, v.naissance || null) || "Open";
  const champ = (k: keyof C, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="f">{label}<input className="input" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} {...props} /></label>
  );
  const enregistrer = () =>
    start(async () => {
      const r = await enregistrerCoordonnees(p.notion_id, v);
      setInfo(r);
      if (r.ok) { setVu(v); setEdit(false); }
    });
  const lieu = [vu.adresse, [vu.codePostal, vu.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <section className="panel pf">
      <div className="hd">
        <h2>🪪 {[p.prenom, p.nom].filter(Boolean).join(" ")}</h2>
        {!edit ? <button type="button" className="btn" onClick={() => { setInfo(null); setV(vu); setEdit(true); }}>✏️ Modifier</button> : null}
      </div>
      <div className="bd">
        {!edit ? (
          <dl className="pf-l">
            <div><dt>📧 E-mail</dt><dd>{email}{nouvelEmail ? <small> · ⏳ vers {nouvelEmail} (en attente)</small> : <small> · à changer dans « Adresse e-mail »</small>}</dd></div>
            <div><dt>📞 Téléphone</dt><dd>{vu.telephone ? <a href={`tel:${vu.telephone.replace(/\s/g, "")}`}>{vu.telephone}</a> : <i>à compléter</i>}</dd></div>
            <div><dt>🎂 Date de naissance</dt><dd>{vu.naissance ? `${dateFr(vu.naissance)} (${age(vu.naissance)} ans)` : <i>à compléter</i>}</dd></div>
            <div><dt>🏷️ Catégorie</dt><dd><b className="pf-cat">{cat}</b>{!vu.naissance && p.categorie !== "Femme" ? <small> · ajoute ta date de naissance pour la calculer</small> : null}</dd></div>
            <div><dt>🏠 Adresse</dt><dd>{lieu || <i>à compléter</i>}</dd></div>
            <div><dt>🌍 Nationalité</dt><dd>{vu.nationalite || <i>à compléter</i>}</dd></div>
            {p.licence ? <div><dt>🎫 Licence nationale</dt><dd>{p.licence}</dd></div> : null}
            {p.code_fistf ? <div><dt>🌐 Code FISTF</dt><dd>{p.code_fistf}</dd></div> : null}
          </dl>
        ) : (
          <div className="pf-form">
            <div className="pf-2">
              {champ("telephone", "Téléphone", { inputMode: "tel", placeholder: "+32 470 12 34 56", maxLength: 30 })}
              {champ("naissance", "Date de naissance", { type: "date", max: new Date().toISOString().slice(0, 10) })}
            </div>
            {v.naissance ? <p className="small muted">Catégorie cette saison : <b>{catApres}</b></p> : null}
            {champ("adresse", "Adresse (rue et numéro)", { maxLength: 200, autoComplete: "street-address" })}
            <div className="pf-2">
              {champ("codePostal", "Code postal", { maxLength: 12, inputMode: "numeric", autoComplete: "postal-code" })}
              {champ("ville", "Ville", { maxLength: 80 })}
            </div>
            {champ("nationalite", "Nationalité", { maxLength: 60, placeholder: "Belge" })}
            <p className="small muted">L&apos;e-mail sert à te connecter : pour le changer, utilise le bloc « Adresse e-mail » (validé par un administrateur).</p>
            <div className="pf-bas">
              <button type="button" className="btn primary" disabled={pending} onClick={enregistrer}>{pending ? "Enregistrement…" : "✓ Enregistrer"}</button>
              <button type="button" className="btn ghost" disabled={pending} onClick={() => { setV(vu); setEdit(false); setInfo(null); }}>Annuler</button>
            </div>
          </div>
        )}
        {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      </div>
    </section>
  );
}
