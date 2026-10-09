import Link from "next/link";
import Header from "@/components/Header";
import LoginForm from "./LoginForm";

const ERRORS: Record<string, string> = {
  lien: "Ce lien de connexion n'est plus valable (déjà utilisé ou expiré). Demandez-en un nouveau.",
  acces: "Votre adresse n'est pas reconnue par le club. Contactez un administrateur.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
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
              <h2>Connexion</h2>
              <p className="muted" style={{ margin: 0 }}>
                Entre l&apos;adresse e-mail que tu as donnée au club.
              </p>
              <LoginForm error={erreur ? ERRORS[erreur] || ERRORS.lien : undefined} />
            </div>
          </section>
          <Link className="decouvrir" href="/club">
            <span aria-hidden="true">🦁</span>
            <span><b>Découvrir le club</b><small>Infos, calendrier et entraînements, sans connexion</small></span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </>
  );
}
