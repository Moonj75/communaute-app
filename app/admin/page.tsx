import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { displayName, getSessionProfil } from "@/lib/profil";
import AddForm from "./AddForm";
import Blocs from "@/components/Blocs";
import SyncPanel from "./SyncPanel";
import InviteCell from "./InviteCell";
import { retirerMembre, updateMembre } from "./actions";
import { commencerApercu } from "./apercu";

export const dynamic = "force-dynamic";

type Membre = {
  email: string;
  nom: string;
  prenom: string | null;
  role: "admin" | "joueur";
  actif: boolean;
  synced_at: string | null;
  invite_le: string | null;
};

const euro = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });

export default async function AdminPage() {
  const { supabase, user, profil } = await getSessionProfil();
  if (!user) redirect("/login");
  if (profil?.role !== "admin") redirect("/");

  const [{ data: membres }, { data: profils }, { data: joueurs }] = await Promise.all([
    supabase.from("membres").select("email,nom,prenom,role,actif,synced_at,invite_le").order("nom"),
    supabase.from("profils").select("email"),
    supabase.from("joueurs").select("email,prenom,nom,actif,titulaire,roles,cagnotte"),
  ]);
  type J = { email: string | null; prenom: string | null; nom: string; actif: boolean; titulaire: boolean; roles: string[] | null; cagnotte: number | null };
  const parEmail = new Map<string, J[]>();
  for (const j of (joueurs || []) as J[]) if (j.email) parEmail.set(j.email, [...(parEmail.get(j.email) || []), j]);
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

        <section className="hello"><span className="kicker">Staff</span><h2>Joueurs</h2><p>Liste Notion, comptes de connexion, invitations et aperçu joueur.</p></section>
        <Blocs blocs={[
        { id: "apercu", titre: "Voir comme un joueur", ic: "👁️", contenu: (
        <section className="panel" style={{ borderTop: "3px solid var(--night)" }}>
          <div className="hd">
            <h2>👁️ Voir l&apos;appli comme un joueur</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              Pour tester : tu vois exactement ce que voit ce membre (menu, calendrier, inscriptions, fiche).
            </span>
          </div>
          <div className="bd">
            <form action={commencerApercu} className="addform" style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
              <label className="f">
                Membre
                <select className="input" name="email" required defaultValue="">
                  <option value="" disabled>Choisir un membre…</option>
                  {list
                    .filter((m) => m.email !== (user.email || "").toLowerCase())
                    .map((m) => (
                      <option key={m.email} value={m.email}>
                        {[m.prenom, m.nom].filter(Boolean).join(" ")}
                        {(parEmail.get(m.email)?.length || 0) > 1 ? ` (famille de ${parEmail.get(m.email)!.length})` : ""}
                        {m.actif ? "" : " · non actif (espace découverte)"}
                      </option>
                    ))}
                </select>
              </label>
              <button className="btn primary" type="submit">Lancer l&apos;aperçu →</button>
            </form>
          </div>
        </section>
        ) },

        { id: "notion", titre: "Synchronisation Notion", ic: "🔄", contenu: (
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
        ) },

        { id: "ajouter", titre: "Ajouter un membre", ic: "➕", contenu: (
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
        ) },

        { id: "comptes", titre: "Comptes de connexion", ic: "🔑", badge: list.length, contenu: (
        <section className="panel">
          <div className="hd">
            <h2>Comptes de connexion ({list.length})</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              Rôle et statut modifiables ici ; ils seront écrasés par Notion à la prochaine synchronisation.
            </span>
          </div>
          <div className="bd scroll-x">
            <table className="t ad-t">
              <thead>
                <tr className="ad-th">
                  <th>Nom</th>
                  <th>E-mail</th>
                  <th>Personnes · rôles</th>
                  <th>Accès</th>
                  <th>Statut</th>
                  <th>Connexion</th>
                  <th>Invitation</th>
                  <th title="Voir l'application comme ce membre">Aperçu</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.email}>
                    <td style={{ fontWeight: 700 }}>{[m.prenom, m.nom].filter(Boolean).join(" ")}</td>
                    <td>{m.email}</td>
                    <td>
                      {!parEmail.has(m.email) ? <span className="pill" title="Aucune fiche Notion n'utilise cette adresse">⚠️ sans fiche Notion</span> : null}
                      {(parEmail.get(m.email) || []).map((j) => (
                        <div key={(j.prenom || "") + j.nom} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", padding: "2px 0", opacity: j.actif ? 1 : 0.55 }}>
                          <b>{j.prenom || j.nom}</b>
                          {(parEmail.get(m.email) || []).length > 1 && j.titulaire ? <span className="pill adm">titulaire</span> : null}
                          {(j.roles || []).map((r) => <span key={r} className="pill">{r}</span>)}
                          {j.cagnotte != null ? <span className="pill on num">{euro.format(Number(j.cagnotte))}</span> : null}
                        </div>
                      ))}
                    </td>
                    <td>
                      <form action={updateMembre} className="ad-role">
                        <input type="hidden" name="email" value={m.email} />
                        <select className="input" name="role" defaultValue={m.role}>
                          <option value="joueur">Joueur</option>
                          <option value="admin">Administrateur</option>
                        </select>
                        <button className="ad-ok" type="submit" title="Valider le rôle" aria-label="Valider le rôle">✓</button>
                      </form>
                    </td>
                    <td>
                      <form action={updateMembre}>
                        <input type="hidden" name="email" value={m.email} />
                        <input type="hidden" name="actif" value={m.actif ? "false" : "true"} />
                        <button className="ad-statut" type="submit" title={m.actif ? "Cliquer pour désactiver" : "Cliquer pour réactiver"}>
                          <span className={`pill ${m.actif ? "on" : ""}`}>{m.actif ? "Actif" : "Inactif"}</span>
                        </button>
                      </form>
                    </td>
                    <td className="ad-c">{connected.has(m.email) ? <span className="pill on">✓ connecté</span> : <span className="pill">jamais</span>}</td>
                    <td>
                      <InviteCell email={m.email} prenom={m.prenom} actif={m.actif} connecte={connected.has(m.email)} inviteLe={m.invite_le} />
                    </td>
                    <td>
                      <form action={commencerApercu}>
                        <input type="hidden" name="email" value={m.email} />
                        <button className="ad-oeil" type="submit" title="Voir l'application comme ce membre" aria-label="Voir l'application comme ce membre">👁️</button>
                      </form>
                    </td>
                    <td>
                      {!parEmail.has(m.email) && m.email !== (user.email || "").toLowerCase() ? (
                        <form action={retirerMembre}>
                          <input type="hidden" name="email" value={m.email} />
                          <button className="btn" type="submit" title="Retirer ce compte (ancienne adresse)">🗑️ Retirer</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        ) },
        ]} />
      </main>
    </>
  );
}
