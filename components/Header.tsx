import Link from "next/link";
import type { Profil } from "@/lib/profil";
import Nav from "./Nav";
import MesureEntete from "./MesureEntete";
import { quitterApercu } from "@/app/admin/apercu";

export default function Header({
  subtitle,
  profil,
  name,
  valeurs = false,
  apercu = null,
}: {
  subtitle: string;
  profil?: Profil | null;
  name?: string;
  valeurs?: boolean;
  apercu?: { email: string; nom: string } | null;
}) {
  return (
    <>
      <div className="entete" id="entete">
      {apercu ? (
        <form action={quitterApercu} className="apercu-bar">
          <span>
            👁️ Aperçu joueur : <b>{apercu.nom}</b> <small>({apercu.email})</small> — tu vois exactement ce qu&apos;il voit.
          </span>
          <button className="btn" type="submit">Quitter l&apos;aperçu</button>
        </form>
      ) : null}
      <header className="top">
        <div className="wrap">
          <Link href="/" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="crest" src="/crest.png" alt="Logo LEAW – Lions Eugies Around the World" width={86} height={86} />
            <div>
              <h1>
                SC Lions <b>d&apos;Eugies</b>
              </h1>
              <span className="tag">Lions Eugies Around the World</span>
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
                <button className="btn" type="submit">Déconnexion</button>
              </form>
            </div>
          ) : null}
        </div>
      </header>
      {name ? <Nav isAdmin={profil?.role === "admin"} /> : null}
      </div>
      <MesureEntete />
      {valeurs || !name ? (
      <div className="values" aria-label="Nos valeurs">
        <div className="wrap">
          <span>Équipe</span>
          <span>Famille</span>
          <span>Force</span>
          <span>Détermination</span>
          <span>Compétition</span>
        </div>
      </div>
      ) : null}
    </>
  );
}
