import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Blocs from "@/components/Blocs";
import { displayName, getSessionProfil } from "@/lib/profil";
import { lireCompetitions } from "@/lib/internes-db";
import { TYPES } from "@/lib/internes";
import Assistant from "./Assistant";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compétitions internes · Staff" };

const STATUT = { preparation: "En préparation", en_cours: "En cours", terminee: "Terminée" } as const;

/** Staff: the club's competitions (championnat, coupe) and the creation of a new one. */
export default async function Internes() {
  const { supabase, user, profil } = await getSessionProfil();
  if (!user) redirect("/login");
  if (profil?.role !== "admin") redirect("/");
  const { competitions, erreur } = await lireCompetitions(supabase);

  const liste = (
    <section className="panel">
      <div className="hd"><h2>Compétitions du club</h2><Link className="btn" href="/internes">👀 Vue des joueurs</Link></div>
      <div className="bd">
        {erreur ? <p className="notice err">Lance d&apos;abord le script Supabase « etape13 » (compétitions internes).</p> : null}
        {!competitions.length && !erreur ? <p className="vide">Aucune compétition pour l&apos;instant : crée la première dans « Nouvelle ».</p> : null}
        <ul className="ci-liste">
          {competitions.map((c) => (
            <li key={c.id}>
              <Link href={`/staff/internes/${c.id}`} className={`ci-li s-${c.statut}`}>
                <span className="ci-li-ic" aria-hidden="true">{TYPES[c.type].ic}</span>
                <span className="ci-li-t"><b>{c.nom}</b><small>{TYPES[c.type].nom} · {c.etapes.length} étape{c.etapes.length > 1 ? "s" : ""}{c.statut === "en_cours" ? ` · en cours : ${c.etapes[c.etape]?.nom}` : ""}{c.champion ? ` · 🏆 ${c.champion}` : ""}</small></span>
                <span className={`ci-statut s-${c.statut}`}>{STATUT[c.statut]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );

  return (
    <>
      <Header subtitle="Staff · compétitions internes" profil={profil} name={displayName(profil, user.email)} />
      <main className="wrap">
        <section className="hello"><span className="kicker">Staff</span><h2>Compétitions internes</h2><p>Championnat et coupe du club : poules, matchs, classements, tout s&apos;enchaîne.</p></section>
        <Blocs
          initial={!competitions.length ? "nouvelle" : undefined}
          blocs={[
            { id: "liste", titre: "Compétitions", ic: "🏆", badge: competitions.length || null, contenu: liste },
            { id: "nouvelle", titre: "Nouvelle", ic: "✨", contenu: <section className="panel"><div className="bd"><Assistant /></div></section> },
          ]}
        />
      </main>
    </>
  );
}
