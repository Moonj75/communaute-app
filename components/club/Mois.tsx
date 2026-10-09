import Link from "next/link";
import type { Evenement, Tache } from "@/lib/club-types";
import { aujourdhui, ajouterJours, estCompetition, estRetenu, jalons, nomMois, RAPPEL } from "@/lib/club-types";

type Item = { cls: string; txt: string };

function cle(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Month grid with competitions, milestones, special days and (optionally) tasks. Pure server component. */
export default function Mois({
  ym,
  evs,
  taches,
  selId,
  lien,
}: {
  ym: string;
  evs: Evenement[];
  taches?: Tache[];
  selId?: string | null;
  lien: (q: { m?: string; e?: string }) => string;
}) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1, 12));
  const startDow = (first.getUTCDay() + 6) % 7;
  const today = aujourdhui();
  const prev = new Date(Date.UTC(y, m - 2, 1, 12)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1, 12)).toISOString().slice(0, 7);

  const items = new Map<string, Item[]>();
  const evDuJour = new Map<string, Evenement>();
  const special = new Map<string, Set<string>>();
  const push = (k: string, it: Item) => {
    if (!items.has(k)) items.set(k, []);
    items.get(k)!.push(it);
  };
  const sel = evs.find((e) => e.id === selId);

  for (const e of evs) {
    if (!e.date) continue;
    const end = e.fin && e.fin > e.date ? e.fin : e.date;
    if (e.jourSpecial) {
      for (let d = e.date; d <= end; d = ajouterJours(d, 1)) {
        if (!special.has(d)) special.set(d, new Set());
        special.get(d)!.add(e.jourSpecial);
        push(d, { cls: "sp", txt: `${e.jourSpecial === "Jour férié" ? "🎌" : e.jourSpecial === "Congé scolaire" ? "🏖️" : "⭐"} ${e.nom}` });
      }
      continue;
    }
    if (!estRetenu(e)) continue;
    for (let d = e.date; d <= end; d = ajouterJours(d, 1)) {
      push(d, { cls: estCompetition(e) ? "ev" : "club", txt: `🏁 ${e.nom}${e.lieu ? " · " + e.lieu : ""}` });
      if (!evDuJour.has(d) || e.id === selId) evDuJour.set(d, e);
    }
    if (estCompetition(e))
      for (const j of jalons(e))
        if (j.k !== "ev" && j.date && !(j.k === "dec" && j.fait)) {
          push(j.date, { cls: "ms", txt: `${j.ic} ${j.label} — ${e.nom}` });
          if (!evDuJour.has(j.date)) evDuJour.set(j.date, e);
        }
  }
  for (const t of taches || []) {
    if (!t.echeance || t.statut === "Fait") continue;
    push(t.echeance, { cls: t.echeance < today ? "late" : "tk", txt: `${t.type === RAPPEL ? "⏰" : "☐"} ${t.titre}` });
  }

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const dt = new Date(Date.UTC(y, m - 1, 1 - startDow + i, 12));
    if (i >= 35 && dt.getUTCMonth() !== m - 1) break;
    const k = cle(dt);
    const its = items.get(k) || [];
    const sp = special.get(k);
    const ev = evDuJour.get(k);
    const dow = dt.getUTCDay();
    const inSel = sel?.date && k >= sel.date && k <= (sel.fin && sel.fin > sel.date ? sel.fin : sel.date);
    const cls = [
      "cd",
      dt.getUTCMonth() !== m - 1 ? "out" : "",
      dow === 0 || dow === 6 ? "wk" : "",
      sp?.has("Jour férié") ? "fer" : "",
      sp?.has("Congé scolaire") ? "vac" : "",
      sp?.has("Événement club") ? "clubd" : "",
      its.some((x) => x.cls === "ev") ? "has-ev" : its.some((x) => x.cls === "club") ? "has-club" : "",
      its.some((x) => x.cls === "ms") ? "has-ms" : "",
      its.some((x) => x.cls === "late") ? "has-late" : its.some((x) => x.cls === "tk") ? "has-tk" : "",
      k < today ? "past" : "",
      k === today ? "today" : "",
      inSel ? "sel" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const inner = (
      <>
        <span className="n">{dt.getUTCDate()}</span>
        <span className="marks" aria-hidden="true">
          {its.some((x) => x.cls === "ms") ? <i className="m-ms" /> : null}
          {its.some((x) => x.cls === "tk" || x.cls === "late") ? <i className={its.some((x) => x.cls === "late") ? "m-late" : "m-tk"} /> : null}
        </span>
        {its.length ? (
          <span className="pop" role="tooltip">
            <b>{dt.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</b>
            {its.slice(0, 6).map((x, n) => (
              <span key={n} className={`pi ${x.cls}`}>
                {x.txt}
              </span>
            ))}
            {its.length > 6 ? <span className="pi">+ {its.length - 6} autres</span> : null}
          </span>
        ) : null}
      </>
    );
    cells.push(
      ev ? (
        <Link key={k} href={lien({ m: ym, e: ev.id })} className={cls} scroll={false} aria-label={`${dt.getUTCDate()} : ${its.map((x) => x.txt).join(", ")}`}>
          {inner}
        </Link>
      ) : (
        <span key={k} className={cls} tabIndex={its.length ? 0 : undefined}>
          {inner}
        </span>
      ),
    );
  }

  return (
    <div className="mois">
      <div className="mois-h bande-mois">
        <Link className="mois-nav" href={lien({ m: prev, e: selId || undefined })} scroll={false} aria-label="Mois précédent">
          ‹
        </Link>
        <b>{nomMois(ym)}</b>
        <Link className="mois-nav" href={lien({ m: next, e: selId || undefined })} scroll={false} aria-label="Mois suivant">
          ›
        </Link>
      </div>
      <div className="mois-g">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i} className="dn">
            {d}
          </span>
        ))}
        {cells}
      </div>
      <div className="mois-lg">
        <span><i className="lg ev" />Compétition</span>
        <span><i className="lg ms" />Jalon</span>
        {taches ? <span><i className="lg tache" />Tâche</span> : null}
        <span><i className="lg fer" />Férié</span>
        <span><i className="lg vac" />Vacances</span>
        <span><i className="lg wk" />Week-end</span>
      </div>
    </div>
  );
}
