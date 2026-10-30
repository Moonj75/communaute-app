// 🏅 PAGE PALMARÈS : ce fichier va dans le dossier « app/palmares » (github.com/Moonj75/communaute-app/upload/main/app/palmares).
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { displayName, getVue } from "@/lib/profil";
import { essayer, lireCalendrier, lireMembresRoles, lirePalmares, nomsJoueurs } from "@/lib/club";
import { ROLE_PALMARES, avecDates, sansArchives, sansTirets } from "@/lib/palmares-types";
import { estCompetition, estRetenu } from "@/lib/club-types";
import { paysEv } from "@/lib/drapeaux";
import { AValider, AjoutResultat, ImportHistorique, PalmaresPages, type CompetCal } from "@/components/Palmares";

export const dynamic = "force-dynamic";
export const metadata = { title: "Palmarès · SC Lions d'Eugies" };

/** The club's palmarès: honours board and every result; add a result; results to validate (responsable / staff). */
export default async function PalmaresPage({ searchParams }: { searchParams: Promise<{ c?: string; d?: string }> }) {
  // From the notification sent the day after a competition: the form is already filled with it.
  const sp = await searchParams;
  const pre = { competition: (sp.c || "").slice(0, 150), date: /^\d{4}-\d{2}-\d{2}$/.test(sp.d || "") ? sp.d! : "" };
  const { user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const admin = profil?.role === "admin" && !apercu;
  const email = (user.email || "").toLowerCase();
  const [res, nomsR, membresR, calR] = await Promise.all([essayer(lirePalmares), essayer(nomsJoueurs), essayer(lireMembresRoles), essayer(lireCalendrier)]);
  // The day of each result, found in the club calendar when it was not typed (to show the month).
  // Archived players stay in Notion but are no longer shown in the app.
  const archives = (membresR.data || []).filter((m) => m.archive).map((m) => m.notion_id);
  const resultats = avecDates(sansArchives(res.data || [], archives), calR.data || []);
  const noms: Record<string, string> = {};
  for (const [k, v] of nomsR.data || []) noms[sansTirets(k)] = v;
  const membres = membresR.data || [];
  const miennes = membres.filter((m) => m.email === email && !m.archive);
  const responsable = admin || miennes.some((m) => (m.roles || []).includes(ROLE_PALMARES));
  const joueurs = membres
    .filter((m) => !m.archive)
    .map((m) => ({ id: sansTirets(m.notion_id), nom: [m.prenom, m.nom].filter(Boolean).join(" ") || noms[sansTirets(m.notion_id)] || "?", archive: m.archive }))
    .sort((a, b) => Number(a.archive) - Number(b.archive) || a.nom.localeCompare(b.nom, "fr"));
  // The form only offers real competitions of the calendar (type « Compétition », not a holiday, a flea market
  // or a club party; not cancelled, and the club went), already started, from the last two years.
  const depuis = new Date(Date.now() - 730 * 86400000).toISOString().slice(0, 10);
  const auj = new Date().toISOString().slice(0, 10);
  const competitions: CompetCal[] = (calR.data || [])
    .filter((e) => e.date && e.date.slice(0, 10) >= depuis && e.date.slice(0, 10) <= auj && estCompetition(e) && estRetenu(e) && !e.jourSpecial)
    .map((e) => ({ id: e.id, nom: e.nom, date: e.date!.slice(0, 10), fin: e.fin ? e.fin.slice(0, 10) : null, lieu: e.lieu || null, pays: paysEv(e) }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const aValider = resultats.filter((r) => r.statut === "À valider");

  return (
    <>
      <Header subtitle="Palmarès du club" profil={profil} name={displayName(profil, user.email)} apercu={apercu} />
      <main className="wrap">
        {res.erreur ? <div className="notice err">{res.erreur}</div> : null}
        <PalmaresPages
          resultats={resultats}
          noms={noms}
          gerer={responsable}
          initial={pre.competition ? "ajouter" : undefined}
          outils={[
            { id: "ajouter", titre: "Ajouter", ic: "➕", contenu: <AjoutResultat joueurs={joueurs} competitions={competitions} responsable={responsable} moi={miennes.map((m) => sansTirets(m.notion_id))} initial={pre} /> },
            ...(responsable ? [{ id: "valider", titre: "À valider", ic: "⏳", badge: aValider.length ? String(aValider.length) : null, contenu: <AValider liste={aValider} noms={noms} /> }] : []),
            ...(admin && (res.data || []).length < 519 ? [{ id: "import", titre: "Historique", ic: "📥", contenu: <ImportHistorique deja={(res.data || []).length} /> }] : []),
          ]}
        />
      </main>
    </>
  );
}
