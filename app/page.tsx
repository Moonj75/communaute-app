import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { displayName, getSessionProfil } from "@/lib/profil";

export const dynamic = "force-dynamic";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("fr-BE", { hour: "numeric", hour12: false, timeZone: "Europe/Brussels" }).format(new Date()));
  return h < 18 && h >= 5 ? "Bonjour" : "Bonsoir";
}

export default async function Home() {
  const { user, profil } = await getSessionProfil();
  if (!user) redirect("/login");
  const name = displayName(profil, user.email);
  const isAdmin = profil?.role === "admin";

  return (
    <>
      <Header subtitle="Espace membres · saison 2026–2027" profil={profil} name={name} />
      <main className="wrap">
        <section className="hello">
          <h2>
            {greeting()}, {name} 🦁
          </h2>
          <p>
            {isAdmin
              ? "Vous êtes administrateur : vous avez accès à la gestion du club."
              : "Bienvenue dans votre espace joueur."}
          </p>
        </section>

        {!profil ? (
          <div className="notice">
            Votre compte est connecté mais pas encore relié à une fiche du club. Un administrateur doit vérifier
            votre adresse ({user.email}).
          </div>
        ) : null}

        <p className="sec-title">Mon espace</p>
        <div className="cards">
          <div className="card off">
            <span className="soon">Étape 2</span>
            <span className="ic">👤</span>
            <h3>Ma fiche</h3>
            <p>Mes informations, ma cagnotte, mes rôles au club.</p>
          </div>
          <div className="card off">
            <span className="soon">Étape 3</span>
            <span className="ic">🏁</span>
            <h3>Mes inscriptions</h3>
            <p>Répondre aux compétitions et voir mes déplacements.</p>
          </div>
          <div className="card off club">
            <span className="soon">Bientôt</span>
            <span className="ic">🎯</span>
            <h3>Entraînements</h3>
            <p>Séances du vendredi, présences et exercices.</p>
          </div>
        </div>

        {isAdmin ? (
          <>
            <p className="sec-title">Administration</p>
            <div className="cards">
              <Link className="card gold" href="/admin">
                <span className="ic">🗂️</span>
                <h3>Membres</h3>
                <p>Ajouter les joueurs autorisés à se connecter et choisir leur rôle.</p>
              </Link>
              <div className="card off gold">
                <span className="soon">Étape 4</span>
                <span className="ic">📊</span>
                <h3>Tableau de bord</h3>
                <p>Inscriptions par évènement, relances, objectifs.</p>
              </div>
              <div className="card off gold">
                <span className="soon">Étape 4</span>
                <span className="ic">🗓️</span>
                <h3>Planning</h3>
                <p>Tâches, rappels, calendrier et feuille de route.</p>
              </div>
            </div>
          </>
        ) : null}

        <p className="foot">Connecté en tant que {user.email}.</p>
      </main>
    </>
  );
}
