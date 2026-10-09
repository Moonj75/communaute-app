import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { displayName, getVue } from "@/lib/profil";
import Blocs from "@/components/Blocs";
import Notifs from "@/components/Notifs";
import { CarteJoueur, COLS, type Fiche, type PlacesVivantes } from "./CarteJoueur";
import { listeDef } from "@/lib/classements-types";
import { MesClassements } from "@/components/club/Classements";
import { lireExtraits } from "@/lib/classements-lire";

export const dynamic = "force-dynamic";

const euro = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });

export default async function FichePage() {
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const email = (user.email || "").toLowerCase();
  const lire = (cols: string) =>
    supabase.from("joueurs").select(cols).eq("email", email).order("titulaire", { ascending: false }).order("prenom");
  // Newer columns may not exist yet if a SQL step was not run: fall back gracefully.
  let res = await lire(COLS + ",photo_path,classement_belge,classement_international,palmares");
  if (res.error) res = await lire(COLS + ",photo_path");
  if (res.error) res = await lire(COLS);
  const fiches = ((res.data || []) as unknown) as Fiche[];
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
  const total = fiches.reduce((s, f) => s + (Number(f.cagnotte) || 0), 0);

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
                contenu: <CarteJoueur f={f} famille={famille} photoUrl={f.photo_path ? urls.get(f.photo_path) || null : null} places={aClassements ? places[i] : undefined} />,
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
