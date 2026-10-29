// 🏅 PAGE PALMARÈS : ce fichier va dans le dossier « app/palmares » (github.com/Moonj75/communaute-app/upload/main/app/palmares).
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Blocs from "@/components/Blocs";
import { displayName, getVue } from "@/lib/profil";
import { essayer, lireCalendrier, lireMembresRoles, lirePalmares, nomsJoueurs } from "@/lib/club";
import { ROLE_PALMARES, sansTirets } from "@/lib/palmares-types";
import { AValider, AjoutResultat, ImportHistorique, PalmaresClub } from "@/components/Palmares";

export const dynamic = "force-dynamic";
export const metadata = { title: "Palmarès · SC Lions d'Eugies" };

/** The club's palmarès: honours board and every result; add a result; results to validate (responsable / staff). */
export default async function PalmaresPage() {
  const { user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const admin = profil?.role === "admin" && !apercu;
  const email = (user.email || "").toLowerCase();
  const [res, nomsR, membresR, calR] = await Promise.all([essayer(lirePalmares), essayer(nomsJoueurs), essayer(lireMembresRoles), essayer(lireCalendrier)]);
  const resultats = res.data || [];
  const noms: Record<string, string> = {};
  for (const [k, v] of nomsR.data || []) noms[sansTirets(k)] = v;
  const membres = membresR.data || [];
  const miennes = membres.filter((m) => m.email === email && !m.archive);
  const responsable = admin || miennes.some((m) => (m.roles || []).includes(ROLE_PALMARES));
  const joueurs = membres
    .map((m) => ({ id: sansTirets(m.notion_id), nom: [m.prenom, m.nom].filter(Boolean).join(" ") || noms[sansTirets(m.notion_id)] || "?", archive: m.archive }))
    .sort((a, b) => Number(a.archive) - Number(b.archive) || a.nom.localeCompare(b.nom, "fr"));
  // Competitions of the last 14 months (and the coming ones), proposed in the form.
  const depuis = new Date(Date.now() - 425 * 86400000).toISOString().slice(0, 10);
  const competitions = (calR.data || []).filter((e) => (e.date || "") >= depuis).map((e) => ({ nom: e.nom, date: (e.date || "").slice(0, 10) })).sort((a, b) => b.date.localeCompare(a.date));
  const aValider = resultats.filter((r) => r.statut === "À valider");

  return (
    <>
      <Header subtitle="Palmarès du club" profil={profil} name={displayName(profil, user.email)} apercu={apercu} />
      <main className="wrap">
        {res.erreur ? <div className="notice err">{res.erreur}</div> : null}
        <Blocs
          page="Palmarès"
          blocs={[
            { id: "club", titre: "Palmarès du club", ic: "🏆", badge: String(resultats.filter((r) => r.statut === "Validé" && r.rang === "Vainqueur").length), contenu: <PalmaresClub resultats={resultats} noms={noms} gerer={responsable} /> },
            { id: "ajouter", titre: "Ajouter un résultat", ic: "➕", contenu: <AjoutResultat joueurs={joueurs} competitions={competitions} responsable={responsable} moi={miennes.map((m) => sansTirets(m.notion_id))} /> },
            ...(responsable ? [{ id: "valider", titre: "À valider", ic: "⏳", badge: aValider.length ? String(aValider.length) : null, contenu: <AValider liste={aValider} noms={noms} /> }] : []),
            ...(admin && resultats.length < 519 ? [{ id: "import", titre: "Historique", ic: "📥", contenu: <ImportHistorique deja={resultats.length} /> }] : []),
          ]}
        />
      </main>
    </>
  );
}
