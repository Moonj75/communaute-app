import { initiales } from "@/lib/club-types";
import Photo from "./Photo";

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

export function CarteJoueur({ f, famille, photoUrl }: { f: Fiche; famille: boolean; photoUrl: string | null }) {
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

      <div className="fc-grille">
        <div className="fc-t t-cat">
          <span className="fl-l">Catégorie</span>
          <b className="fc-v">{f.categorie || "—"}</b>
          <span className="fc-s">Série {f.serie || "—"}</span>
        </div>
        <div className="fc-t t-euro">
          <span className="fl-l">Cagnotte</span>
          <b className="fc-v num">{euro.format(cagnotte)}</b>
          <span className="fc-s">déplacements</span>
        </div>
        <div className="fc-t t-nat">
          <span className="fl-l">🇧🇪 Belge</span>
          <b className="fc-v num">{f.classement_belge ? <>{f.classement_belge}<sup>{f.classement_belge === 1 ? "er" : "e"}</sup></> : "—"}</b>
          <span className="fc-s">FBFTS</span>
        </div>
        <div className="fc-t t-int">
          <span className="fl-l">🌍 Mondial</span>
          <b className="fc-v num">{f.classement_international ? <>{f.classement_international}<sup>{f.classement_international === 1 ? "er" : "e"}</sup></> : "—"}</b>
          <span className="fc-s">FISTF</span>
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
    </article>
  );
}
