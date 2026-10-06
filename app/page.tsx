import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { displayName, getVue } from "@/lib/profil";
import { prochainesCompetitions } from "@/lib/notion";

export const dynamic = "force-dynamic";

const euro = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function greeting() {
  const h = Number(new Intl.DateTimeFormat("fr-BE", { hour: "numeric", hour12: false, timeZone: "Europe/Brussels" }).format(new Date()));
  return h < 18 && h >= 5 ? "Bonjour" : "Bonsoir";
}

function jours(dateIso: string) {
  const t = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Brussels" }));
  const d = new Date(dateIso.slice(0, 10));
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

export default async function Home() {
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const name = displayName(profil, user.email);
  const isAdmin = profil?.role === "admin";

  const [{ data: fiches }, compets] = await Promise.all([
    supabase.from("joueurs").select("prenom,cagnotte,roles,actif").eq("email", (user.email || "").toLowerCase()),
    prochainesCompetitions(1),
  ]);
  const gens = (fiches || []) as { prenom: string | null; cagnotte: number | null; roles: string[] | null; actif: boolean }[];
  const cagnotte = gens.reduce((s, g) => s + (Number(g.cagnotte) || 0), 0);
  const roles = [...new Set(gens.flatMap((g) => g.roles || []))];
  const next = compets[0];
  const j = next ? jours(next.date) : null;

  return (
    <>
      <Header subtitle="Espace membres · saison 2026–2027" profil={profil} name={name} valeurs apercu={apercu} />
      <main className="wrap">
        <section className="hello">
          <span className="kicker">{isAdmin ? "Staff · Administrateur" : gens.length > 1 ? "Compte famille" : "Joueur"}</span>
          <h2>
            {greeting()}, {name}
          </h2>
          <p>{isAdmin ? "Tout le club est entre tes mains. Prépare la suite." : "Prêt pour la prochaine ? Voici ton tableau de bord."}</p>
        </section>

        <section className="score" aria-label="Tableau de score">
          <div className="main">
            <span className="lbl">Prochaine compétition</span>
            <span className="val num">{j === null ? "—" : j === 0 ? "Jour J" : `J-${j}`}</span>
            <span className="sub">
              {next
                ? `${next.nom} · ${new Date(next.date).toLocaleDateString("fr-BE", { day: "numeric", month: "long" })}${next.lieu ? " · " + next.lieu : ""}`
                : "Calendrier en préparation"}
            </span>
          </div>
          <div>
            <span className="lbl">{gens.length > 1 ? "Cagnotte famille" : "Ma cagnotte"}</span>
            <span className="val num">{gens.length ? euro.format(cagnotte) : "—"}</span>
            <span className="sub">Pour les déplacements</span>
          </div>
          <div>
            <span className="lbl">{gens.length > 1 ? "Famille" : "Mes rôles"}</span>
            <span className="val num">{gens.length > 1 ? gens.length : roles.length || "—"}</span>
            <span className="sub">
              {gens.length > 1 ? gens.map((g) => g.prenom).filter(Boolean).join(" · ") : roles.join(" · ") || "Joueur du club"}
            </span>
          </div>
        </section>

        {!profil ? (
          <div className="notice">
            Ton compte est connecté mais pas encore relié à une fiche du club. Un administrateur doit vérifier ton adresse ({user.email}).
          </div>
        ) : null}

        <p className="sec-title">Mon espace</p>
        <div className="cards">
          <Link className="card dark" href="/fiche">
            <span className="idx">01</span>
            <span className="ic">👤</span>
            <h3>{gens.length > 1 ? "Ma famille" : "Ma fiche"}</h3>
            <p>Infos, cagnotte et rôles au club.</p>
            <span className="go">Ouvrir →</span>
          </Link>
          <Link className="card" href="/inscriptions">
            <span className="idx">02</span>
            <span className="ic">🏁</span>
            <h3>Mes inscriptions</h3>
            <p>Répondre aux compétitions et voir mes déplacements.</p>
            <span className="go">Répondre →</span>
          </Link>
          <Link className="card" href="/calendrier">
            <span className="idx">03</span>
            <span className="ic">📅</span>
            <h3>Calendrier</h3>
            <p>Toutes les compétitions de la saison, mois par mois.</p>
            <span className="go">Voir →</span>
          </Link>
          <div className="card off club">
            <span className="idx">04</span>
            <span className="ic">🎯</span>
            <h3>Entraînements</h3>
            <p>Séances du vendredi, présences et exercices.</p>
            <span className="soon">Bientôt</span>
          </div>
        </div>

        {isAdmin ? (
          <>
            <p className="sec-title">Staff</p>
            <div className="cards">
              <Link className="card gold" href="/admin">
                <span className="idx">05</span>
                <span className="ic">🗂️</span>
                <h3>Joueurs</h3>
                <p>Synchroniser avec Notion, gérer les accès, inviter.</p>
                <span className="go">Gérer →</span>
              </Link>
              <Link className="card gold" href="/staff/inscriptions">
                <span className="idx">06</span>
                <span className="ic">📊</span>
                <h3>Tableau de bord</h3>
                <p>Inscriptions par évènement, relances, logistique.</p>
                <span className="go">Analyser →</span>
              </Link>
              <Link className="card gold" href="/staff/planning">
                <span className="idx">07</span>
                <span className="ic">🗓️</span>
                <h3>Planning</h3>
                <p>Tâches, rappels, calendrier et feuille de route.</p>
                <span className="go">Organiser →</span>
              </Link>
            </div>
          </>
        ) : null}

        <p className="foot">Connecté en tant que {user.email}.</p>
      </main>
    </>
  );
}
