import type { ClassementClub, Evenement, Resultat, Seance } from "@/lib/club-types";
import { aujourdhui, compteARebours, dateCourte, dateMoyenne } from "@/lib/club-types";

function Tendance({ maintenant, avant }: { maintenant: number | null; avant: number | null }) {
  if (!maintenant || !avant) return null;
  const d = avant - maintenant; // a smaller place is better
  if (d === 0) return <span className="tend eq">= stable</span>;
  return d > 0 ? <span className="tend up">▲ {d} place{d > 1 ? "s" : ""}</span> : <span className="tend down">▼ {-d} place{d < -1 ? "s" : ""}</span>;
}

const medaille = (p: number | null) => (p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : null);

export function BlocClassements({ classements }: { classements: ClassementClub[] }) {
  const [now, prev] = classements;
  return (
    <>
      <div className="club-cl">
        <div className="clt">
          <span className="fl-l">🇧🇪 Classement national des clubs</span>
          <span className="clt-v num">{now?.national ? <><small>#</small>{now.national}</> : "—"}</span>
          <Tendance maintenant={now?.national ?? null} avant={prev?.national ?? null} />
        </div>
        <div className="clt">
          <span className="fl-l">🌍 Classement international</span>
          <span className="clt-v num">{now?.international ? <><small>#</small>{now.international}</> : "—"}</span>
          <Tendance maintenant={now?.international ?? null} avant={prev?.international ?? null} />
        </div>
      </div>
      <p className="muted small">
        {now?.date ? `Relevé du ${dateMoyenne(now.date)}.` : "Aucun relevé pour l'instant : ajoute une ligne dans Notion → « Classements du club »."}
        {now?.source ? (
          <>
            {" "}
            <a href={now.source} target="_blank" rel="noopener">Voir la source ↗</a>
          </>
        ) : null}
      </p>
    </>
  );
}

export function BlocResultats({ resultats, evs, noms }: { resultats: Resultat[]; evs: Evenement[]; noms: Map<string, string> }) {
  if (!resultats.length)
    return (
      <p className="vide">
        Pas encore de résultat enregistré. Ajoute-les dans Notion → <b>Résultats du club</b> (individuels et par équipes) : les 6 derniers s&apos;affichent ici.
      </p>
    );
  return (
    <ul className="res">
      {resultats.map((r) => {
        const comp = r.competitionIds.map((id) => evs.find((e) => e.id === id)?.nom).find(Boolean);
        const qui = r.joueurIds.map((id) => noms.get(id)).filter(Boolean).join(", ");
        return (
          <li key={r.id}>
            <span className="pl num">
              {medaille(r.place) || (r.place ? `${r.place}e` : "—")}
              {r.sur ? <small>sur {r.sur}</small> : null}
            </span>
            <span className="rt">
              <b>{r.titre}</b>
              <span>
                {[comp, r.date ? dateCourte(r.date) : null, r.categorie, qui && r.type !== "Par équipes" ? qui : null].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className={`typ${r.type === "Par équipes" ? " eq" : ""}`}>{r.type || "Résultat"}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function BlocEntrainements({ seances, noms }: { seances: Seance[]; noms: Map<string, string> }) {
  const T = aujourdhui();
  if (!seances.length)
    return (
      <p className="vide">
        Aucune séance programmée. Les entraînements se planifient dans Notion → <b>Séances d&apos;entraînement</b>.
      </p>
    );
  return (
    <ul className="seances">
      {seances.map((s) => {
        const coach = s.entraineurIds.map((id) => noms.get(id)).filter(Boolean).join(", ");
        return (
          <li key={s.id} className={s.annule ? "annule" : undefined}>
            <span className="fl-l">{compteARebours(s.date, T)}</span>
            <span className="sd">{dateCourte(s.date)}</span>
            <span className="sh">
              {s.annule ? `❌ Annulé${s.motif ? " · " + s.motif : ""}` : [s.debut && s.fin ? `${s.debut} – ${s.fin}` : s.debut, s.lieu].filter(Boolean).join(" · ") || s.titre}
            </span>
            {s.themes.length ? <span className="muted small">🎯 {s.themes.join(", ")}</span> : null}
            {coach ? <span className="muted small">🎓 {coach}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
