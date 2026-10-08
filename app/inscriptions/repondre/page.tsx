import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { displayName, getVue } from "@/lib/profil";
import { essayer, lireCalendrier, lireParticipations } from "@/lib/club";
import { chargerJoueurs } from "@/lib/donnees";
import { compteARebours, dateCourte, dateMoyenne, estLoin, indexReponses, modifiable, moisCourt, phase, surDeuxJours } from "@/lib/club-types";
import Formulaire from "./Formulaire";

export const dynamic = "force-dynamic";

export default async function Repondre({ searchParams }: { searchParams: Promise<{ e?: string; j?: string }> }) {
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const [cal, parts, famille] = await Promise.all([essayer(lireCalendrier), essayer(lireParticipations), chargerJoueurs(supabase, user.email)]);
  const actifs = famille.filter((j) => j.actif);
  const ev = (cal.data || []).find((x) => x.id === sp.e);
  const joueur = actifs.find((j) => j.notionId === sp.j) || (actifs.length === 1 ? actifs[0] : null);

  const entete = <Header subtitle="Répondre à une compétition" profil={profil} name={displayName(profil, user.email)} apercu={apercu} />;
  if (!ev)
    return (<>{entete}<main className="wrap"><div className="notice err">Évènement introuvable.</div><Link href="/inscriptions">← Mes inscriptions</Link></main></>);

  // Family account and no player chosen yet: pick who answers.
  if (!joueur)
    return (
      <>
        {entete}
        <main className="wrap">
          <section className="hello"><span className="kicker">{ev.nom}</span><h2>Qui répond ?</h2><p>Choisis la personne de la famille.</p></section>
          <div className="qui">
            {actifs.map((j) => (
              <Link key={j.notionId} className="card" href={`/inscriptions/repondre?e=${ev.id}&j=${j.notionId}`}>
                <span className="ic">🦁</span><h3>{j.nom.split(" ")[0]}</h3><span className="go">Répondre →</span>
              </Link>
            ))}
          </div>
        </main>
      </>
    );

  const p = indexReponses(parts.data || [], cal.data || [], famille).get(ev.id)?.get(joueur.notionId);
  const prenom = joueur.nom.split(" ")[0];
  const ph = phase(ev);
  const ouvert = modifiable(ev, p) || profil?.role === "admin";
  const jusquau = ph === "confirmation" ? (ev.validation ? `jusqu'au ${dateCourte(ev.validation)}` : null) : ev.limite ? `jusqu'au ${dateCourte(ev.limite)}` : null;

  return (
    <>
      {entete}
      <main className="wrap rep-wrap">
        <section className="rep-top">
          <div className="ev-date">
            <span className="m">{ev.date ? moisCourt(ev.date) : ""}</span>
            <span className="d num">{ev.date ? Number(ev.date.slice(8)) : "?"}</span>
            <span className="y">{ev.date?.slice(0, 4)}</span>
          </div>
          <div>
            <span className="cdown">{compteARebours(ev.date)}</span>
            <h2>Bonjour {prenom} !</h2>
            <p>
              {ev.nom}
              {ev.lieu ? ` · ${ev.lieu}` : ""}
              {ev.limite ? ` · réponse avant le ${dateMoyenne(ev.limite)}` : ""}
            </p>
            {p?.statut && p.statut !== "En attente" && !p.valide ? <p className="small">Tu as déjà répondu « {p.statut} » : tu peux la modifier ou la valider définitivement ci-dessous.</p> : null}
          </div>
        </section>
        {ouvert ? (
          <Formulaire
            evId={ev.id}
            evNom={ev.nom}
            joueurId={joueur.notionId}
            prenom={prenom}
            deuxJours={surDeuxJours(ev)}
            loin={estLoin(ev)}
            init={{ statut: p?.statut || null, jours: p?.jours || null, restrictions: p?.depart || p?.retour ? "Oui" : null, depart: p?.depart || null, retour: p?.retour || null, vehicule: p?.vehicule || null }}
            autres={actifs.filter((j) => j.notionId !== joueur.notionId).map((j) => ({ id: j.notionId, prenom: j.nom.split(" ")[0] }))}
            jusquau={jusquau}
            confirmation={ph === "confirmation"}
          />
        ) : (
          <section className="verrou">
            <span className="verrou-ic" aria-hidden="true">🔒</span>
            <h3>{p?.valide ? "Réponse validée définitivement" : ph === "avant" ? "Les réponses ne sont pas encore ouvertes" : "Les réponses sont closes"}</h3>
            {p?.statut && p.statut !== "En attente" ? (
              <ul className="recap">
                <li><span>Réponse</span><b>{p.statut}</b></li>
                {p.jours ? <li><span>Jours</span><b>{p.jours}</b></li> : null}
                {p.depart ? <li><span>Départ</span><b>{p.depart}</b></li> : null}
                {p.retour ? <li><span>Retour</span><b>{p.retour}</b></li> : null}
                {p.vehicule ? <li><span>Véhicule</span><b>{p.vehicule}</b></li> : null}
                {p.valideLe ? <li><span>Validée le</span><b>{dateMoyenne(p.valideLe)}</b></li> : null}
              </ul>
            ) : (
              <p className="muted">{ph === "avant" && ev.ouverture ? `Ouverture le ${dateMoyenne(ev.ouverture)}.` : "Aucune réponse enregistrée."}</p>
            )}
            <p className="small muted">Un changement à faire ? Contacte le staff du club.</p>
            <Link className="btn" href="/inscriptions">← Mes inscriptions</Link>
          </section>
        )}
      </main>
    </>
  );
}
