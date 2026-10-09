import type { Evenement } from "@/lib/club-types";
import { aujourdhui, dateCourte, jalons } from "@/lib/club-types";

/** Horizontal milestone track: Décision → Ouverture → Limite → Validation → Jour J. */
export default function Jalons({ e, compact = false }: { e: Evenement; compact?: boolean }) {
  const t = aujourdhui();
  const js = jalons(e);
  const prochain = js.find((j) => j.date && j.date >= t && !j.fait)?.k;
  return (
    <ol className={`jalons${compact ? " compact" : ""}`}>
      {js.map((j) => {
        const etat = j.fait || (j.date && j.date < t) ? "fait" : j.k === prochain ? "next" : j.date ? "a-venir" : "vide";
        const retard = j.k === "dec" && !j.fait && j.date && j.date < t;
        return (
          <li key={j.k} className={`${etat}${retard ? " retard" : ""}`}>
            <span className="jd" aria-hidden="true">{j.ic}</span>
            <span className="jl">{j.label}</span>
            <span className="jv">{j.date ? dateCourte(j.date) : "—"}</span>
            {retard ? <span className="jr">à trancher</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
