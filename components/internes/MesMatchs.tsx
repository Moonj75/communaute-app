import { dateMoyenne, joursEntre, aujourdhui } from "@/lib/club-types";
import { TYPES, type MaSituation } from "@/lib/internes";
import MonMatch from "./MonMatch";

/** « Mes matchs »: for each competition in progress, where I stand and who I still have to play, before when. */
export default function MesMatchs({ sits, famille = false }: { sits: MaSituation[]; famille?: boolean }) {
  const T = aujourdhui();
  if (!sits.length) return <p className="vide">Tu ne joues dans aucune compétition du club en cours.</p>;
  return (
    <div className="mm">
      {sits.map((s) => {
        const j = s.fin ? joursEntre(T, s.fin) : null;
        const ton = j == null ? "" : j < 0 ? " depasse" : j <= 7 ? " proche" : "";
        return (
          <article key={`${s.compet.id}-${s.joueur.id}`} className={`mm-c s-${s.statut.ton}`}>
            <header className="mm-tete">
              <span className="mm-ic" aria-hidden="true">{TYPES[s.compet.type].ic}</span>
              <span className="mm-t"><b>{s.compet.nom}</b><small>{s.etapeNom}{s.groupe ? ` · ${s.groupe}` : ""}{famille ? ` · ${s.joueur.nom}` : ""}</small></span>
              {s.rang ? <span className="mm-rang"><b className="num">{s.rang}<sup>{s.rang === 1 ? "er" : "e"}</sup></b><small>sur {s.sur} · {s.pts} pts</small></span> : null}
            </header>
            <p className={`mm-statut t-${s.statut.ton}`}>{s.statut.ton === "bon" ? "✅" : s.statut.ton === "moyen" ? "⚠️" : s.statut.ton === "fini" ? "⛔" : "ℹ️"} {s.statut.txt}</p>
            {s.aJouer.length ? (
              <>
                <p className={`mm-delai${ton}`}>
                  ⚔️ <b>{s.aJouer.length} match{s.aJouer.length > 1 ? "s" : ""} à jouer</b>
                  {s.fin ? <> · avant le {dateMoyenne(s.fin)} {j != null ? <span className="mm-j">{j < 0 ? "date dépassée" : j === 0 ? "dernier jour" : `J-${j}`}</span> : null}</> : null}
                </p>
                <ul className="mm-l mo-l">{s.aJouer.map((m) => <MonMatch key={m.id} m={m} joueurId={s.joueur.id} joueurNom={s.joueur.nom} />)}</ul>
                <p className="mm-aide">Après le match, chacun met le score : s&apos;ils sont identiques, il est validé tout seul.</p>
              </>
            ) : s.total ? <p className="mm-fini">🎉 Tous tes matchs de cette étape sont joués ({s.joues}/{s.total}).</p> : null}
          </article>
        );
      })}
    </div>
  );
}
