import type { Evenement, FicheLogistique as Fiche } from "@/lib/club-types";
import { dateMoyenne } from "@/lib/club-types";

const euro = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const carte = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const route = (q: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;

function Tuile({ ic, titre, children, large }: { ic: string; titre: string; children: React.ReactNode; large?: boolean }) {
  return (
    <div className={`lg-t${large ? " large" : ""}`}>
      <span className="lg-h">
        <span className="lg-ic" aria-hidden="true">{ic}</span>
        {titre}
      </span>
      <div className="lg-b">{children}</div>
    </div>
  );
}

/** Visual logistics sheet of one event (from Notion « Fiches logistiques événements »). */
export default function FicheLogistique({ f, ev, noms, staff = false }: { f: Fiche | null | undefined; ev: Evenement; noms?: Map<string, string>; staff?: boolean }) {
  if (!f)
    return (
      <p className="vide">
        Pas encore de fiche logistique pour <b>{ev.nom}</b>.{staff ? " Crée-la dans Notion → Fiches logistiques événements, reliée à cet évènement." : " Le staff la prépare."}
      </p>
    );
  const total = f.couts.reduce((s, c) => s + c.v, 0);
  const nb = (ids: string[]) => ids.map((id) => noms?.get(id)).filter(Boolean).join(", ");
  const refP = nb(f.referentPrincipalIds);
  const refC = nb(f.referentComIds);
  const lieu = f.adresse || ev.lieu;

  return (
    <div className="logi">
      <div className="logi-top">
        <div>
          <span className="fl-l">Fiche logistique</span>
          <h3>{ev.nom}</h3>
          <span className="muted small">
            {dateMoyenne(ev.date)}
            {ev.fin && ev.fin !== ev.date ? ` → ${dateMoyenne(ev.fin)}` : ""}
            {ev.deplacement ? ` · ${ev.deplacement}` : ""}
          </span>
        </div>
        <span className={`fstat ${f.statut === "Prête" ? "ok" : "draft"}`}>{f.statut === "Prête" ? "✓ Fiche prête" : "✎ En préparation"}</span>
      </div>

      <div className="lg-grid">
        {lieu ? (
          <Tuile ic="📍" titre="Lieu" large>
            <p>{lieu}</p>
            <span className="lg-act">
              <a className="btn small-btn" href={route(lieu)} target="_blank" rel="noopener">🧭 Itinéraire</a>
              <a className="small" href={carte(lieu)} target="_blank" rel="noopener">Voir sur la carte ↗</a>
            </span>
          </Tuile>
        ) : null}
        {f.horaires ? (
          <Tuile ic="🕘" titre="Horaires">
            <p className="pre">{f.horaires}</p>
          </Tuile>
        ) : null}
        {f.distance ? (
          <Tuile ic="🚗" titre="Trajet">
            <p className="lg-big num">{f.distance} km</p>
            <span className="muted small">depuis Eugies</span>
          </Tuile>
        ) : null}
        {f.hebergement ? (
          <Tuile ic="🏨" titre="Hébergement" large>
            <p>{f.hebergement}</p>
            <span className="muted small">
              {[f.distHebEvenement ? `${f.distHebEvenement} km du tournoi` : null, f.distHebCentre ? `${f.distHebCentre} km du centre` : null, f.hotelNuit ? `≈ ${euro.format(f.hotelNuit)} / nuit` : null].filter(Boolean).join(" · ")}
            </span>
            {f.accesHebEvenement ? <p className="small">🚶 {f.accesHebEvenement}</p> : null}
            <span className="lg-act">
              <a className="small" href={carte(f.hebergement)} target="_blank" rel="noopener">Voir sur la carte ↗</a>
            </span>
          </Tuile>
        ) : null}
        {f.accesAeroport ? (
          <Tuile ic="✈️" titre="Aéroport">
            <p>{f.accesAeroport}</p>
          </Tuile>
        ) : null}
        {f.disponibilite.length ? (
          <Tuile ic="📆" titre="Disponibilité requise">
            <span className="chips">{f.disponibilite.map((d) => <span key={d} className="tagx">{d}</span>)}</span>
            {f.vacances ? <span className="small muted">Pendant les vacances scolaires</span> : null}
          </Tuile>
        ) : null}
        {f.documents.length ? (
          <Tuile ic="🪪" titre="Documents à prévoir">
            <span className="chips">{f.documents.map((d) => <span key={d} className="tagx gold">{d}</span>)}</span>
          </Tuile>
        ) : null}
        {total ? (
          <Tuile ic="💶" titre="Budget estimé">
            <p className="lg-big num">{euro.format(total)}</p>
            <ul className="lg-couts">
              {f.couts.map((c) => (
                <li key={c.label}><span>{c.label}</span><b className="num">{euro.format(c.v)}</b></li>
              ))}
            </ul>
            {f.zone === "Hors zone Euro" ? <span className="small muted">⚠️ Hors zone euro : prévoir le change.</span> : null}
          </Tuile>
        ) : null}
        {f.contactNom || f.contactTel || f.contactMail ? (
          <Tuile ic="☎️" titre="Contact sur place">
            {f.contactNom ? <p><b>{f.contactNom}</b></p> : null}
            <span className="lg-act">
              {f.contactTel ? <a className="btn small-btn" href={`tel:${f.contactTel.replace(/\s/g, "")}`}>📞 Appeler</a> : null}
              {f.contactMail ? <a className="small" href={`mailto:${f.contactMail}`}>{f.contactMail}</a> : null}
            </span>
          </Tuile>
        ) : null}
        {refP || refC ? (
          <Tuile ic="⭐" titre="Référents du club">
            {refP ? <p><span className="muted small">Principal</span><br /><b>{refP}</b></p> : null}
            {refC ? <p><span className="muted small">Communication</span><br /><b>{refC}</b></p> : null}
          </Tuile>
        ) : null}
      </div>
      {staff ? (
        <p className="small">
          <a href={f.url} target="_blank" rel="noopener">Modifier la fiche dans Notion ↗</a>
          {f.objectif ? ` · Objectif : ${f.objectif} participants` : ""}
        </p>
      ) : null}
    </div>
  );
}
