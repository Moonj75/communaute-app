import Link from "next/link";
import Blocs from "@/components/Blocs";
import Installer from "@/components/Installer";
import type { ClassementClub, Evenement, Resultat, Seance } from "@/lib/club-types";
import { BlocClassements, BlocEntrainements, BlocResultats } from "./VueClub";
import { NosJoueurs, PlacesClub } from "./Classements";
import type { LigneClassement } from "@/lib/classements-types";

const euro = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export type Gens = { prenom: string | null; cagnotte: number | null; roles: string[] | null; actif: boolean }[];

export default function VueAccueil(p: {
  name: string;
  salut: string;
  isAdmin: boolean;
  lie: boolean;
  email: string;
  gens: Gens;
  prochaine: { nom: string; date: string; lieu: string | null } | null;
  j: number | null;
  classements: ClassementClub[];
  resultats: Resultat[];
  seances: Seance[];
  evs: Evenement[];
  noms: Map<string, string>;
  eug?: LigneClassement[];
  moi?: string[];
}) {
  const { gens } = p;
  const cagnotte = gens.reduce((s, g) => s + (Number(g.cagnotte) || 0), 0);
  const roles = [...new Set(gens.flatMap((g) => g.roles || []))];
  const famille = gens.length > 1;
  const now = p.classements[0];
  const eug = p.eug || [];
  const clubs = eug.filter((e) => e.prenom === null || e.liste === "WR-Teams");
  const natAuto = eug.find((e) => e.liste === "FBFTS-Clubs")?.rang;
  const nbJoueurs = new Set(eug.filter((e) => e.prenom !== null && e.liste !== "WR-Teams").map((e) => e.joueur_id || e.nom)).size;

  const score = (
    <section className="score" aria-label="Tableau de score">
      <div className="main">
        <span className="lbl">Prochaine compétition</span>
        <span className="val num">{p.j === null ? "—" : p.j === 0 ? "Jour J" : `J-${p.j}`}</span>
        <span className="sub">
          {p.prochaine
            ? `${p.prochaine.nom} · ${new Date(p.prochaine.date).toLocaleDateString("fr-BE", { day: "numeric", month: "long" })}${p.prochaine.lieu ? " · " + p.prochaine.lieu : ""}`
            : "Calendrier en préparation"}
        </span>
      </div>
      <div>
        <span className="lbl">{famille ? "Cagnotte famille" : "Ma cagnotte"}</span>
        <span className="val num">{euro.format(cagnotte)}</span>
        <span className="sub">Pour les déplacements</span>
      </div>
      <div>
        <span className="lbl">{famille ? "Famille" : "Mes rôles"}</span>
        <span className="val num">{famille ? gens.length : roles.length || "—"}</span>
        <span className="sub">{famille ? gens.map((g) => g.prenom).filter(Boolean).join(" · ") : roles.join(" · ") || "Joueur du club"}</span>
      </div>
    </section>
  );

  const espace = (
    <div className="cards">
      <Link className="card dark" href="/fiche">
        <span className="idx">01</span>
        <span className="ic">👤</span>
        <h3>{famille ? "Ma famille" : "Ma fiche"}</h3>
        <p>Photo, classements, palmarès et cagnotte.</p>
        <span className="go">Ouvrir →</span>
      </Link>
      <Link className="card" href="/inscriptions">
        <span className="idx">02</span>
        <span className="ic">🏁</span>
        <h3>Mes inscriptions</h3>
        <p>Répondre aux compétitions et voir mes déplacements.</p>
        <span className="go">Répondre →</span>
      </Link>
      <Link className="card" href="/calendrier">
        <span className="idx">03</span>
        <span className="ic">📅</span>
        <h3>Calendrier</h3>
        <p>Toutes les compétitions de la saison, mois par mois.</p>
        <span className="go">Voir →</span>
      </Link>
    </div>
  );

  const staff = (
    <div className="cards">
      <Link className="card gold" href="/admin">
        <span className="idx">04</span>
        <span className="ic">🗂️</span>
        <h3>Joueurs</h3>
        <p>Synchroniser avec Notion, gérer les accès, inviter.</p>
        <span className="go">Gérer →</span>
      </Link>
      <Link className="card gold" href="/staff/inscriptions">
        <span className="idx">05</span>
        <span className="ic">📊</span>
        <h3>Tableau de bord</h3>
        <p>Inscriptions par évènement, relances, logistique.</p>
        <span className="go">Analyser →</span>
      </Link>
      <Link className="card gold" href="/staff/planning">
        <span className="idx">06</span>
        <span className="ic">🗓️</span>
        <h3>Planning</h3>
        <p>Tâches, rappels, calendrier et feuille de route.</p>
        <span className="go">Organiser →</span>
      </Link>
      <Link className="card gold" href="/staff/notifications">
        <span className="idx">07</span>
        <span className="ic">🔔</span>
        <h3>Notifications</h3>
        <p>Prévenir les joueurs, réglages et envois automatiques.</p>
        <span className="go">Envoyer →</span>
      </Link>
      <Link className="card gold" href="/staff/classements">
        <span className="idx">08</span>
        <span className="ic">📊</span>
        <h3>Classements</h3>
        <p>Mise à jour mensuelle FBFTS + FISTF, import manuel si besoin.</p>
        <span className="go">Vérifier →</span>
      </Link>
    </div>
  );

  return (
    <>
      <section className="hello">
        <span className="kicker">{p.isAdmin ? "Staff · Administrateur" : famille ? "Compte famille" : "Joueur"}</span>
        <h2>
          {p.salut}, {p.name}
        </h2>
        <p>{p.isAdmin ? "Tout le club est entre tes mains. Prépare la suite." : "Prêt pour la prochaine ? Voici ton tableau de bord."}</p>
      </section>
      <Installer />
      {!p.lie ? <div className="notice">Ton compte est connecté mais pas encore relié à une fiche du club. Un administrateur doit vérifier ton adresse ({p.email}).</div> : null}

      <Blocs
        blocs={[
          { id: "score", titre: "Tableau de score", ic: "🏁", badge: p.j !== null ? (p.j === 0 ? "J" : `J-${p.j}`) : null, contenu: score },
          { id: "club", titre: "Le club", ic: "🏆", badge: natAuto ? `#${natAuto}` : now?.national ? `#${now.national}` : null, contenu: <>{clubs.length ? <PlacesClub clubs={clubs} /> : <BlocClassements classements={p.classements} />}<p className="sec-title">Derniers résultats</p><BlocResultats resultats={p.resultats} evs={p.evs} noms={p.noms} /></> },
          { id: "classements", titre: "Classements", ic: "📊", badge: nbJoueurs || null, contenu: <NosJoueurs lignes={eug} moi={p.moi} /> },
          { id: "entrainements", titre: "Entraînements", ic: "🎯", badge: p.seances.filter((s) => !s.annule).length || null, contenu: <BlocEntrainements seances={p.seances} noms={p.noms} /> },
          { id: "espace", titre: "Mon espace", ic: "👤", contenu: espace },
          ...(p.isAdmin ? [{ id: "staff", titre: "Staff", ic: "⭐", contenu: staff }] : []),
        ]}
      />
      <p className="foot">Connecté en tant que {p.email}.</p>
    </>
  );
}
