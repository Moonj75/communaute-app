import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Blocs from "@/components/Blocs";
import { displayName, getVue } from "@/lib/profil";
import { libelleSaison, tranches } from "@/lib/categories";
import Coordonnees, { type PersonneProfil } from "./Coordonnees";
import ChangerEmail from "./ChangerEmail";
import type { DemandeEmail } from "@/lib/changement-email";

export const dynamic = "force-dynamic";

const BASE = "notion_id,prenom,nom,categorie,telephone,titulaire";
const PLUS = ",date_naissance,adresse,code_postal,ville,nationalite,licence,code_fistf";

/** « Mon profil »: contact details of the member (and of each person of his family). */
export default async function ProfilPage() {
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const email = (user.email || "").toLowerCase();
  const lire = (cols: string) => supabase.from("joueurs").select(cols).eq("email", email).order("titulaire", { ascending: false }).order("prenom");
  let res = await lire(BASE + PLUS);
  const complet = !res.error;
  if (res.error) res = await lire(BASE);
  const gens = ((res.data || []) as unknown) as PersonneProfil[];
  const famille = gens.length > 1;
  // Request to change the account's e-mail (step 19): the waiting one, or a refusal of the last 30 days.
  const { data: dem } = await supabase.from("demandes_email").select("*").eq("ancien_email", email).order("cree_le", { ascending: false }).limit(1);
  const derniere = ((dem || []) as DemandeEmail[])[0] || null;
  const enAttente = derniere?.statut === "en_attente" ? derniere : null;
  const refus = derniere?.statut === "refuse" && derniere.traite_le && Date.now() - new Date(derniere.traite_le).getTime() < 30 * 864e5 ? derniere : null;

  return (
    <>
      <Header subtitle="Mon profil" profil={profil} name={displayName(profil, user.email)} apercu={apercu} />
      <main className="wrap">
        <section className="hello">
          <span className="kicker">Moi</span>
          <h2>Mon profil</h2>
          <p>{famille ? "Les coordonnées de chaque personne de ta famille." : "Tes coordonnées pour le club."} Elles restent visibles uniquement par toi et le staff.</p>
        </section>
        {!complet ? <p className="notice">Certaines coordonnées (date de naissance, adresse…) ne sont pas encore copiées : un administrateur doit lancer le script « etape18-profil » dans Supabase.</p> : null}
        {!gens.length ? <p className="notice">Ton profil n&apos;est pas encore disponible. Un administrateur doit synchroniser la liste des joueurs.</p> : null}
        <Blocs
          blocs={[
            ...gens.map((g) => ({ id: `p-${g.notion_id.slice(0, 8)}`, titre: famille ? [g.prenom, g.nom].filter(Boolean).join(" ") : "Mes coordonnées", ic: "🪪", contenu: <Coordonnees p={g} email={email} nouvelEmail={enAttente?.nouvel_email || null} /> })),
            { id: "email", titre: "Adresse e-mail", ic: "📧", badge: enAttente ? "⏳" : null, contenu: <ChangerEmail email={email} demande={enAttente} refus={refus} /> },
            {
              id: "categories",
              titre: "Catégories d'âge",
              ic: "🏷️",
              contenu: (
                <section className="panel">
                  <div className="hd"><h2>🏷️ Catégories d&apos;âge · saison {libelleSaison()}</h2></div>
                  <div className="bd">
                    <ul className="pf-tr">
                      {tranches().map((t) => <li key={t.cat}><b>{t.cat}</b><span>{t.regle}</span></li>)}
                      <li><b>Open</b><span>Tous les autres joueurs</span></li>
                    </ul>
                    <p className="small muted">Les dates changent d&apos;un an chaque saison (au 1er septembre). Ta catégorie est calculée toute seule avec ta date de naissance.</p>
                  </div>
                </section>
              ),
            },
          ]}
        />
      </main>
    </>
  );
}
