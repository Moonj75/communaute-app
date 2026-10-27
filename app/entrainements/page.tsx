import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Blocs from "@/components/Blocs";
import { displayName, getVue } from "@/lib/profil";
import { essayer, lireExercices, lireMembresRoles, lireSeancesPeriode, nomsJoueurs } from "@/lib/club";
import { ROLES, type RoleSeance } from "@/lib/entrainements-types";
import { aujourdhui } from "@/lib/club-types";
import Seance, { type MaFiche } from "@/components/EntSeance";
import Planning from "@/components/EntPlanning";
import Bibliotheque from "@/components/EntBibliotheque";
import FicheExercice from "@/components/EntFiche";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entraînements · SC Lions d'Eugies" };

type Fiche = { notion_id: string; prenom: string | null; nom: string; email: string | null; roles: string[] | null; actif: boolean; archive?: boolean };
const rolesDe = (f: Fiche) => ROLES.filter((r) => (f.roles || []).includes(r.tag)).map((r) => r.id);
const suppsDe = (f: Fiche) => ROLES.filter((r) => (f.roles || []).includes(r.supp)).map((r) => r.id);
const moisPlus = (m: string, n: number) => { const d = new Date(`${m}-15T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7); };
const finMois = (m: string) => { const d = new Date(`${moisPlus(m, 1)}-01T12:00:00Z`); d.setUTCDate(0); return d.toISOString().slice(0, 10); };

/** Trainings: the next session (roles and programme), the monthly planning of roles, the exercise sheets. */
export default async function EntrainementsPage({ searchParams }: { searchParams: Promise<{ ex?: string }> }) {
  const { ex: exId } = await searchParams;
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const admin = profil?.role === "admin" && !apercu;
  const T = aujourdhui();
  const mois = [T.slice(0, 7), moisPlus(T.slice(0, 7), 1)];
  const email = (user.email || "").toLowerCase();
  const [seances, exercices, noms, membresR] = await Promise.all([
    essayer(() => lireSeancesPeriode(`${mois[0]}-01`, finMois(mois[1]))),
    essayer(lireExercices),
    essayer(nomsJoueurs),
    // Roles straight from Notion (1 minute); the app copy if Notion does not answer.
    essayer(lireMembresRoles),
  ]);
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
              contenu: prochaine ? <Seance s={prochaine} noms={equipe ? nomsR : {}} mesFiches={mesFiches} admin={entraineur} entraineur={entraineur} equipe={equipe} exercices={entraineur ? ex : []} /> : <p className="vide">Aucun entraînement programmé pour le moment.</p>,
            },
            ...(equipe ? [{ id: "planning", titre: "Planning des rôles", ic: "📅", contenu: <Planning mois={mois} seances={liste} noms={nomsR} mesFiches={mesFiches} admin={admin} equipe={equipe} pools={pools} /> }] : []),
            ...(entraineur ? [{ id: "exercices", titre: "Fiches d'exercices", ic: "📚", badge: ex.length ? String(ex.length) : null, contenu: <Bibliotheque exercices={ex} peutEditer={entraineur} /> }] : []),
          ]}
        />
      </main>
    </>
  );
}
