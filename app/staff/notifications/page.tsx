import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Blocs from "@/components/Blocs";
import { displayName, getSessionProfil } from "@/lib/profil";
import { pushPret } from "@/lib/push";
import { essayer, lireCalendrier } from "@/lib/club";
import { aujourdhui, dateCourte, estCompetition, estRetenu } from "@/lib/club-types";
import FormEnvoi from "./FormEnvoi";
import Cles from "./Cles";

export const dynamic = "force-dynamic";

const LIBELLES: Record<string, string> = {
  ouverture: "🏁 Ouverture des inscriptions",
  rappel3: "⏰ Rappel J-3",
  confirmation: "🔒 Période de confirmation",
  veille: "📍 Veille de compétition",
  taches: "✅ Tâches du jour",
  decision: "🗳️ Décision à prendre",
};

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ cible?: string }> }) {
  const { supabase, user, profil } = await getSessionProfil();
  if (!user) redirect("/login");
  if (profil?.role !== "admin") redirect("/");
  const sp = await searchParams;
  const T = aujourdhui();

  const [subsR, membresR, journalR, cal] = await Promise.all([
    supabase.from("push_abonnements").select("email,appareil,created_at"),
    supabase.from("membres").select("email,prenom,nom"),
    supabase.from("push_journal").select("cle,envoye_le,nb").order("envoye_le", { ascending: false }).limit(15),
    essayer(lireCalendrier),
  ]);
  const tablesOk = !subsR.error;
  const subs = (subsR.data || []) as { email: string; appareil: string | null; created_at: string }[];
  const noms = new Map(((membresR.data || []) as { email: string; prenom: string | null; nom: string }[]).map((m) => [m.email, [m.prenom, m.nom].filter(Boolean).join(" ")]));
  const parPersonne = new Map<string, string[]>();
  subs.forEach((s) => parPersonne.set(s.email, [...(parPersonne.get(s.email) || []), s.appareil || "Appareil"]));
  const evs = (cal.data || []).filter((e) => e.date && e.date >= T && estCompetition(e) && estRetenu(e) && !e.jourSpecial).slice(0, 8);
  const journal = (journalR.data || []) as { cle: string; envoye_le: string; nb: number }[];

  const checks = [
    { ok: tablesOk, txt: "Script Supabase « etape6 » lancé (tables des notifications)" },
    { ok: pushPret(), txt: "Clés NEXT_PUBLIC_VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY dans Vercel" },
    { ok: Boolean(process.env.CRON_SECRET), txt: "CRON_SECRET dans Vercel (envois automatiques du matin)" },
    { ok: Boolean(process.env.SUPABASE_SECRET_KEY), txt: "SUPABASE_SECRET_KEY dans Vercel (envois automatiques du matin)" },
  ];
  const pret = checks.every((c) => c.ok);

  return (
    <>
      <Header subtitle="Staff · notifications" profil={profil} name={displayName(profil, user.email)} />
      <main className="wrap">
        <section className="hello">
          <span className="kicker">Staff</span>
          <h2>Notifications</h2>
          <p>Prévenir les joueurs sur leur téléphone. Les rappels automatiques partent chaque matin vers 9 h.</p>
        </section>
        <Blocs
          initial={sp.cible ? "envoyer" : !pret ? "reglages" : undefined}
          blocs={[
            {
              id: "envoyer",
              titre: "Envoyer",
              ic: "📣",
              contenu: (
                <section className="panel">
                  <div className="bd">
                    <FormEnvoi evenements={evs.map((e) => ({ id: e.id, nom: `${e.nom} — ${dateCourte(e.date)}` }))} cible={sp.cible} />
                  </div>
                </section>
              ),
            },
            {
              id: "abonnes",
              titre: "Abonnés",
              ic: "📱",
              badge: parPersonne.size,
              contenu: parPersonne.size ? (
                <section className="panel">
                  <div className="bd scroll-x">
                    <table className="t">
                      <thead><tr><th>Personne</th><th>Appareils</th></tr></thead>
                      <tbody>
                        {[...parPersonne.entries()].map(([email, app]) => (
                          <tr key={email}>
                            <td><b>{noms.get(email) || email}</b></td>
                            <td className="small">{app.join(" · ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : (
                <p className="vide">Personne n&apos;a encore activé les notifications. Chaque joueur le fait dans <b>Ma fiche → Notifications</b>.</p>
              ),
            },
            {
              id: "auto",
              titre: "Envois automatiques",
              ic: "🤖",
              contenu: (
                <section className="panel">
                  <div className="bd">
                    <ul className="auto-l">
                      <li>🏁 <b>Ouverture des inscriptions</b> → tous les joueurs actifs</li>
                      <li>⏰ <b>3 jours avant la date limite</b> → ceux qui n&apos;ont pas répondu</li>
                      <li>🔒 <b>Début de la période de confirmation</b> → ceux qui ont répondu mais pas encore validé</li>
                      <li>📍 <b>La veille d&apos;une compétition</b> → ceux qui ont répondu « Oui »</li>
                      <li>✅ <b>Tâches du jour</b> (+ retards le lundi) → le staff</li>
                      <li>🗳️ <b>Décision à prendre (8 mois avant)</b> → le staff</li>
                    </ul>
                    <p className="mini-t">Derniers envois</p>
                    {journal.length ? (
                      <table className="t">
                        <tbody>
                          {journal.map((j) => (
                            <tr key={j.cle}>
                              <td>{LIBELLES[j.cle.split(":")[0]] || j.cle}</td>
                              <td className="small muted">{new Date(j.envoye_le).toLocaleString("fr-BE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Brussels" })}</td>
                              <td className="num">{j.nb} appareil(s)</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="muted small">Aucun envoi automatique pour l&apos;instant.</p>
                    )}
                  </div>
                </section>
              ),
            },
            {
              id: "reglages",
              titre: "Réglages",
              ic: "⚙️",
              badge: pret ? "OK" : "!",
              contenu: (
                <section className="panel">
                  <div className="bd">
                    <ul className="checks">
                      {checks.map((c) => (
                        <li key={c.txt} className={c.ok ? "ok" : "ko"}>
                          <span aria-hidden="true">{c.ok ? "✅" : "⬜"}</span> {c.txt}
                        </li>
                      ))}
                    </ul>
                    {!pushPret() || !process.env.CRON_SECRET ? (
                      <>
                        <p className="mini-t">Créer les clés</p>
                        <Cles />
                      </>
                    ) : null}
                  </div>
                </section>
              ),
            },
          ]}
        />
      </main>
    </>
  );
}
