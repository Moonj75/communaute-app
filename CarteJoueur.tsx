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
  return (
    <article className="fiche">
      <section className="panel id-card">
        <Photo notionId={f.notion_id} url={photoUrl} path={f.photo_path || null} initiales={initiales(full)} nom={full} />
        <div className="id-txt">
          <h2 className="display">{full}</h2>
          <div className="id-pills">
            {famille ? <span className={`pill ${f.titulaire ? "adm" : ""}`}>{f.titulaire ? "Titulaire du compte" : "Membre de la famille"}</span> : null}
            <span className={`pill ${f.actif ? "on" : ""}`}>{f.actif ? "Actif" : "Inactif"}</span>
          </div>
          {(f.roles || []).length ? (
            <div className="id-roles">
              {(f.roles || []).map((r) => (
                <span key={r} className="role-chip">{r}</span>
              ))}
            </div>
          ) : null}
          <p className="id-tel">
            <span className="fl-l">Téléphone</span>
            <b>{f.telephone || "—"}</b>
          </p>
        </div>
      </section>

      <div className="fiche-side">
        <section className="panel bloc-cat">
          <span className="fl-l">Catégorie</span>
          <span className="cat-big">{f.categorie || "À définir"}</span>
          <span className="cat-serie">
            <span className="fl-l">Série</span> <b>{f.serie || "—"}</b>
          </span>
        </section>

        <section className="panel cagnotte">
          <span className="fl-l">Cagnotte</span>
          <span className="big num">{euro.format(cagnotte)}</span>
          <span className="muted small">Montant disponible pour les déplacements.</span>
        </section>
      </div>

      <section className="panel palma">
        <div className="classements">
          <div className="clt">
            <span className="fl-l">🇧🇪 Classement belge</span>
            <span className="clt-v num">{f.classement_belge ? <><small>#</small>{f.classement_belge}</> : "—"}</span>
          </div>
          <div className="clt">
            <span className="fl-l">🌍 Classement international</span>
            <span className="clt-v num">{f.classement_international ? <><small>#</small>{f.classement_international}</> : "—"}</span>
          </div>
        </div>
        <div className="palmares">
          <span className="fl-l">🏆 Palmarès</span>
          {titres.length ? (
            <ul>
              {titres.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Pas encore de titre enregistré… le premier arrive ! 💪</p>
          )}
        </div>
      </section>
    </article>
  );
}

