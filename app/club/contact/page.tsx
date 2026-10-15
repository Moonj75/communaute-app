import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import Formulaire from "./Formulaire";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact · SC Lions d'Eugies", description: "Contacte le club de Subbuteo d'Eugies." };

export default async function Contact() {
  let connecte = false;
  try {
    const { data } = await (await createClient()).auth.getUser();
    connecte = Boolean(data.user);
  } catch {}
  return (
    <>
      <Header subtitle="Contact" connecte={connecte} />
      <main className="wrap ct-wrap">
        <section className="ct-carte">
          <header className="ct-tete">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/crest.png" alt="" width={56} height={56} />
            <div>
              <span className="kicker">SC Lions d&apos;Eugies</span>
              <h2>Contacte-nous</h2>
              <p>Laisse tes coordonnées : un membre du club te répond rapidement.</p>
            </div>
          </header>
          <Formulaire />
        </section>
      </main>
    </>
  );
}
