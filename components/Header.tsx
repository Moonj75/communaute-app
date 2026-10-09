import Link from "next/link";
import type { Profil } from "@/lib/profil";
import BarreBas from "./BarreBas";
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
            <div className="hud" aria-label={`Connecté : ${[profil?.prenom || name, profil?.nom].filter(Boolean).join(" ")}`}>
              <span className="hud-coin hg" aria-hidden="true" />
              <span className="hud-coin hd" aria-hidden="true" />
              <span className="hud-nom">
                <span className="hud-prenom">{profil?.prenom || name}</span>
                {profil?.nom ? <span className="hud-famille">{profil.nom}</span> : null}
              </span>
              {profil ? (
                <span className={`hud-role ${profil.role}`}>
                  <i aria-hidden="true" />
                  {profil.role === "admin" ? "Administrateur" : profil.actif === false ? "Membre non actif" : "Joueur"}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>
      </div>
      {name ? <BarreBas isAdmin={profil?.role === "admin"} nom={name} inactif={profil?.role !== "admin" && profil?.actif === false} /> : null}
      <MesureEntete />
      {!name ? (
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
