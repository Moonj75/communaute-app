import { initiales } from "@/lib/club-types";
import Photo from "./Photo";
import type React from "react";
import { couleurCategorie } from "@/lib/classements-types";

export type Fiche = {
  notion_id: string;
  email: string;
  nom: string;
  prenom: string | null;
  actif: boolean;
  titulaire: boolean;
  roles: string[] | null;
  cagnotte: number | null;
  telephone: string | null;
  categorie: string | null;
  serie: string | null;
  synced_at: string | null;
  photo_path?: string | null;
  classement_belge?: number | null;
  classement_international?: number | null;
  palmares?: string | null;
};

const euro = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });
export const COLS = "notion_id,email,nom,prenom,actif,titulaire,roles,cagnotte,telephone,categorie,serie,synced_at";

export type PlacesVivantes = {
  national?: { rang: number; categorie: string | null; suivante: string | null } | null;
  open?: number | null;
  categorie?: { rang: number; nom: string } | null;
};

const place = (n: number | null | undefined) => (n ? <>{n}<sup>{n === 1 ? "er" : "e"}</sup></> : "—");

/** `places` = the player's places read from the latest imported rankings (always up to date). */
export function CarteJoueur({ f, famille, photoUrl, places }: { f: Fiche; famille: boolean; photoUrl: string | null; places?: PlacesVivantes }) {
  const full = [f.prenom, f.nom].filter(Boolean).join(" ");
  const cagnotte = Number(f.cagnotte) || 0;
  const titres = (f.palmares || "").split(/\n+/).map((t) => t.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  const autres = titres.length > 4 ? titres.slice(4) : [];
  return (
    <article className="fiche-c">
      <header className="fc-tete">
        <Photo notionId={f.notion_id} url={photoUrl} path={f.photo_path || null} initiales={initiales(full)} nom={full} />
        <div className="fc-id">
          <h2 className="fc-nom">
            <span className="perso">{f.prenom}</span> {f.nom}
          </h2>
          <div className="fc-pills">
            <span className={`pill ${f.actif ? "on" : ""}`}>{f.actif ? "Actif" : "Non actif"}</span>
            {famille ? <span className={`pill ${f.titulaire ? "adm" : ""}`}>{f.titulaire ? "Titulaire du compte" : "Famille"}</span> : null}
            {(f.roles || []).map((r) => (
              <span key={r} className="role-chip">{r}</span>
            ))}
          </div>
          <span className="fc-tel">📞 {f.telephone || "—"}</span>
        </div>
      </header>

      <div className="fc-grille fc-4">
        <div className="fc-t t-cat" style={couleurCategorie(places?.national?.categorie || f.categorie) ? ({ "--k": couleurCategorie(places?.national?.categorie || f.categorie) } as React.CSSProperties) : undefined}>
          <span className="fl-l">Catégorie</span>
          <b className="fc-v">{places?.national?.categorie || f.categorie || "—"}</b>
          <span className="fc-s">{places?.national?.suivante && places.national.suivante !== places.national.categorie ? `→ ${places.national.suivante} · ` : ""}Série {f.serie || "—"}</span>
        </div>
        <div className="fc-t t-nat">
          <span className="fl-l">🇧🇪 National</span>
          <b className="fc-v num">{place(places ? places.national?.rang : f.classement_belge)}</b>
          <span className="fc-s">FBFTS</span>
        </div>
        <div className="fc-t t-int">
          <span className="fl-l">🌍 International Open</span>
          <b className="fc-v num">{place(places ? places.open : f.classement_international)}</b>
          <span className="fc-s">FISTF · toutes cat.</span>
        </div>
        <div className="fc-t t-intcat" style={places?.categorie && couleurCategorie(places.categorie.nom) ? ({ "--k": couleurCategorie(places.categorie.nom) } as React.CSSProperties) : undefined}>
          <span className="fl-l">🌍 International catégorie</span>
          <b className="fc-v num">{place(places?.categorie?.rang)}</b>
          <span className="fc-s">{places?.categorie ? `FISTF · ${places.categorie.nom}` : "pas de classement de catégorie"}</span>
        </div>
      </div>

      <section className="fc-palma">
        <span className="fl-l">🏆 Palmarès</span>
        {titres.length ? (
          <>
            <ul>
              {titres.slice(0, 4).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
            {autres.length ? (
              <details>
                <summary>+ {autres.length} autre{autres.length > 1 ? "s" : ""}</summary>
                <ul>
                  {autres.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        ) : (
          <p className="fc-s">Pas encore de titre… le premier arrive ! 💪</p>
        )}
      </section>

      <section className="fc-cagnotte" aria-label="Cagnotte">
        <span className="fcg-ic" aria-hidden="true">💰</span>
        <span className="fcg-txt">
          <span className="fcg-l">Ma cagnotte</span>
          <span className="fcg-s">pour les déplacements du club</span>
        </span>
        <b className="fcg-v num or-brillant">{euro.format(cagnotte)}</b>
      </section>
    </article>
  );
}
