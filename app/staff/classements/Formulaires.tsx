"use client";

import { useActionState, useState } from "react";
import { envoyerFichier, importerMaintenant, type RetourImport } from "./actions";

export function FormAuto() {
  const [etat, action, pending] = useActionState<RetourImport | null, FormData>(importerMaintenant, null);
  return (
    <form action={action} className="imp-auto">
      <div className="imp-btns">
        <button className="btn primary" type="submit" name="forcer" value="0" disabled={pending}>
          {pending ? "Téléchargement…" : "🔄 Vérifier maintenant"}
        </button>
        <button className="btn" type="submit" name="forcer" value="1" disabled={pending}>
          Tout réimporter
        </button>
      </div>
      {pending ? <p className="muted small">Lecture des sites FBFTS et FISTF, puis mise à jour de Notion… (jusqu&apos;à une minute)</p> : null}
      {etat ? <p className={`notice ${etat.ok ? "ok" : "err"}`}>{etat.message}</p> : null}
    </form>
  );
}

export function FormFichier({ moisDefaut }: { moisDefaut: string }) {
  const [etat, action, pending] = useActionState<RetourImport | null, FormData>(envoyerFichier, null);
  const [source, setSource] = useState("fbfts");
  return (
    <form action={action} className="envoi">
      <label className="f">
        Classement
        <select className="input" name="source" value={source} onChange={(e) => setSource(e.currentTarget.value)}>
          <option value="fbfts">🇧🇪 National FBFTS (fichier .xls)</option>
          <option value="fistf">🌍 International FISTF (fichier « World Ranking » .xlsx)</option>
        </select>
      </label>
      <label className="f">
        Mois du classement
        <input className="input" type="month" name="mois" defaultValue={moisDefaut} required={source === "fbfts"} />
        <small className="muted">{source === "fbfts" ? "Le mois écrit en titre de la page FBFTS (ex. « August 2026 »)." : "Lu automatiquement dans le nom du fichier FISTF."}</small>
      </label>
      <label className="f">
        Fichier
        <input className="input" type="file" name="fichier" accept=".xls,.xlsx" required />
      </label>
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Import…" : "⬆️ Importer ce fichier"}
      </button>
      {etat ? <p className={`notice ${etat.ok ? "ok" : "err"}`}>{etat.message}</p> : null}
    </form>
  );
}
