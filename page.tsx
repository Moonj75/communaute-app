import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Blocs from "@/components/Blocs";
import { displayName, getVue } from "@/lib/profil";
import { essayer, lireExercices, lireSeancesPeriode, nomsJoueurs } from "@/lib/club";
import { ROLES, type RoleSeance } from "@/lib/entrainements-types";
import { aujourdhui } from "@/lib/club-types";
import Seance, { type MaFiche } from "@/components/entrainements/Seance";
import Planning from "@/components/entrainements/Planning";
import Bibliotheque from "@/components/entrainements/Bibliotheque";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entraînements · SC Lions d'Eugies" };

type Fiche = { notion_id: string; prenom: string | null; nom: string; email: string | null; roles: string[] | null; actif: boolean; archive?: boolean };
const rolesDe = (f: Fiche) => ROLES.filter((r) => (f.roles || []).includes(r.tag)).map((r) => r.id);
const suppsDe = (f: Fiche) => ROLES.filter((r) => (f.roles || []).includes(r.supp)).map((r) => r.id);
const moisPlus = (m: string, n: number) => { const d = new Date(`${m}-15T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7); };
const finMois = (m: string) => { const d = new Date(`${moisPlus(m, 1)}-01T12:00:00Z`); d.setUTCDate(0); return d.toISOString().slice(0, 10); };

/** Trainings: the next session (roles and programme), the monthly planning of roles, the exercise sheets. */
export default async function EntrainementsPage() {
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const admin = profil?.role === "admin" && !apercu;
  const T = aujourdhui();
  const mois = [T.slice(0, 7), moisPlus(T.slice(0, 7), 1)];
  const [seances, exercices, noms, mesR, tousR] = await Promise.all([
    essayer(() => lireSeancesPeriode(`${mois[0]}-01`, finMois(mois[1]))),
    essayer(lireExercices),
    essayer(nomsJoueurs),
    supabase.from("joueurs").select("*").eq("email", (user.email || "").toLowerCase()),
    admin ? supabase.from("joueurs").select("*") : Promise.resolve({ data: [] }),
  ]);
  const mesFiches: MaFiche[] = ((mesR.data || []) as Fiche[]).filter((f) => !f.archive).map((f) => ({ id: f.notion_id, nom: [f.prenom, f.nom].filter(Boolean).join(" "), roles: rolesDe(f), supps: suppsDe(f) }));
  const tous = ((tousR.data || []) as Fiche[]).filter((f) => f.actif && !f.archive);
  const pools = Object.fromEntries(ROLES.map((r) => [r.id, tous.filter((f) => rolesDe(f).includes(r.id)).map((f) => ({ id: f.notion_id, nom: [f.prenom, f.nom].filter(Boolean).join(" ") })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"))])) as Record<RoleSeance, { id: string; nom: string }[]>;
  const nomsR = Object.fromEntries(noms.data || []);
  const liste = seances.data || [];
  const ex = exercices.data || [];
  const prochaine = liste.find((s) => s.date.slice(0, 10) >= T);
  const entraineur = admin || mesFiches.some((f) => f.roles.includes("entraineur"));
  const equipe = admin || mesFiches.some((f) => f.roles.length > 0 || f.supps.length > 0);
  const aMoi = prochaine && ROLES.some((r) => prochaine.postes[r.id].ids.some((id) => mesFiches.some((f) => f.id === id) && !prochaine.postes[r.id].ok));

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
              contenu: prochaine ? <Seance s={prochaine} noms={nomsR} mesFiches={mesFiches} admin={entraineur} entraineur={entraineur} exercices={ex} /> : <p className="vide">Aucun entraînement programmé pour le moment.</p>,
            },
            { id: "planning", titre: "Planning des rôles", ic: "📅", contenu: <Planning mois={mois} seances={liste} noms={nomsR} mesFiches={mesFiches} admin={admin} equipe={equipe} pools={pools} /> },
            { id: "exercices", titre: "Fiches d'exercices", ic: "📚", badge: ex.length ? String(ex.length) : null, contenu: <Bibliotheque exercices={ex} peutEditer={entraineur} /> },
          ]}
        />
      </main>
    </>
  );
}
