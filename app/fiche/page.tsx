import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { displayName, getVue } from "@/lib/profil";

export const dynamic = "force-dynamic";

type Fiche = {
  notion_id: string;
  email: string;
  nom: string;
  prenom: string | null;
  actif: boolean;
  titulaire: boolean;
  roles: string[] | null;
  cagnotte: number | null;
  telephone: string | null;
  vehicule: string | null;
  categorie: string | null;
  serie: string | null;
  synced_at: string | null;
};

const euro = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });

function Ligne({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="fl">
      <span className="fl-l">{label}</span>
      <span className="fl-v">{value || <span className="muted">—</span>}</span>
    </div>
  );
}

function CarteJoueur({ f, famille }: { f: Fiche; famille: boolean }) {
  const full = [f.prenom, f.nom].filter(Boolean).join(" ");
  const initials = full
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <article className="fiche">
      <section className="panel id-card">
        <div className="avatar" aria-hidden="true">{initials}</div>
        <div style={{ minWidth: 0 }}>
          <h2 className="display">{full}</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {famille ? (
              <span className={`pill ${f.titulaire ? "adm" : ""}`}>{f.titulaire ? "Titulaire du compte" : "Membre de la famille"}</span>
            ) : null}
            <span className={`pill ${f.actif ? "on" : ""}`}>{f.actif ? "Actif" : "Inactif"}</span>
          </div>
          {(f.roles || []).length ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {(f.roles || []).map((r) => (
                <span key={r} className="role-chip">{r}</span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel cagnotte">
        <span className="fl-l">Cagnotte</span>
        <span className="big num">{f.cagnotte != null ? euro.format(Number(f.cagnotte)) : "—"}</span>
        <span className="muted" style={{ fontSize: 13 }}>Montant disponible pour les déplacements.</span>
      </section>

      <section className="panel" style={{ gridColumn: "1 / -1" }}>
        <div className="bd" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", columnGap: 28 }}>
          <Ligne label="Téléphone" value={f.telephone} />
          <Ligne label="Véhicule" value={f.vehicule} />
          <Ligne label="Catégorie" value={f.categorie} />
          <Ligne label="Série" value={f.serie} />
        </div>
      </section>
    </article>
  );
}

export default async function FichePage() {
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("joueurs")
    .select("notion_id,email,nom,prenom,actif,titulaire,roles,cagnotte,telephone,vehicule,categorie,serie,synced_at")
    .eq("email", (user.email || "").toLowerCase())
    .order("titulaire", { ascending: false })
    .order("prenom");
  const fiches = (data || []) as Fiche[];
  const famille = fiches.length > 1;
  const synced = fiches.map((f) => f.synced_at).filter(Boolean).sort().pop();

  return (
    <>
      <Header subtitle={famille ? "Ma famille au club" : "Ma fiche joueur"} profil={profil} name={displayName(profil, user.email)} apercu={apercu} />
      <main className="wrap">
        <a href="/" className="muted" style={{ textDecoration: "none", fontWeight: 700 }}>
          ← Retour à l&apos;accueil
        </a>

        {famille ? (
          <section className="hello">
            <h2>Compte famille</h2>
            <p>
              {fiches.length} personnes sont rattachées à votre adresse {user.email}.
            </p>
          </section>
        ) : null}

        {fiches.length === 0 ? (
          <div className="notice">
            Votre fiche n&apos;est pas encore disponible. Un administrateur doit synchroniser la liste des joueurs.
          </div>
        ) : (
          fiches.map((f) => <CarteJoueur key={f.notion_id} f={f} famille={famille} />)
        )}

        <p className="foot">
          Une information est fausse ? Prévenez un administrateur du club : elle sera corrigée dans la liste officielle.
          {synced ? ` Mise à jour le ${new Date(synced).toLocaleDateString("fr-BE", { timeZone: "Europe/Brussels" })}.` : ""}
        </p>
      </main>
    </>
  );
}
