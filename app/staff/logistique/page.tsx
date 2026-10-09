import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { displayName, getSessionProfil } from "@/lib/profil";
import { essayer, lireCalendrier, lireFiches } from "@/lib/club";
import { aujourdhui, compteARebours, dateMoyenne, estCompetition, estRetenu, moisCourt } from "@/lib/club-types";
import { avancement, CHAMPS, type Valeur } from "@/lib/logistique";
import type { FicheLogistique } from "@/lib/club-types";
import { nouvelleFiche } from "./actions";

export const dynamic = "force-dynamic";

/** Values of a sheet already read for the calendar, in the editor's format (for the progress bar). */
function valeursDe(f: FicheLogistique): Record<string, Valeur> {
  const c = (l: string) => f.couts.find((x) => x.label === l)?.v ?? null;
  return {
    adresse: f.adresse, horaires: f.horaires, contactNom: f.contactNom, contactTel: f.contactTel, contactMail: f.contactMail,
    distance: f.distance, disponibilite: f.disponibilite, vacances: f.vacances, documents: f.documents, zone: f.zone, accesAeroport: f.accesAeroport,
    hebergement: f.hebergement, hotelNuit: f.hotelNuit, distHebEvenement: f.distHebEvenement, distHebCentre: f.distHebCentre, accesHebEvenement: f.accesHebEvenement,
    essence: c("Essence"), peages: c("Péages"), location: c("Location voiture"), avion: c("Billet d'avion"), transfert: c("Transfert aéroport"),
    objectif: f.objectif, refPrincipal: f.referentPrincipalIds[0] || null, refCom: f.referentComIds[0] || null,
  };
}

export default async function Logistique() {
  const { user, profil } = await getSessionProfil();
  if (!user) redirect("/login");
  if (profil?.role !== "admin") redirect("/");
  const [cal, fi] = await Promise.all([essayer(lireCalendrier), essayer(lireFiches)]);
  const T = aujourdhui();
  const evs = (cal.data || []).filter((e) => e.date && e.date >= T && estCompetition(e) && estRetenu(e) && !e.jourSpecial);
  const fiches = fi.data || new Map();

  return (
    <>
      <Header subtitle="Staff · fiches logistiques" profil={profil} name={displayName(profil, user.email)} />
      <main className="wrap">
        <section className="hello">
          <span className="kicker">Staff</span>
          <h2>Fiches logistiques</h2>
          <p>Remplis la fiche de chaque compétition. Quand tous les champs sont prêts (remplis ou « pas utile »), publie-la : les joueurs la verront dans le calendrier.</p>
        </section>
        {cal.erreur ? <div className="notice err">{cal.erreur}</div> : null}
        <ol className="lf">
          {evs.map((e) => {
            const f = fiches.get(e.id) as FicheLogistique | undefined;
            const av = f ? avancement(valeursDe(f), f.masques) : null;
            const pct = av ? Math.round((av.prets / av.total) * 100) : 0;
            return (
              <li key={e.id} className={`lf-l${f?.statut === "Prête" ? " pub" : f ? " brou" : " vide"}`}>
                <span className="lf-d">
                  <b className="num">{Number(e.date!.slice(8))}</b>
                  <small>{moisCourt(e.date!)}</small>
                </span>
                <span className="lf-n">
                  <b>{e.nom}</b>
                  <small>
                    {[e.lieu, dateMoyenne(e.date), compteARebours(e.date, T)].filter(Boolean).join(" · ")}
                  </small>
                  {f ? (
                    <span className="lf-prog">
                      <span className="lf-barre"><span style={{ width: `${pct}%` }} /></span>
                      <span className="lf-pct">{av!.prets}/{CHAMPS.length} prêts</span>
                    </span>
                  ) : null}
                </span>
                <span className={`lf-st ${f?.statut === "Prête" ? "pub" : f ? "brou" : "aucune"}`}>{f?.statut === "Prête" ? "✓ Publiée" : f ? "✎ Brouillon" : "Pas de fiche"}</span>
                {f ? (
                  <Link className={`btn${f.statut === "Prête" ? "" : " primary"}`} href={`/staff/logistique/${f.id}`}>
                    {f.statut === "Prête" ? "Voir / modifier" : "Remplir →"}
                  </Link>
                ) : (
                  <form action={nouvelleFiche}>
                    <input type="hidden" name="e" value={e.id} />
                    <button className="btn primary" type="submit">＋ Créer la fiche</button>
                  </form>
                )}
              </li>
            );
          })}
          {!evs.length ? <li className="vide">Aucune compétition à venir retenue dans le calendrier.</li> : null}
        </ol>
      </main>
    </>
  );
}
