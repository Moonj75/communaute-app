import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Blocs from "@/components/Blocs";
import { displayName, getVue } from "@/lib/profil";
import { lireCourrier } from "@/lib/courrier";
import { chargerJoueurs } from "@/lib/donnees";
import Liste from "./Liste";
import Ecrire from "./Ecrire";

export const dynamic = "force-dynamic";
export const metadata = { title: "Courrier · SC Lions d'Eugies" };

/** Mailbox: relances, notifications and messages; the staff writes to players, players answer the staff. */
export default async function Courrier() {
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const moi = (user.email || "").toLowerCase();
  const admin = profil?.role === "admin" && !apercu;
  const [{ messages, erreur }, joueurs] = await Promise.all([lireCourrier(supabase), admin ? chargerJoueurs(supabase) : Promise.resolve([])]);
  const recus = messages.filter((m) => m.a_email === moi);
  const envoyes = messages.filter((m) => m.de_email === moi);
  const staff = admin ? messages.filter((m) => m.pour_staff) : [];
  // One line per account (a family shares one login): « Mongi Rouis », or « Léa & Tom Dupont ».
  const parCompte = new Map<string, string[]>();
  for (const j of joueurs) if (j.actif && j.email) parCompte.set(j.email.toLowerCase(), [...(parCompte.get(j.email.toLowerCase()) || []), j.nom]);
  const comptes = [...parCompte.entries()].map(([email, noms]) => ({ email, nom: noms.join(" & ") })).sort((a, b) => a.nom.localeCompare(b.nom));
  const nonLus = recus.filter((m) => !m.lu).length;
  const nonLusStaff = staff.filter((m) => !m.lu).length;

  return (
    <>
      <Header subtitle="Courrier" profil={profil} name={displayName(profil, user.email)} apercu={apercu} />
      <main className="wrap">
        <section className="hello"><span className="kicker">Courrier</span><h2>Mon courrier</h2><p>Relances, notifications et messages du club.</p></section>
        {erreur ? <p className="notice err">Le courrier n&apos;est pas encore installé : lance le fichier SQL de l&apos;étape 10 dans Supabase.</p> : null}
        <Blocs
          page="Courrier"
          blocs={[
            { id: "recus", titre: "Reçus", ic: "📬", badge: nonLus || null, contenu: <section className="panel"><div className="bd"><Liste messages={recus} vide="Ta boîte est vide pour l'instant." repondre={admin ? null : "staff"} /></div></section> },
            ...(admin ? [{ id: "staff", titre: "Pour le staff", ic: "🛡️", badge: nonLusStaff || null, contenu: <section className="panel"><div className="bd"><Liste messages={staff} vide="Aucun message de joueur." repondre="auteur" comptes={comptes} /></div></section> }] : []),
            { id: "ecrire", titre: admin ? "Écrire à un joueur" : "Écrire au staff", ic: "✍️", contenu: <section className="panel"><div className="bd">{admin ? <Ecrire mode="admin" comptes={comptes} /> : <Ecrire mode="staff" />}</div></section> },
            { id: "envoyes", titre: "Envoyés", ic: "📤", badge: envoyes.length || null, contenu: <section className="panel"><div className="bd"><Liste messages={envoyes} vide="Aucun message envoyé." repondre={null} /></div></section> },
          ]}
        />
      </main>
    </>
  );
}
