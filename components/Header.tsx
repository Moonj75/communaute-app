import Link from "next/link";
import type { Profil } from "@/lib/profil";

export default function Header({
  subtitle,
  profil,
  name,
}: {
  subtitle: string;
  profil?: Profil | null;
  name?: string;
}) {
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="brand" style={{ color: "inherit", textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="crest" src="/crest.png" alt="Logo Lions Eugies Subbuteo Club" width={84} height={84} />
          <div>
            <h1>SC Lions d&apos;Eugies</h1>
            <span className="tag">Subbuteo Club · depuis 2009</span>
            <p>{subtitle}</p>
          </div>
        </Link>
        {name ? (
          <div className="who">
            <span className="name">{name}</span>
            {profil ? (
              <span className={`badge ${profil.role}`}>{profil.role === "admin" ? "Administrateur" : "Joueur"}</span>
            ) : null}
            <form action="/auth/signout" method="post">
              <button className="btn" type="submit">Se déconnecter</button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}
