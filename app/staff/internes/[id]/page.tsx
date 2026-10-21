import { notFound, redirect } from "next/navigation";
import Header from "@/components/Header";
import Blocs from "@/components/Blocs";
import { displayName, getSessionProfil } from "@/lib/profil";
import { lireCompet } from "@/lib/internes-db";
import { chargerJoueurs } from "@/lib/donnees";
import { decrireEtape, TYPES } from "@/lib/internes";
import VueCompet from "@/components/internes/VueCompet";
import Repartition from "../Repartition";
import Boutons from "./Boutons";

export const dynamic = "force-dynamic";

/** Staff: one competition — choose the players and groups, then type the scores; the rest follows by itself. */
export default async function GererCompet({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, profil } = await getSessionProfil();
  if (!user) redirect("/login");
  if (profil?.role !== "admin") redirect("/");
  const d = await lireCompet(supabase, id);
  if (!d) notFound();
  const { c, groupes, matchs } = d;
  const joueurs = c.statut === "preparation" ? (await chargerJoueurs(supabase)).map((j) => ({ id: j.notionId, nom: j.nom, actif: j.actif })) : [];

  const etapes = (
    <section className="panel"><div className="bd">
      <ol className="ci-plan">{c.etapes.map((e, i) => <li key={i} className={i === c.etape && c.statut === "en_cours" ? "on" : undefined}><b>{e.nom}</b> <span className="muted small">{decrireEtape(e, i === c.etapes.length - 1)}</span></li>)}</ol>
      <Boutons id={c.id} enCours={c.statut === "en_cours"} etape={c.etapes[c.etape]?.nom || ""} />
    </div></section>
  );

  return (
    <>
      <Header subtitle={`Staff · ${TYPES[c.type].nom}`} profil={profil} name={displayName(profil, user.email)} />
      <main className="wrap">
        <section className="hello"><span className="kicker">{TYPES[c.type].ic} {TYPES[c.type].nom}{c.saison ? ` · ${c.saison}` : ""}</span><h2>{c.nom}</h2></section>
        <Blocs
          blocs={[
            c.statut === "preparation"
              ? { id: "depart", titre: "Poules de départ", ic: "👥", contenu: <section className="panel"><div className="hd"><h2>{c.etapes[0].nom} : les joueurs et les poules</h2></div><div className="bd"><Repartition id={c.id} etape={c.etapes[0]} joueurs={joueurs} /></div></section> }
              : { id: "matchs", titre: "Matchs et classements", ic: "⚽", contenu: <VueCompet c={c} groupes={groupes} matchs={matchs} etape={sp.e != null ? Number(sp.e) : undefined} editable lien={(k) => `/staff/internes/${c.id}?e=${k}`} /> },
            { id: "etapes", titre: "Étapes et réglages", ic: "⚙️", contenu: etapes },
          ]}
        />
      </main>
    </>
  );
}
