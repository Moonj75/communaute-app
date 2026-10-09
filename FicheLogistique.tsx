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
        Pas encore de fiche logistique pour <b>{ev.nom}</b>.{staff ? <> <a href="/staff/logistique">Crée-la depuis la page Fiches logistiques →</a></> : " Le staff la prépare."}
      </p>
    );
  if (!staff && f.statut !== "Prête")
    return (
      <p className="vide">
        La fiche logistique de <b>{ev.nom}</b> est en préparation : elle apparaîtra ici dès que le staff l&apos;aura publiée.
      </p>
    );
  // Fields marked « Pas utile » by the staff are never shown.
  const vis = (k: string) => !(f.masques || []).includes(k);
  const CLE_COUT: Record<string, string> = { Essence: "essence", Péages: "peages", "Location voiture": "location", "Billet d'avion": "avion", "Transfert aéroport": "transfert" };
  const couts = f.couts.filter((c) => vis(CLE_COUT[c.label] || ""));
  const total = couts.reduce((s, c) => s + c.v, 0);
  const nb = (ids: string[]) => ids.map((id) => noms?.get(id)).filter(Boolean).join(", ");
  const refP = vis("refPrincipal") ? nb(f.referentPrincipalIds) : "";
  const refC = vis("refCom") ? nb(f.referentComIds) : "";
  const lieu = (vis("adresse") && f.adresse) || ev.lieu;

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
        {f.horaires && vis("horaires") ? (
          <Tuile ic="🕘" titre="Horaires">
            <p className="pre">{f.horaires}</p>
          </Tuile>
        ) : null}
        {f.distance && vis("distance") ? (
          <Tuile ic="🚗" titre="Trajet">
            <p className="lg-big num">{f.distance} km</p>
            <span className="muted small">depuis Eugies</span>
          </Tuile>
        ) : null}
        {f.hebergement && vis("hebergement") ? (
          <Tuile ic="🏨" titre="Hébergement" large>
            <p>{f.hebergement}</p>
            <span className="muted small">
              {[f.distHebEvenement && vis("distHebEvenement") ? `${f.distHebEvenement} km du tournoi` : null, f.distHebCentre && vis("distHebCentre") ? `${f.distHebCentre} km du centre` : null, f.hotelNuit && vis("hotelNuit") ? `≈ ${euro.format(f.hotelNuit)} / nuit` : null].filter(Boolean).join(" · ")}
            </span>
            {f.accesHebEvenement && vis("accesHebEvenement") ? <p className="small">🚶 {f.accesHebEvenement}</p> : null}
            <span className="lg-act">
              <a className="small" href={carte(f.hebergement)} target="_blank" rel="noopener">Voir sur la carte ↗</a>
            </span>
          </Tuile>
        ) : null}
        {f.accesAeroport && vis("accesAeroport") ? (
          <Tuile ic="✈️" titre="Aéroport">
            <p>{f.accesAeroport}</p>
          </Tuile>
        ) : null}
        {f.disponibilite.length && vis("disponibilite") ? (
          <Tuile ic="📆" titre="Disponibilité requise">
            <span className="chips">{f.disponibilite.map((d) => <span key={d} className="tagx">{d}</span>)}</span>
            {f.vacances && vis("vacances") ? <span className="small muted">Pendant les vacances scolaires</span> : null}
          </Tuile>
        ) : null}
        {f.documents.length && vis("documents") ? (
          <Tuile ic="🪪" titre="Documents à prévoir">
            <span className="chips">{f.documents.map((d) => <span key={d} className="tagx gold">{d}</span>)}</span>
          </Tuile>
        ) : null}
        {total ? (
          <Tuile ic="💶" titre="Budget estimé">
            <p className="lg-big num">{euro.format(total)}</p>
            <ul className="lg-couts">
              {couts.map((c) => (
                <li key={c.label}><span>{c.label}</span><b className="num">{euro.format(c.v)}</b></li>
              ))}
            </ul>
            {f.zone === "Hors zone Euro" && vis("zone") ? <span className="small muted">⚠️ Hors zone euro : prévoir le change.</span> : null}
          </Tuile>
        ) : null}
        {(vis("contactNom") && f.contactNom) || (vis("contactTel") && f.contactTel) || (vis("contactMail") && f.contactMail) ? (
          <Tuile ic="☎️" titre="Contact sur place">
            {f.contactNom && vis("contactNom") ? <p><b>{f.contactNom}</b></p> : null}
            <span className="lg-act">
              {f.contactTel && vis("contactTel") ? <a className="btn small-btn" href={`tel:${f.contactTel.replace(/\s/g, "")}`}>📞 Appeler</a> : null}
              {f.contactMail && vis("contactMail") ? <a className="small" href={`mailto:${f.contactMail}`}>{f.contactMail}</a> : null}
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
          <a href={`/staff/logistique/${f.id}`}>✎ Remplir / modifier la fiche</a>
          {f.objectif ? ` · Objectif : ${f.objectif} participants` : ""}
        </p>
      ) : null}
    </div>
  );
}
