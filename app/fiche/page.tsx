import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { displayName, getSessionProfil } from "@/lib/profil";

export const dynamic = "force-dynamic";

type Fiche = {
  email: string;
  nom: string;
  prenom: string | null;
  role: "admin" | "joueur";
  actif: boolean;
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

export default async function FichePage() {
  const { supabase, user, profil } = await getSessionProfil();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("membres")
    .select("email,nom,prenom,role,actif,roles,cagnotte,telephone,vehicule,categorie,serie,synced_at")
    .eq("email", (user.email || "").toLowerCase())
    .maybeSingle();
  const f = data as Fiche | null;
  const name = displayName(profil, user.email);
  const full = f ? [f.prenom, f.nom].filter(Boolean).join(" ") : name;
  const initials = full
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <>
      <Header subtitle="Ma fiche joueur" profil={profil} name={name} />
      <main className="wrap">
        <a href="/" className="muted" style={{ textDecoration: "none", fontWeight: 700 }}>
          ← Retour à l&apos;accueil
        </a>

        {!f ? (
          <div className="notice">Votre fiche n&apos;est pas encore disponible. Un administrateur doit synchroniser la liste des joueurs.</div>
        ) : (
          <div className="fiche">
            <section className="panel id-card">
              <div className="avatar" aria-hidden="true">{initials}</div>
              <div style={{ minWidth: 0 }}>
                <h2 className="display">{full}</h2>
                <p className="muted" style={{ margin: "2px 0 8px" }}>{f.email}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span className={`pill ${f.role === "admin" ? "adm" : ""}`}>{f.role === "admin" ? "Administrateur" : "Joueur"}</span>
                  <span className={`pill ${f.actif ? "on" : ""}`}>{f.actif ? "Actif" : "Inactif"}</span>
                </div>
              </div>
            </section>

            <section className="panel cagnotte">
              <span className="fl-l">Ma cagnotte</span>
              <span className="big num">{f.cagnotte != null ? euro.format(Number(f.cagnotte)) : "—"}</span>
              <span className="muted" style={{ fontSize: 13 }}>Montant disponible pour vos déplacements.</span>
            </section>

            <section className="panel">
              <div className="hd"><h2>Mes rôles au club</h2></div>
              <div className="bd" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(f.roles || []).length ? (
                  (f.roles || []).map((r) => (
                    <span key={r} className="role-chip">{r}</span>
                  ))
                ) : (
                  <span className="muted">Aucun rôle attribué pour le moment.</span>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="hd"><h2>Mes informations</h2></div>
              <div className="bd">
                <Ligne label="Téléphone" value={f.telephone} />
                <Ligne label="Véhicule" value={f.vehicule} />
                <Ligne label="Catégorie" value={f.categorie} />
                <Ligne label="Série" value={f.serie} />
              </div>
            </section>
          </div>
        )}

        <p className="foot">
          Une information est fausse ? Prévenez un administrateur du club : elle sera corrigée dans la liste officielle.
          {f?.synced_at
            ? ` Mise à jour le ${new Date(f.synced_at).toLocaleDateString("fr-BE", { timeZone: "Europe/Brussels" })}.`
            : ""}
        </p>
      </main>
    </>
  );
}
