"use client";

import type { EvenementLie } from "@/lib/cagnotte";

/** Optional event (calendar of the club, internal competition) linked to a gain or an expense. */
export default function ChoixEvenement({ evenements, valeur, onChange }: { evenements: EvenementLie[]; valeur: string; onChange: (e: EvenementLie | null) => void }) {
  if (!evenements.length) return null;
  const auj = new Date().toISOString().slice(0, 10);
  const avenir = evenements.filter((e) => e.date && e.date >= auj).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const passes = evenements.filter((e) => e.date && e.date < auj);
  const internes = evenements.filter((e) => !e.date);
  const opt = (e: EvenementLie) => <option key={e.id} value={e.id}>{e.date ? `${new Date(`${e.date}T12:00:00Z`).toLocaleDateString("fr-BE", { day: "numeric", month: "short", timeZone: "UTC" })} · ` : ""}{e.nom}</option>;
  return (
    <label className="f">Événement lié <small className="muted">(facultatif)</small>
      <select className="input" value={valeur} onChange={(x) => onChange(evenements.find((e) => e.id === x.target.value) || null)}>
        <option value="">— Aucun —</option>
        {avenir.length ? <optgroup label="À venir">{avenir.map(opt)}</optgroup> : null}
        {passes.length ? <optgroup label="Passés">{passes.map(opt)}</optgroup> : null}
        {internes.length ? <optgroup label="Compétitions du club">{internes.map(opt)}</optgroup> : null}
      </select>
    </label>
  );
}
