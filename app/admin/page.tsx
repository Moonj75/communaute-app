import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { displayName, getSessionProfil } from "@/lib/profil";
import AddForm from "./AddForm";
import SyncPanel from "./SyncPanel";
import { updateMembre } from "./actions";

export const dynamic = "force-dynamic";

type Membre = {
  email: string;
  nom: string;
  prenom: string | null;
  role: "admin" | "joueur";
  actif: boolean;
  roles: string[] | null;
  cagnotte: number | null;
  synced_at: string | null;
};

const euro = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });

export default async function AdminPage() {
  const { supabase, user, profil } = await getSessionProfil();
  if (!user) redirect("/login");
  if (profil?.role !== "admin") redirect("/");

  const [{ data: membres }, { data: profils }] = await Promise.all([
    supabase.from("membres").select("email,nom,prenom,role,actif,roles,cagnotte,synced_at").order("nom"),
    supabase.from("profils").select("email"),
  ]);
  const connected = new Set((profils || []).map((p: { email: string }) => p.email));
  const list = (membres || []) as Membre[];
  const lastSync = list.reduce<string | null>((m, x) => (x.synced_at && (!m || x.synced_at > m) ? x.synced_at : m), null);

  return (
    <>
      <Header subtitle="Administration · membres" profil={profil} name={displayName(profil, user.email)} />
      <main className="wrap">
        <a href="/" className="muted" style={{ textDecoration: "none", fontWeight: 700 }}>
          ← Retour à l&apos;accueil
        </a>

        <section className="panel" style={{ borderTop: "3px solid var(--gold)" }}>
          <div className="hd">
            <h2>Liste des joueurs Notion</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              Notion reste la référence : modifiez-y les joueurs, puis synchronisez.
            </span>
          </div>
          <div className="bd">
            <SyncPanel last={lastSync} />
          </div>
        </section>

        <section className="panel" style={{ borderTop: "3px solid var(--accent)" }}>
          <div className="hd">
            <h2>Ajouter un membre à la main</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              Seules les adresses de cette liste peuvent se connecter.
            </span>
          </div>
          <div className="bd">
            <AddForm />
          </div>
        </section>

        <section className="panel">
          <div className="hd">
            <h2>Membres ({list.length})</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              Rôle et statut modifiables ici ; ils seront écrasés par Notion à la prochaine synchronisation.
            </span>
          </div>
          <div className="bd scroll-x">
            <table className="t">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>E-mail</th>
                  <th>Rôles club</th>
                  <th>Cagnotte</th>
                  <th>Accès</th>
                  <th>Statut</th>
                  <th>Connexion</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.email}>
                    <td style={{ fontWeight: 700 }}>{[m.prenom, m.nom].filter(Boolean).join(" ")}</td>
                    <td>{m.email}</td>
                    <td>{(m.roles || []).length ? (m.roles || []).map((r) => <span key={r} className="pill" style={{ marginRight: 4 }}>{r}</span>) : <span className="muted">—</span>}</td>
                    <td className="num" style={{ whiteSpace: "nowrap" }}>{m.cagnotte != null ? euro.format(Number(m.cagnotte)) : <span className="muted">—</span>}</td>
                    <td>
                      <form action={updateMembre} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="hidden" name="email" value={m.email} />
                        <select className="input" name="role" defaultValue={m.role} style={{ minHeight: 38, width: "auto" }}>
                          <option value="joueur">Joueur</option>
                          <option value="admin">Administrateur</option>
                        </select>
                        <button className="btn" type="submit" style={{ minHeight: 38 }}>
                          OK
                        </button>
                      </form>
                    </td>
                    <td>
                      <form action={updateMembre}>
                        <input type="hidden" name="email" value={m.email} />
                        <input type="hidden" name="actif" value={m.actif ? "false" : "true"} />
                        <button className="btn" type="submit" style={{ minHeight: 34, padding: "0 10px" }} title={m.actif ? "Désactiver" : "Réactiver"}>
                          <span className={`pill ${m.actif ? "on" : ""}`}>{m.actif ? "Actif" : "Inactif"}</span>
                        </button>
                      </form>
                    </td>
                    <td>{connected.has(m.email) ? <span className="pill on">✓ déjà connecté</span> : <span className="pill">jamais</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
