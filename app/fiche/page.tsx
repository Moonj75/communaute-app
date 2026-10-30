import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { displayName, getVue } from "@/lib/profil";
import Blocs from "@/components/Blocs";
import Notifs from "@/components/Notifs";
import { CarteJoueur, COLS, type Fiche, type PlacesVivantes } from "./CarteJoueur";
import { lireEvenementsLies, lireHistoriques } from "@/lib/cagnotte-db";
import { listeDef } from "@/lib/classements-types";
import { MesClassements } from "@/components/club/Classements";
import { lireExtraits } from "@/lib/classements-lire";
import { essayer, lireCalendrier, lirePalmares } from "@/lib/club";
import { avecDates, libSaison, placeDe, sansTirets, triResultats, triVitrine } from "@/lib/palmares-types";
import { paysResultat } from "@/lib/drapeaux";
import { PalmaresJoueur } from "@/components/Palmares";

export const dynamic = "force-dynamic";

const euro = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });

export default async function FichePage() {
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const email = (user.email || "").toLowerCase();
  const lire = (cols: string) =>
    supabase.from("joueurs").select(cols).eq("email", email).order("titulaire", { ascending: false }).order("prenom");
  // Newer columns may not exist yet if a SQL step was not run: fall back gracefully.
  let res = await lire(COLS + ",photo_path,classement_belge,classement_international,palmares,cagnotte_groupe,date_naissance");
  if (res.error) res = await lire(COLS + ",photo_path,classement_belge,classement_international,palmares,cagnotte_groupe");
  if (res.error) res = await lire(COLS + ",photo_path,classement_belge,classement_international,palmares");
  if (res.error) res = await lire(COLS + ",photo_path");
  if (res.error) res = await lire(COLS);
  const fiches0 = ((res.data || []) as unknown) as Fiche[];
  // Palmarès (Notion « Palmarès du club »): the card's scrolling band shows the titles and finals.
  // The calendar gives the day, the place (flag) and the right season of results written with a year only.
  const [palmaR, calP] = await Promise.all([essayer(lirePalmares), essayer(lireCalendrier)]);
  const palma = avecDates(palmaR.data || [], calP.data || []);
  const sesResultats = (id: string) => palma.filter((r) => r.joueurs.includes(sansTirets(id))).sort(triResultats);
  // The card's scrolling band: victories first (newest first), then finals, then semi-finals — 20 at most.
  const tropheesDe = (id: string) =>
    sesResultats(id).filter((r) => r.statut === "Validé" && (placeDe(r) || 99) <= 3).sort(triVitrine).slice(0, 20)
      .map((r) => ({ place: placeDe(r), equipe: r.parEquipe || Boolean(r.equipe), pays: paysResultat(r), texte: `${r.competition}${r.categorie ? ` (${r.categorie})` : ""} · ${libSaison(r.saison)}${r.parEquipe || r.equipe ? " · 👥 équipe" : ""}` }));
  const fiches = fiches0;
  const famille = fiches.length > 1;
  const synced = fiches.map((f) => f.synced_at).filter(Boolean).sort().pop();

  const paths = fiches.map((f) => f.photo_path).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from("photos").createSignedUrls(paths, 60 * 60);
    (data || []).forEach((d) => d.path && d.signedUrl && urls.set(d.path, d.signedUrl));
  }
  const extraits = await Promise.all(fiches.map((f) => lireExtraits(supabase, f.notion_id, 1)));
  // Places read from the imported rankings (not from Notion, which can be out of date).
  const places: PlacesVivantes[] = fiches.map((f, i) => {
    const miennes = extraits[i].map((x) => x.lignes.find((l) => l.joueur_id === f.notion_id)).filter((l): l is NonNullable<typeof l> => Boolean(l));
    const fb = miennes.find((l) => l.liste === "FBFTS");
    const open = miennes.find((l) => l.liste === "WR-Open");
    const cat = miennes.filter((l) => l.liste.startsWith("WR-") && l.liste !== "WR-Open" && l.liste !== "WR-Teams").sort((a, b) => a.rang - b.rang)[0];
    return {
      national: fb ? { rang: fb.rang, categorie: fb.categorie, suivante: fb.categorie_suivante } : null,
      open: open?.rang ?? null,
      categorie: cat ? { rang: cat.rang, nom: listeDef(cat.liste).court } : null,
    };
  });
  const aClassements = extraits.some((x) => x.length);
  // Kitty history of each fiche (own, or the whole shared kitty): read with the server key, limited to this account's fiches.
  const [cags0, evenements] = await Promise.all([lireHistoriques(fiches.map((f) => ({ id: f.notion_id, groupe: f.cagnotte_groupe || null })), supabase), lireEvenementsLies(supabase)]);
  const cags = cags0.map((c) => ({ ...c, evenements }));
  // A shared kitty (« Famille Devreese ») is counted once.
  const vus = new Set<string>();
  const total = fiches.reduce((s, f) => {
    if (f.cagnotte_groupe) { if (vus.has(f.cagnotte_groupe)) return s; vus.add(f.cagnotte_groupe); }
    return s + (Number(f.cagnotte) || 0);
  }, 0);

  return (
    <>
      <Header subtitle={famille ? "Ma famille au club" : "Ma fiche joueur"} profil={profil} name={displayName(profil, user.email)} apercu={apercu} />
      <main className="wrap">
        <section className="hello">
          <span className="kicker">{famille ? "Compte famille" : "Joueur"}</span>
          <h2>{famille ? "Ma famille" : "Ma fiche"}</h2>
          <p>
            {famille
              ? `${fiches.length} personnes rattachées à ${user.email} · cagnotte totale ${euro.format(total)}.`
              : "Ta carte de joueur du club. Ajoute ta photo !"}
          </p>
        </section>

        {fiches.length === 0 ? (
          <div className="notice">Ta fiche n&apos;est pas encore disponible. Un administrateur doit synchroniser la liste des joueurs.</div>
        ) : null}
        <Blocs
          blocs={[
            ...fiches.flatMap((f, i) => [
              {
                id: f.notion_id.slice(0, 8),
                titre: [f.prenom, f.nom].filter(Boolean).join(" "),
                ic: f.titulaire || !famille ? "🦁" : "🐾",
                badge: f.categorie || null,
                contenu: <CarteJoueur f={f} trophees={tropheesDe(f.notion_id)} famille={famille} photoUrl={f.photo_path ? urls.get(f.photo_path) || null : null} places={aClassements ? places[i] : undefined} cag={cags[i]} />,
              },
              {
                id: `pa-${f.notion_id.slice(0, 8)}`,
                titre: famille ? `Palmarès · ${f.prenom || f.nom}` : "Mon palmarès",
                ic: "🏅",
                badge: sesResultats(f.notion_id).filter((r) => r.statut === "Validé" && r.rang === "Vainqueur").length || null,
                contenu: <PalmaresJoueur resultats={sesResultats(f.notion_id)} />,
              },
              {
                id: `cl-${f.notion_id.slice(0, 8)}`,
                titre: famille ? `Classements · ${f.prenom || f.nom}` : "Mes classements",
                ic: "📊",
                badge: extraits[i].length ? `#${Math.min(...extraits[i].map((x) => x.lignes.find((l) => l.joueur_id === f.notion_id)?.rang || 9999))}` : null,
                contenu: <MesClassements extraits={extraits[i]} moi={f.notion_id} />,
              },
            ]),
            { id: "notifications", titre: "Notifications", ic: "🔔", contenu: <Notifs /> },
          ]}
        />

        <p className="foot">
          Une information est fausse ? Préviens un administrateur du club : elle sera corrigée dans la liste officielle.
          {synced ? ` Mise à jour le ${new Date(synced).toLocaleDateString("fr-BE", { timeZone: "Europe/Brussels" })}.` : ""}
        </p>
      </main>
    </>
  );
}
