import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { displayName, getSessionProfil } from "@/lib/profil";
import { essayer, lireActifs, lireCalendrier, lireFicheEdition } from "@/lib/club";
import { dateMoyenne } from "@/lib/club-types";
import { chargerJoueurs } from "@/lib/donnees";
import Editeur from "./Editeur";

export const dynamic = "force-dynamic";

export default async function FichePage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, profil } = await getSessionProfil();
  if (!user) redirect("/login");
  if (profil?.role !== "admin") redirect("/");
  const { id } = await params;
  const [fiche, cal, actifs, joueurs] = await Promise.all([essayer(() => lireFicheEdition(id)), essayer(lireCalendrier), essayer(lireActifs), chargerJoueurs(supabase, null)]);
  const ev = fiche.data?.evenementId ? (cal.data || []).find((e) => e.id === fiche.data!.evenementId) : null;

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
              joueurs={joueurs.filter((j) => j.actif).map((j) => ({ id: j.notionId, nom: j.nom }))}
            />
          </>
        )}
      </main>
    </>
  );
}
