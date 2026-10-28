import Link from "next/link";
import Header from "@/components/Header";
import LoginForm from "./LoginForm";
import Aide from "./Aide";
import type { CasAide } from "./actions";
import { createClient } from "@/lib/supabase/server";

const ERRORS: Record<string, string> = {
  lien: "Ce lien de connexion n'est plus valable (déjà utilisé ou expiré). Demandez-en un nouveau.",
};
const CAS: CasAide[] = ["inconnu", "attente", "archive", "code"];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string; aide?: string; email?: string }> }) {
  const sp = await searchParams;
  const erreur = sp.erreur;
  // Help page: /login?aide=inconnu|attente|archive|code (also when a mail link was refused: erreur=acces).
  let cas = (CAS.includes(sp.aide as CasAide) ? sp.aide : erreur === "acces" ? "inconnu" : null) as CasAide | null;
  let email = (sp.email || "").slice(0, 120);
  // Signed in through a mail link but archived (former member): the page to ask for a comeback.
  if (!cas) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from("profils").select("archive,role").eq("id", user.id).maybeSingle();
      if (p?.archive && p.role !== "admin") { cas = "archive"; email = user.email || ""; }
    }
  }
  return (
    <>
      <Header subtitle="Espace membres" valeurs />
      <div className="login">
        <section className="login-hero">
          <span className="kicker">LEAW · Subbuteo Beyond Borders · Saison 2026 – 2027</span>
          <h2>
            Une équipe.
            <span>Une famille.</span>
            Un objectif.
          </h2>
          <p>L&apos;espace des Lions : ta fiche, ta cagnotte, tes compétitions et le planning du club, au même endroit.</p>
        </section>
        <div className="login-side">
          <section className="panel">
            <div className="bd" style={{ padding: 28 }}>
              {cas ? (
                <Aide cas={cas} email={email} />
              ) : (
                <>
                  <h2>Connexion</h2>
                  <p className="muted" style={{ margin: 0 }}>
                    Entre l&apos;adresse e-mail que tu as donnée au club.
                  </p>
                  <LoginForm error={erreur ? ERRORS[erreur] || ERRORS.lien : undefined} />
                  <Link className="btn ghost" href="/login?aide=code" style={{ marginTop: 10 }}>🆘 Un souci pour te connecter ?</Link>
                </>
              )}
            </div>
          </section>
          <Link className="decouvrir" href="/club">
            <span aria-hidden="true">🦁</span>
            <span><b>Découvrir le club</b><small>Infos et prochains entraînements, sans connexion</small></span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link className="decouvrir" href="/installer">
            <span aria-hidden="true">📲</span>
            <span><b>Installer l&apos;appli</b><small>Sur ton téléphone, en 3 étapes</small></span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </>
  );
}
