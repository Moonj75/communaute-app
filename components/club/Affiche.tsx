import Link from "next/link";
import type { Seance } from "@/lib/club-types";

/** Where the club trains (shown on the poster, with a map link). */
export const SALLE = {
  nom: "Maison du Peuple",
  rue: "63 rue de la Colline",
  ville: "7080 La Bouverie (Frameries)",
  pays: "Belgique",
};
const CARTE = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Maison du Peuple, 63 rue de la Colline, 7080 La Bouverie, Frameries, Belgique")}`;

/**
 * Visitor welcome screen, like a poster: the next training (big date, hours), the place with a map link,
 * and the buttons « Nous contacter » and « Espace membres ».
 */
export default function Affiche({ seance, connecte }: { seance: Seance | null; connecte: boolean }) {
  const d = seance ? new Date(seance.date.slice(0, 10) + "T12:00:00Z") : null;
  const jour = d ? d.toLocaleDateString("fr-BE", { weekday: "long", timeZone: "UTC" }) : null;
  const num = d ? d.getUTCDate() : null;
  const mois = d ? d.toLocaleDateString("fr-BE", { month: "long", timeZone: "UTC" }) : null;
  const heures = seance ? (seance.debut && seance.fin ? `${seance.debut} – ${seance.fin}` : seance.debut || "") : "";
  return (
    <section className="aff" aria-label="Prochain entraînement">
      <div className="aff-fond" aria-hidden="true" />
      <div className="aff-haut">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/crest.png" alt="SC Lions d'Eugies" width={58} height={58} />
        <span>SC Lions d&apos;Eugies<small>Subbuteo club · LEAW</small></span>
      </div>
      <p className="aff-accroche">Viens jouer avec nous !</p>
      <div className="aff-date">
        <span className="aff-k">Prochain entraînement</span>
        {d ? (
          <span className="aff-j">
            <b className="aff-n num">{num}</b>
            <span className="aff-jm"><span>{jour}</span><span>{mois}</span></span>
          </span>
        ) : (
          <span className="aff-j"><span className="aff-jm"><span>Bientôt</span><span>dates à venir</span></span></span>
        )}
        {heures ? <span className="aff-h">🕖 {heures}</span> : null}
      </div>
      <a className="aff-lieu" href={CARTE} target="_blank" rel="noopener">
        <span className="aff-pin" aria-hidden="true">📍</span>
        <span>
          <b>{SALLE.nom}</b>
          <small>{SALLE.rue} · {SALLE.ville} · {SALLE.pays}</small>
        </span>
        <span className="aff-it">Itinéraire ↗</span>
      </a>
      <div className="aff-btns">
        <Link className="btn primary aff-contact" href="/club/contact">✉️ Nous contacter</Link>
        <Link className="btn aff-membre" href={connecte ? "/" : "/login"}>{connecte ? "Mon espace →" : "Espace membres →"}</Link>
      </div>
    </section>
  );
}
