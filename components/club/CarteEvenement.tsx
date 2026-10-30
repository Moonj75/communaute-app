import type { ReactNode } from "react";
import type { Evenement, JoueurLite, Participation } from "@/lib/club-types";
import { compteARebours, dateMoyenne, indexReponses, initiales, joursEntre, moisCourt } from "@/lib/club-types";
import { DECISION_OUI } from "@/lib/club-types";
import Drapeau from "@/components/Drapeau";
import { paysEv } from "@/lib/drapeaux";

export function decisionBadge(d: string | null) {
  if (!d) return <span className="dec dec-p">À décider</span>;
  if (d === DECISION_OUI) return <span className="dec dec-o">On y va</span>;
  if (d.includes("❌")) return <span className="dec dec-n">On n&apos;y va pas</span>;
  return <span className="dec dec-p">{d.replace(/^[^A-Za-zÀ-ÿ]+/, "")}</span>;
}

const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const jourDe = (d: string) => JOURS[new Date(d + "T12:00:00Z").getUTCDay()];

/* Avatar colours from the club palette (never red / green, kept for statuses). */
const TEINTES = ["#1f3fa8", "#6a35b5", "#b35a00", "#0b6f7a", "#b0306a", "#7a5a1e", "#23305e", "#4a5d73"];
function teinte(nom: string) {
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TEINTES[h % TEINTES.length];
}
function Avatar({ nom }: { nom: string }) {
  return (
    <span className="ce-av" style={{ background: teinte(nom) }} aria-hidden="true">
      {initiales(nom)}
    </span>
  );
}

function Anneau({ v }: { v: number }) {
  const r = 19, c = 2 * Math.PI * r, d = (Math.max(0, Math.min(100, v)) / 100) * c;
  return (
    <svg className="ce-anneau" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r={r} fill="none" stroke="var(--ligne-sep)" strokeWidth="6" />
      {d > 0 ? <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${d.toFixed(2)} ${c.toFixed(2)}`} transform="rotate(-90 24 24)" /> : null}
    </svg>
  );
}

/** Proximity of the event: < 1 month, < 2 months, later. */
function proximite(j: number) {
  return j < 0 ? "passe" : j <= 30 ? "proche" : j <= 60 ? "moyen" : "loin";
}

/**
 * Full card of the selected event (same content as the « Joueurs » page):
 * date, countdown, place, kind, club target, Oui / Peut-être / Non bar, options, deadline,
 * cars offered, who comes, who may come. `enfants` = the player's own answer and buttons.
 */
export default function CarteEvenement({
  ev, parts, evs, joueurs, today, lienFiche, enfants,
}: {
  ev: Evenement;
  parts: Participation[];
  evs: Evenement[];
  joueurs: JoueurLite[];
  today: string;
  lienFiche?: string;
  enfants?: ReactNode;
}) {
  const deux = Boolean(ev.fin && ev.fin !== ev.date);
  const j = ev.date ? joursEntre(today, ev.date) : 0;
  const rep = indexReponses(parts, evs, joueurs).get(ev.id) || new Map<string, Participation>();
  const nom = (id: string) => joueurs.find((x) => x.notionId === id)?.nom || "?";
  const tri = (a: string, b: string) => a.localeCompare(b, "fr");
  const oui: string[] = [], peut: string[] = [];
  let non = 0, voitures = 0;
  const referents: string[] = [];
  // Two-day event: « S » saturday only, « D » sunday only, nothing for both days.
  const jourDe1 = new Map<string, "S" | "D">();
  // Players who validated their form for good: circled in fluo green.
  const valides = new Set<string>();
  rep.forEach((p, id) => {
    if (p.statut === "Oui") {
      oui.push(nom(id));
      if (p.valide) valides.add(nom(id));
      if (p.vehicule === "Oui") voitures++;
      if (p.referent === "Oui") referents.push(nom(id));
      if (/^samedi/i.test(p.jours || "")) jourDe1.set(nom(id), "S");
      else if (/^dimanche/i.test(p.jours || "")) jourDe1.set(nom(id), "D");
    } else if (p.statut === "Peut-être") {
      peut.push(nom(id));
      if (/^samedi/i.test(p.jours || "")) jourDe1.set(nom(id), "S");
      else if (/^dimanche/i.test(p.jours || "")) jourDe1.set(nom(id), "D");
    }
    else if (p.statut === "Non") non++;
  });
  oui.sort(tri);
  peut.sort(tri);
  const N = Math.max(new Set(joueurs.filter((x) => x.actif).map((x) => x.nom)).size, oui.length + peut.length + non, 1);
  const but = ev.objectif || null;
  const pc = but ? Math.round((oui.length / but) * 100) : Math.round((oui.length / N) * 100);
  const lim = ev.limite ? joursEntre(today, ev.limite) : null;

  return (
    <section className="panel ce" aria-live="polite">
      <div className="ce-tete">
        <div className="ce-date">
          <span className="m">{ev.date ? moisCourt(ev.date) : ""}</span>
          <span className="d num">
            {ev.date ? Number(ev.date.slice(8)) : "?"}
            {deux ? `–${Number(ev.fin!.slice(8))}` : ""}
          </span>
          <span className="y">
            {ev.date ? jourDe(ev.date) : ""}
            {deux ? ` → ${jourDe(ev.fin!)}` : ""} {ev.date?.slice(0, 4)}
          </span>
        </div>
        <div className="ce-id">
          <span className={`ce-cd ${proximite(j)}`}>{compteARebours(ev.date, today)}</span>
          <h3 className="ce-nom"><Drapeau code={paysEv(ev)} />{ev.nom}</h3>
          {ev.lieu ? <span className="ce-l v-lieu">📍 {ev.lieu}</span> : null}
          {ev.competition || ev.notes ? (
            <span className="ce-l">🏆 {[ev.competition, ev.notes].filter(Boolean).join(" · ")}</span>
          ) : null}
        </div>
      </div>

      <div className="ce-but">
        <span className="ce-but-a">
          <Anneau v={pc} />
        </span>
        <div className="ce-but-t">
          <b className="num">
            {oui.length}
            {but ? ` / ${but}` : ""}
          </b>
          <span>{but ? "inscrits · objectif du club" : `inscrit${oui.length > 1 ? "s" : ""} sur ${N} joueurs`}</span>
        </div>
        <span className="ce-pile" role="img" aria-label={`${oui.length} oui, ${peut.length} peut-être, ${non} non sur ${N} joueurs`}>
          <i className="o" style={{ width: `${(oui.length / N) * 100}%` }} />
          <i className="m" style={{ width: `${(peut.length / N) * 100}%` }} />
          <i className="n" style={{ width: `${(non / N) * 100}%` }} />
        </span>
        <span className="ce-logi">
          <span className="ce-k" title="Joueurs inscrits">👥 <b className="num">{oui.length}</b></span>
          <span className="ce-k" title="Véhicules proposés">🚗 <b className="num">{voitures}</b></span>
          <span className="ce-k" title={referents.length ? `Référents volontaires : ${referents.join(", ")}` : "Aucun référent volontaire"}>🧭 <b className="num">{referents.length}</b></span>
        </span>
      </div>

      <div className="ce-flags">
        {decisionBadge(ev.decision)}
        <span className={`ce-fl${ev.covoiturage ? " on" : ""}`}>{ev.covoiturage ? "✓" : "—"} Covoiturage organisé</span>
        <span className={`ce-fl${deux ? " on" : ""}`}>{deux ? "✓" : "—"} Sur 2 jours</span>
        {ev.deplacement ? <span className="ce-fl">{ev.deplacement}</span> : null}
        {ev.priorite.map((p) => (
          <span key={p} className="ce-fl pr">{p}</span>
        ))}
      </div>

      <p className="ce-lim">
        ⏱️{" "}
        {lim === null ? (
          "Pas de date limite de réponse"
        ) : lim < 0 ? (
          <>Réponses closes depuis le {dateMoyenne(ev.limite)}</>
        ) : (
          <>
            Réponds avant le <b className="v-date">{dateMoyenne(ev.limite)}</b> · {lim === 0 ? "aujourd'hui" : `J-${lim}`}
          </>
        )}
      </p>

      <div className="ce-qui">
        <span className="ce-qt">Participent ({oui.length}){valides.size ? <span className="ce-qv"> · <i className="ce-pv" aria-hidden="true" /> {valides.size} validé{valides.size > 1 ? "s" : ""}</span> : null}<LegendeJours n={jourDe1.size} /></span>
        <div className="ce-chips">
          {oui.length ? oui.map((n) => (
            <span key={n} className={`ce-chip o${valides.has(n) ? " valide" : ""}`} title={valides.has(n) ? "Participation validée définitivement" : undefined}><Avatar nom={n} />{n}<JourBadge j={jourDe1.get(n)} />{valides.has(n) ? <i className="ce-lock" aria-label="validé">🔒</i> : null}{referents.includes(n) ? <i className="ce-ref" title="Référent volontaire">🧭</i> : null}</span>
          )) : <span className="muted small">Personne pour l&apos;instant. Sois le premier !</span>}
        </div>
      </div>
      {peut.length ? (
        <div className="ce-qui">
          <span className="ce-qt">Peut-être ({peut.length})</span>
          <div className="ce-chips">
            {peut.map((n) => (
              <span key={n} className="ce-chip m"><Avatar nom={n} />{n}<JourBadge j={jourDe1.get(n)} /></span>
            ))}
          </div>
        </div>
      ) : null}

      {enfants}
      {lienFiche ? (
        <a className="btn ce-fiche" href={lienFiche}>🧳 Fiche logistique</a>
      ) : null}
    </section>
  );
}

/** Round « S » (saturday only) or « D » (sunday only) badge next to a name; nothing when the player comes both days. */
export function JourBadge({ j }: { j?: "S" | "D" }) {
  if (!j) return null;
  return (
    <b
      title={j === "S" ? "Samedi uniquement" : "Dimanche uniquement"}
      aria-label={j === "S" ? "samedi uniquement" : "dimanche uniquement"}
      style={{ display: "inline-grid", placeItems: "center", width: 24, height: 24, marginLeft: 6, flex: "none", borderRadius: "50%", font: "900 14px/1 var(--font-display, system-ui)", fontStyle: "normal", background: "#fff", color: j === "S" ? "#1e5bff" : "#8a2be2", border: "2.5px solid " + (j === "S" ? "#1e5bff" : "#8a2be2"), boxShadow: "0 2px 6px rgba(0,0,0,.3)" }}
    >
      {j}
    </b>
  );
}

/** Legend shown only when somebody comes one day only. */
export function LegendeJours({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="small" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 8, fontWeight: 600, color: "var(--muted)" }}>
      <JourBadge j="S" /> samedi seul <JourBadge j="D" /> dimanche seul
    </span>
  );
}
