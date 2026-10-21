import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { displayName, getSessionProfil } from "@/lib/profil";
import AddForm from "./AddForm";
import Blocs from "@/components/Blocs";
import SyncPanel from "./SyncPanel";
import InviteCell from "./InviteCell";
import { retirerMembre, updateMembre } from "./actions";
import { commencerApercu } from "./apercu";
import { basculerContact } from "./contacts";

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

  const [{ data: membres }, { data: profils }, { data: joueurs }, contactsRes] = await Promise.all([
    supabase.from("membres").select("email,nom,prenom,role,actif,synced_at,invite_le").order("nom"),
    supabase.from("profils").select("email"),
    supabase.from("joueurs").select("email,prenom,nom,actif,titulaire,roles,cagnotte"),
    supabase.from("contacts").select("id,cree_le,prenom,nom,email,telephone,decouverte,message,traite").order("cree_le", { ascending: false }).limit(60),
  ]);
  type Contact = { id: string; cree_le: string; prenom: string; nom: string | null; email: string; telephone: string | null; decouverte: string | null; message: string | null; traite: boolean };
  const contacts = (contactsRes.data || []) as Contact[];
  const aTraiter = contacts.filter((c) => !c.traite).length;
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
        <section className="hello"><span className="kicker">Staff</span><h2>Joueurs</h2><p>Liste Notion, comptes de connexion, invitations et aperçu joueur.</p></section>
        <Blocs blocs={[
        { id: "contacts", titre: "Demandes de contact", ic: "✉️", badge: aTraiter || null, contenu: (
        <section className="panel">
          <div className="hd"><h2>✉️ Demandes de contact des visiteurs</h2><span className="muted small">Envoyées depuis « Nous contacter » sur l&apos;écran d&apos;accueil.</span></div>
          <div className="bd">
            {contactsRes.error ? (
              <p className="notice err">La table des contacts n&apos;existe pas encore : colle le fichier « etape9-contacts.sql » dans Supabase → SQL Editor → Run.</p>
            ) : !contacts.length ? (
              <p className="vide">Aucune demande pour l&apos;instant.</p>
            ) : (
              <ul className="ctl">
                {contacts.map((c) => (
                  <li key={c.id} className={`ctl-l${c.traite ? " fait" : ""}`}>
                    <div className="ctl-t">
                      <b>{[c.prenom, c.nom].filter(Boolean).join(" ")}</b>
                      <small>{new Date(c.cree_le).toLocaleString("fr-BE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Brussels" })}</small>
                    </div>
                    <div className="ctl-c">
                      <a href={`mailto:${c.email}`}>✉️ {c.email}</a>
                      {c.telephone ? <a href={`tel:${c.telephone.replace(/\s/g, "")}`}>📞 {c.telephone}</a> : null}
                    </div>
                    {c.decouverte ? <p className="ctl-d"><span>Découverte du Subbuteo :</span> {c.decouverte}</p> : null}
                    {c.message ? <p className="ctl-m pre">{c.message}</p> : null}
                    <form action={basculerContact}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="traite" value={c.traite ? "0" : "1"} />
                      <button className={`btn${c.traite ? "" : " primary"}`} type="submit">{c.traite ? "↺ Remettre à traiter" : "✓ Marquer traitée"}</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        ) },
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

        { id: "sauvegarde", titre: "Sauvegarde", ic: "💾", contenu: (
        <section className="panel">
          <div className="hd"><h2>Sauvegarde des données de l&apos;appli</h2></div>
          <div className="bd sv">
            <p>Un fichier avec tout ce qui n&apos;est <b>pas</b> dans Notion : comptes, courrier, demandes de contact, joueurs concernés par les formulaires, textes des notifications.</p>
            <a className="btn primary" href="/api/sauvegarde" download>💾 Télécharger la sauvegarde</a>
            <p className="muted small">À faire une fois par mois et à garder sur ton ordinateur (ou une clé USB). Les joueurs, le calendrier et les tâches sont dans Notion : Notion → Paramètres → Exporter tout l&apos;espace de travail. Les classements se réimportent depuis la FBFTS et la FISTF.</p>
          </div>
        </section>
        ) },
        { id: "ajouter", titre: "Ajouter un joueur", ic: "➕", contenu: (
        <section className="panel" style={{ borderTop: "3px solid var(--accent)" }}>
          <div className="hd">
            <h2>Ajouter un joueur</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              Il est créé dans la liste des joueurs Notion et proposé tout de suite partout (compétitions, formulaires). Avec un e-mail, il peut aussi se connecter.
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
            <table className="t cpt-t">
              <thead>
                <tr className="cpt-th">
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
                      <form action={updateMembre} className="cpt-role">
                        <input type="hidden" name="email" value={m.email} />
                        <select className="input" name="role" defaultValue={m.role}>
                          <option value="joueur">Joueur</option>
                          <option value="admin">Administrateur</option>
                        </select>
                        <button className="cpt-ok" type="submit" title="Valider le rôle" aria-label="Valider le rôle">✓</button>
                      </form>
                    </td>
                    <td>
                      <form action={updateMembre}>
                        <input type="hidden" name="email" value={m.email} />
                        <input type="hidden" name="actif" value={m.actif ? "false" : "true"} />
                        <button className="cpt-statut" type="submit" title={m.actif ? "Cliquer pour désactiver" : "Cliquer pour réactiver"}>
                          <span className={`pill ${m.actif ? "on" : ""}`}>{m.actif ? "Actif" : "Inactif"}</span>
                        </button>
                      </form>
                    </td>
                    <td className="cpt-c">{connected.has(m.email) ? <span className="pill on">✓ connecté</span> : <span className="pill">jamais</span>}</td>
                    <td>
                      <InviteCell email={m.email} prenom={m.prenom} actif={m.actif} connecte={connected.has(m.email)} inviteLe={m.invite_le} />
                    </td>
                    <td>
                      <form action={commencerApercu}>
                        <input type="hidden" name="email" value={m.email} />
                        <button className="cpt-oeil" type="submit" title="Voir l'application comme ce membre" aria-label="Voir l'application comme ce membre">👁️</button>
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
