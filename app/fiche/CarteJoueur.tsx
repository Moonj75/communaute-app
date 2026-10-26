import { initiales } from "@/lib/club-types";
import Photo from "./Photo";
import type React from "react";
import { couleurCategorie } from "@/lib/classements-types";
import LogoFistf from "@/components/LogoFistf";
import { categorieFinale } from "@/lib/categories";
import CagnotteFiche from "@/components/cagnotte/CagnotteFiche";
import type { Bareme, EvenementLie, Mouvement } from "@/lib/cagnotte";

export type Fiche = {
  notion_id: string;
  email: string;
  nom: string;
  prenom: string | null;
  actif: boolean;
  titulaire: boolean;
  roles: string[] | null;
  cagnotte: number | null;
  /** Shared kitty (« Famille Devreese »), when there is one. */
  cagnotte_groupe?: string | null;
  telephone: string | null;
  /** Date of birth (step 18): gives the age category. */
  date_naissance?: string | null;
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

/**
 * One single player card (futuristic look): photo, name, category and the three rankings in the same frame;
 * the honours scroll from right to left in a band at the bottom of the card. The kitty sits apart, below.
 * `places` = the player's places read from the latest imported rankings (always up to date).
 */
export function CarteJoueur({ f, famille, photoUrl, places, cag }: { f: Fiche; famille: boolean; photoUrl: string | null; places?: PlacesVivantes; /** Kitty history (null = not installed yet). */ cag?: { mouvements: Mouvement[] | null; bareme: Bareme[]; noms: Record<string, string>; evenements?: EvenementLie[] } }) {
  const full = [f.prenom, f.nom].filter(Boolean).join(" ");
  const cagnotte = Number(f.cagnotte) || 0;
  const titres = (f.palmares || "").split(/\n+/).map((t) => t.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  // Enough items for the band to be full while it scrolls (the list is repeated if short).
  const tour = titres.length ? Array.from({ length: Math.max(1, Math.ceil(6 / titres.length)) }, () => titres).flat() : [];
  const duree = Math.max(16, tour.reduce((n, t) => n + t.length, 0) * 0.28);
  // The player's age category, from the « Catégorie » column of Notion (Open, Vétéran, Femme, U20, U16, U12);
  // otherwise the FISTF category where he is ranked; otherwise Open.
  const cat = categorieFinale(f.categorie, f.date_naissance) || places?.categorie?.nom || "Open";
  const kCat = couleurCategorie(cat);
  const kIc = places?.categorie ? couleurCategorie(places.categorie.nom) : undefined;
  return (
    <article className="fx">
      <div className="fx-carte">
        <span className="fx-coin a" aria-hidden="true" /><span className="fx-coin b" aria-hidden="true" />
        {/* Club crest at the top left of the card, with the card's name. */}
        <div className="fx-club">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/crest.png" alt="SC Lions d'Eugies" width={40} height={40} />
          <span>SC Lions d&apos;Eugies<small>Carte joueur · saison 2026–2027</small></span>
        </div>
        <header className="fx-tete">
          <Photo notionId={f.notion_id} url={photoUrl} path={f.photo_path || null} initiales={initiales(full)} nom={full} />
          <div className="fx-id">
            <h2 className="fx-nom">
              <span className="perso">{f.prenom}</span> {f.nom}
            </h2>
            <div className="fx-pills">
              <span className={`fx-pill${f.actif ? " on" : ""}`}>{f.actif ? "● Actif" : "○ Non actif"}</span>
              {famille ? <span className={`fx-pill${f.titulaire ? " or" : ""}`}>{f.titulaire ? "Titulaire" : "Famille"}</span> : null}
              {(f.roles || []).map((r) => (
                <span key={r} className="fx-pill">{r}</span>
              ))}
            </div>
          </div>
        </header>

        <div className="fx-stats">
          <div className="fx-s" style={kCat ? ({ "--k": kCat } as React.CSSProperties) : undefined}>
            <span className="fx-l">Catégorie</span>
            <b className="fx-v fx-cat">{cat}</b>
          </div>
          <div className="fx-s" style={{ "--k": "#ff5a4a" } as React.CSSProperties}>
            <span className="fx-l">🇧🇪 National</span>
            <b className="fx-v num">{place(places ? places.national?.rang : f.classement_belge)}</b>
            <span className="fx-p">FBFTS</span>
          </div>
          <div className="fx-s" style={{ "--k": "#5fa8ff" } as React.CSSProperties}>
            <span className="fx-l"><LogoFistf /> Open</span>
            <b className="fx-v num">{place(places ? places.open : f.classement_international)}</b>
            <span className="fx-p">FISTF monde</span>
          </div>
          <div className="fx-s" style={{ "--k": kIc || "#4fd6a4" } as React.CSSProperties}>
            <span className="fx-l"><LogoFistf /> {places?.categorie ? places.categorie.nom : "Catégorie"}</span>
            <b className="fx-v num">{place(places?.categorie?.rang)}</b>
            <span className="fx-p">{places?.categorie ? "FISTF cat." : "non classé"}</span>
          </div>
        </div>

        <div className="fx-palma" role="region" aria-label="Palmarès">
          <span className="fx-pk">🏆 Palmarès</span>
          <div className="fx-pv">
            {tour.length ? (
              <div className="fx-pp" style={{ animationDuration: `${duree}s` }}>
                {[0, 1].map((c) => (
                  <span key={c} className="fx-pc" aria-hidden={c === 1 ? true : undefined}>
                    {tour.map((t, i) => (
                      <span key={i} className="fx-pi">🏅 {t}</span>
                    ))}
                  </span>
                ))}
              </div>
            ) : (
              <span className="fx-pi vide">Pas encore de titre… le premier arrive ! 💪</span>
            )}
          </div>
        </div>
      </div>

      <CagnotteFiche joueurId={f.notion_id} nom={full} montant={cagnotte} groupe={f.cagnotte_groupe || null} mouvements={cag?.mouvements ?? null} bareme={cag?.bareme || []} noms={cag?.noms || {}} evenements={cag?.evenements || []} />
    </article>
  );
}
