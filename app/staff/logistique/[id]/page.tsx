import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { displayName, getSessionProfil } from "@/lib/profil";
import { essayer, lireActifs, lireCalendrier, lireFicheEdition, lireParticipations } from "@/lib/club";
import { competiteur, dateMoyenne, indexReponses } from "@/lib/club-types";
import { chargerJoueurs } from "@/lib/donnees";
import Editeur from "./Editeur";

export const dynamic = "force-dynamic";

export default async function FichePage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, profil } = await getSessionProfil();
  if (!user) redirect("/login");
  if (profil?.role !== "admin") redirect("/");
  const { id } = await params;
  const [fiche, cal, actifs, joueurs, parts] = await Promise.all([essayer(() => lireFicheEdition(id)), essayer(lireCalendrier), essayer(lireActifs), chargerJoueurs(supabase, null), essayer(lireParticipations)]);
  const ev = fiche.data?.evenementId ? (cal.data || []).find((e) => e.id === fiche.data!.evenementId) : null;
  // Main referent: only players who said « Oui » to coming AND to being referent, and validated their answer.
  const reps = ev ? indexReponses(parts.data || [], cal.data || [], joueurs).get(ev.id) : undefined;
  const volontaires = joueurs
    .filter((j) => { const r = reps?.get(j.notionId); return r?.statut === "Oui" && r.referent === "Oui" && r.valide; })
    .map((j) => ({ id: j.notionId, nom: j.nom }));

  return (
    <>
      <Header subtitle="Staff · fiche logistique" profil={profil} name={displayName(profil, user.email)} />
      <main className="wrap fe-wrap">
        <p className="small"><Link href="/staff/logistique">← Toutes les fiches</Link></p>
        {!fiche.data ? (
          <div className="notice err">{fiche.erreur || "Fiche introuvable."}</div>
        ) : (
          <>
            <section className="hello">
              <span className="kicker">Fiche logistique</span>
              <h2>{ev?.nom || fiche.data.titre}</h2>
              <p>{ev ? [dateMoyenne(ev.date), ev.lieu, ev.deplacement].filter(Boolean).join(" · ") : ""}</p>
            </section>
            <Editeur
              id={fiche.data.id}
              url={fiche.data.url}
              statut={fiche.data.statut}
              initiales={fiche.data.valeurs}
              masquesInit={fiche.data.masques}
              actifs={actifs.data || []}
              joueurs={joueurs.filter(competiteur).map((j) => ({ id: j.notionId, nom: j.nom }))}
              volontaires={volontaires}
              tous={joueurs.map((j) => ({ id: j.notionId, nom: j.nom }))}
            />
          </>
        )}
      </main>
    </>
  );
}
