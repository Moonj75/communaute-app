import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Blocs from "@/components/Blocs";
import { displayName, getVue } from "@/lib/profil";
import { essayer, lireExercices, lireMembresRoles, lireSeancesPeriode, nomsJoueurs } from "@/lib/club";
import { ROLES, finMois, moisPlus, type RoleSeance } from "@/lib/entrainements-types";
import { aujourdhui } from "@/lib/club-types";
import Seance, { type MaFiche } from "@/components/EntSeance";
import Planning from "@/components/EntPlanning";
import Bibliotheque from "@/components/EntBibliotheque";
import FicheExercice from "@/components/EntFiche";
import Equipe, { type MembreEquipe } from "@/components/EntEquipe";
import { assurerMois } from "@/lib/entrainements-cron";
import { vendredis } from "@/lib/entrainements-types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entraînements · SC Lions d'Eugies" };

type Fiche = { notion_id: string; prenom: string | null; nom: string; email: string | null; roles: string[] | null; actif: boolean; archive?: boolean };
const rolesDe = (f: Fiche) => ROLES.filter((r) => (f.roles || []).includes(r.tag)).map((r) => r.id);
const suppsDe = (f: Fiche) => ROLES.filter((r) => (f.roles || []).includes(r.supp)).map((r) => r.id);

/** Trainings: the next session (roles and programme), the monthly planning of roles, the exercise sheets. */
export default async function EntrainementsPage({ searchParams }: { searchParams: Promise<{ ex?: string }> }) {
  const { ex: exId } = await searchParams;
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const admin = profil?.role === "admin" && !apercu;
  const T = aujourdhui();
  const mois = [T.slice(0, 7), moisPlus(T.slice(0, 7), 1)];
  const email = (user.email || "").toLowerCase();
  let [seances, exercices, noms, membresR] = await Promise.all([
    essayer(() => lireSeancesPeriode(`${mois[0]}-01`, finMois(mois[1]))),
    essayer(lireExercices),
    essayer(nomsJoueurs),
    // Roles straight from Notion (1 minute); the app copy if Notion does not answer.
    essayer(lireMembresRoles),
  ]);
  // Always one month ahead: a Friday missing this month (from today) or next month is created now.
  const manque = mois.some((m) => vendredis(m).some((j) => j >= T && !(seances.data || []).some((s) => s.date.slice(0, 10) === j)));
  if (manque && !seances.erreur) {
    const n = (await Promise.all(mois.map((m) => assurerMois(m, T).catch(() => 0)))).reduce((a, b) => a + b, 0);
    if (n) seances = await essayer(() => lireSeancesPeriode(`${mois[0]}-01`, finMois(mois[1]), true));
  }
  const membres: Fiche[] = membresR.data || (((await supabase.from("joueurs").select("*")).data || []) as Fiche[]);
  const nomDe = (f: Fiche) => [f.prenom, f.nom].filter(Boolean).join(" ");
  const mesFiches: MaFiche[] = membres.filter((f) => f.email === email && !f.archive).map((f) => ({ id: f.notion_id, nom: nomDe(f), roles: rolesDe(f), supps: suppsDe(f) }));
  const tous = membres.filter((f) => f.actif && !f.archive);
  // Staff list: the people on the role first (★), then the substitutes (🔁), then everybody else.
  const pools = Object.fromEntries(ROLES.map((r) => {
    const rang = (f: Fiche) => (rolesDe(f).includes(r.id) ? 0 : suppsDe(f).includes(r.id) ? 1 : 2);
    const liste = (admin ? tous : tous.filter((f) => rang(f) === 0))
      .sort((a, b) => rang(a) - rang(b) || nomDe(a).localeCompare(nomDe(b), "fr"))
      .map((f) => ({ id: f.notion_id, nom: `${["★ ", "🔁 ", ""][rang(f)]}${nomDe(f)}` }));
    return [r.id, liste];
  })) as Record<RoleSeance, { id: string; nom: string }[]>;
  const nomsR = Object.fromEntries(noms.data || []);
  const liste = seances.data || [];
  const ex = exercices.data || [];
  const prochaine = liste.find((s) => s.date.slice(0, 10) >= T);
  // Exercise sheets and programme: trainers (and their substitutes) only. Planning and roles: the training crew.
  const entraineur = admin || mesFiches.some((f) => f.roles.includes("entraineur") || f.supps.includes("entraineur"));
  const equipe = admin || mesFiches.some((f) => f.roles.length > 0 || f.supps.length > 0);
  // Staff: everybody active, with his state on each role (★ holder, 🔁 substitute).
  const equipeAdmin: MembreEquipe[] = admin
    ? tous.map((f) => ({ id: f.notion_id, nom: nomDe(f), etats: Object.fromEntries(ROLES.map((r) => [r.id, rolesDe(f).includes(r.id) ? "titulaire" : suppsDe(f).includes(r.id) ? "suppleant" : "aucun"])) as MembreEquipe["etats"] })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
    : [];
  const aMoi = prochaine && ROLES.some((r) => prochaine.postes[r.id].ids.some((id) => mesFiches.some((f) => f.id === id) && !prochaine.postes[r.id].ok));

  // One exercise sheet (link « /entrainements?ex=… »).
  if (exId && !entraineur) redirect("/entrainements");
  const fiche = exId ? ex.find((e) => e.id === exId || e.id.replace(/-/g, "") === exId.replace(/-/g, "")) : null;
  if (fiche)
    return (
      <>
        <Header subtitle={`Exercice ${fiche.code || ""}`} profil={profil} name={displayName(profil, user.email)} apercu={apercu} />
        <main className="wrap"><FicheExercice e={fiche} peutEditer={entraineur} /></main>
      </>
    );

  return (
    <>
      <Header subtitle="Entraînements" profil={profil} name={displayName(profil, user.email)} apercu={apercu} />
      <main className="wrap">
        {seances.erreur ? <div className="notice err">{seances.erreur}</div> : null}
        <Blocs
          page="Entraînements"
          blocs={[
            {
              id: "prochain",
              titre: "Prochain entraînement",
              ic: "🎯",
              badge: aMoi ? "!" : null,
              contenu: prochaine ? <Seance s={prochaine} noms={nomsR} mesFiches={mesFiches} admin={entraineur} entraineur={entraineur} equipe={equipe} staff={admin} exercices={entraineur ? ex : []} /> : <p className="vide">Aucun entraînement programmé pour le moment.</p>,
            },
            ...(equipe ? [{ id: "planning", titre: "Planning des rôles", ic: "📅", contenu: <Planning mois={mois} seances={liste} noms={nomsR} mesFiches={mesFiches} admin={admin} pools={pools} /> }] : []),
            ...(admin ? [{ id: "equipe", titre: "Équipe et rôles", ic: "👥", badge: String(equipeAdmin.filter((m) => ROLES.some((r) => m.etats[r.id] !== "aucun")).length), contenu: <Equipe membres={equipeAdmin} /> }] : []),
            ...(entraineur ? [{ id: "exercices", titre: "Fiches d'exercices", ic: "📚", badge: ex.length ? String(ex.length) : null, contenu: <Bibliotheque exercices={ex} peutEditer={entraineur} /> }] : []),
          ]}
        />
      </main>
    </>
  );
}
