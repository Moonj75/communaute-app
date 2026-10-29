// 📅 PAGE ÉVÈNEMENTS (staff) : ce fichier va dans le dossier « app/staff/evenements ».
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Blocs from "@/components/Blocs";
import Rafraichir from "@/components/club/Rafraichir";
import EditeurEvenement from "@/components/club/EditeurEvenement";
import { displayName, getSessionProfil } from "@/lib/profil";
import { essayer, lireCalendrier, lireFiches } from "@/lib/club";
import { aujourdhui } from "@/lib/club-types";
import { delaisHabituels, manques } from "@/lib/evenements-types";
import { rafraichir } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Évènements · Staff" };

/**
 * Staff: the club calendar from the app — events to complete (created in Notion with missing fields),
 * a new event with every field, and every coming event to correct. « 🔄 » reads Notion again at once.
 */
export default async function EvenementsPage() {
  const { user, profil } = await getSessionProfil();
  if (!user) redirect("/login");
  if (profil?.role !== "admin") redirect("/");
  const [cal, fiches] = await Promise.all([essayer(lireCalendrier), essayer(lireFiches)]);
  const evs = cal.data || [];
  const T = aujourdhui();
  const delais = delaisHabituels(evs);
  // Coming events (and those without a date), real events only (no holidays / special days).
  const avenir = evs.filter((e) => (!e.date || (e.fin || e.date) >= T) && !e.jourSpecial && !e.annule && !e.nePasFaire);
  const avec = avenir.map((e) => ({ e, aFiche: Boolean(fiches.data?.get(e.id)), m: manques(e, Boolean(fiches.data?.get(e.id))) }));
  const aCompleter = avec.filter((x) => x.m.length);
  return (
    <>
      <Header subtitle="Staff · évènements" profil={profil} name={displayName(profil, user.email)} />
      <main className="wrap">
        {cal.erreur ? <div className="notice err">{cal.erreur}</div> : null}
        <Blocs
          page="Évènements"
          actions={<Rafraichir action={rafraichir} />}
          initial={aCompleter.length ? "completer" : "ajouter"}
          blocs={[
            { id: "completer", titre: "À compléter", ic: "⚠️", badge: aCompleter.length || null, contenu: aCompleter.length ? (
              <div className="ee-liste">
                <p className="muted small">Ces évènements ont été créés dans Notion mais il leur manque des cases : ils n&apos;apparaissent pas partout (inscriptions, tableau de bord, relances…). Complète-les ici.</p>
                {aCompleter.map((x) => <EditeurEvenement key={x.e.id} ev={x.e} aFiche={x.aFiche} delais={delais} manque={x.m} />)}
              </div>
            ) : <p className="vide">Tous les évènements à venir sont complets ✓</p> },
            { id: "ajouter", titre: "Ajouter un évènement", ic: "➕", contenu: <EditeurEvenement delais={delais} /> },
            { id: "tous", titre: "Évènements à venir", ic: "📅", badge: avenir.length || null, contenu: (
              <div className="ee-liste">{avec.map((x) => <EditeurEvenement key={x.e.id} ev={x.e} aFiche={x.aFiche} delais={delais} manque={x.m} />)}</div>
            ) },
          ]}
        />
      </main>
    </>
  );
}
