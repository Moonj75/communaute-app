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
      <Header subtitle="Espace membres" />
      <div className="login">
        <section className="panel">
          <div className="bd" style={{ padding: 24 }}>
            <h2>Connexion</h2>
            <p className="muted" style={{ margin: 0 }}>
              Entrez l&apos;adresse e-mail que vous avez donnée au club.
            </p>
            <LoginForm error={erreur ? ERRORS[erreur] || ERRORS.lien : undefined} />
          </div>
        </section>
      </div>
    </>
  );
}
