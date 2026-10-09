import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Blocs from "@/components/Blocs";
import { displayName, getSessionProfil } from "@/lib/profil";
import { LISTES, SOURCES, libelleMois, nomComplet, type LigneClassement } from "@/lib/classements-types";
import { FormAuto, FormFichier } from "./Formulaires";

export const dynamic = "force-dynamic";

type Import = { source: "fbfts" | "fistf"; mois: string; libelle: string; nb: number; importe_le: string; par: string | null };

export default async function ClassementsStaff() {
  const { supabase, user, profil } = await getSessionProfil();
  if (!user) redirect("/login");
  if (profil?.role !== "admin") redirect("/");

  const [impR, eugR, joueursR] = await Promise.all([
    supabase.from("classements_imports").select("*"),
    supabase.from("classements").select("liste,rang,nom,prenom,joueur_id,mois").eq("eugies", true).not("prenom", "is", null).order("rang"),
    supabase.from("joueurs").select("notion_id,prenom,nom,actif"),
  ]);
  const tablesOk = !impR.error;
  const imports = (impR.data || []) as Import[];
  const eug = (eugR.data || []) as LigneClassement[];
  const joueurs = (joueursR.data || []) as { notion_id: string; prenom: string | null; nom: string; actif: boolean }[];
  const nonReconnus = eug.filter((l) => !l.joueur_id);
  const classes = new Set(eug.map((l) => l.joueur_id).filter(Boolean));
  const sansClassement = joueurs.filter((j) => j.actif && !classes.has(j.notion_id));
  const imp = (s: "fbfts" | "fistf") => imports.find((i) => i.source === s);
  const moisDefaut = new Date().toISOString().slice(0, 7);

  const checks = [
    { ok: tablesOk, txt: "Script Supabase « etape7-classements » lancé" },
    { ok: Boolean(process.env.CRON_SECRET && process.env.SUPABASE_SECRET_KEY), txt: "CRON_SECRET et SUPABASE_SECRET_KEY dans Vercel (mise à jour automatique)" },
    { ok: Boolean(process.env.NOTION_TOKEN), txt: "NOTION_TOKEN dans Vercel (écriture des places dans Notion)" },
  ];

  return (
    <>
      <Header subtitle="Staff · classements" profil={profil} name={displayName(profil, user.email)} />
      <main className="wrap">
        <section className="hello">
          <span className="kicker">Staff</span>
          <h2>Classements</h2>
          <p>
            Mis à jour tout seuls le 1<sup>er</sup> de chaque mois (vers 8 h) : site → appli → Notion. Si un classement sort plus tard dans le mois, clique sur « Vérifier maintenant ». <Link href="/club/classements">Voir les classements →</Link>
          </p>
        </section>
        <Blocs
          initial={!tablesOk ? "reglages" : undefined}
          blocs={[
            {
              id: "etat",
              titre: "Mise à jour",
              ic: "🔄",
              badge: imports.length ? libelleMois(imports.map((i) => i.mois).sort().pop()) : "!",
              contenu: (
                <section className="panel">
                  <div className="bd">
                    <div className="imp-src">
                      {(["fbfts", "fistf"] as const).map((s) => {
                        const i = imp(s);
                        return (
                          <article key={s} className={`imp-c${i ? " ok" : ""}`}>
                            <span className="fl-l">{SOURCES[s].nom}</span>
                            <b className="imp-m">{i ? libelleMois(i.mois, true) : "Jamais importé"}</b>
                            <span className="muted small">
                              {i
                                ? `${i.nb} lignes · le ${new Date(i.importe_le).toLocaleString("fr-BE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Brussels" })} · ${i.par || ""}`
                                : "Lance « Vérifier maintenant » ou importe le fichier."}
                            </span>
                            <a href={SOURCES[s].page} target="_blank" rel="noopener" className="small">Page officielle ↗</a>
                          </article>
                        );
                      })}
                    </div>
                    <FormAuto />
                  </div>
                </section>
              ),
            },
            {
              id: "fichier",
              titre: "Importer un fichier",
              ic: "⬆️",
              contenu: (
                <section className="panel">
                  <div className="bd">
                    <p className="muted small">
                      Si un site refuse le téléchargement automatique : ouvre la page officielle, télécharge le fichier Excel et dépose-le ici. Tout le reste (appli + Notion) se fait
                      tout seul.
                    </p>
                    <FormFichier moisDefaut={moisDefaut} />
                  </div>
                </section>
              ),
            },
            {
              id: "joueurs",
              titre: "Joueurs reconnus",
              ic: "🦁",
              badge: classes.size || null,
              contenu: (
                <section className="panel">
                  <div className="bd">
                    <p className="mini-t">Lignes « Eugies » non reliées à une fiche ({nonReconnus.length})</p>
                    {nonReconnus.length ? (
                      <ul className="imp-l">
                        {nonReconnus.map((l, k) => (
                          <li key={k}>
                            <b>{nomComplet(l)}</b> <span className="muted small">· {LISTES.find((x) => x.id === l.liste)?.court} #{l.rang}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted small">Tous les joueurs d&apos;Eugies des classements sont reliés à leur fiche. 👍</p>
                    )}
                    <p className="small muted">Un nom n&apos;est pas reconnu ? Corrige l&apos;orthographe du nom ou du prénom dans Notion (Liste des joueurs), synchronise, puis « Tout réimporter ».</p>
                    <p className="mini-t">Joueurs actifs sans aucun classement ({sansClassement.length})</p>
                    <p className="small">{sansClassement.map((j) => [j.prenom, j.nom].filter(Boolean).join(" ")).join(" · ") || "—"}</p>
                  </div>
                </section>
              ),
            },
            {
              id: "reglages",
              titre: "Réglages",
              ic: "⚙️",
              badge: checks.every((c) => c.ok) ? "OK" : "!",
              contenu: (
                <section className="panel">
                  <div className="bd">
                    <ul className="checks">
                      {checks.map((c) => (
                        <li key={c.txt} className={c.ok ? "ok" : "ko"}>
                          {c.ok ? "✅" : "⬜"} {c.txt}
                        </li>
                      ))}
                    </ul>
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
