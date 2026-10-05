import Header from "@/components/Header";
import { confirmLogin } from "./actions";

export const dynamic = "force-dynamic";

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash, type } = await searchParams;
  return (
    <>
      <Header subtitle="Espace membres" />
      <div className="login">
        <section className="panel">
          <div className="bd" style={{ padding: 24 }}>
            <h2>Bienvenue 🦁</h2>
            {token_hash ? (
              <form action={confirmLogin}>
                <p className="muted" style={{ margin: 0 }}>
                  Dernière étape : confirmez votre connexion à l&apos;espace membres du club.
                </p>
                <input type="hidden" name="token_hash" value={token_hash} />
                <input type="hidden" name="type" value={type || "email"} />
                <button className="btn primary" type="submit" style={{ minHeight: 54, fontSize: 16 }}>
                  Entrer dans mon espace
                </button>
              </form>
            ) : (
              <div className="notice err" style={{ marginTop: 16 }}>
                Ce lien est incomplet. <a href="/login">Demandez un nouveau lien</a>.
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
