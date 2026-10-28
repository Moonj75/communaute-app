"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { envoyerDemande, type CasAide, type DemandeState } from "./actions";
import "./aide.css";

type Sujet = "membre" | "rejoindre" | "parent" | "attente" | "archive" | "code";

const TETES: Record<CasAide, { ic: string; titre: string; texte: string }> = {
  inconnu: { ic: "🔍", titre: "On ne trouve pas cette adresse", texte: "Cette adresse e-mail n'est pas dans la liste du club. Pas de souci : dis-nous qui tu es, le staff t'ouvre l'accès." },
  attente: { ic: "⏳", titre: "Ton accès est presque prêt", texte: "Ta fiche existe bien au club, mais ton accès à l'appli n'est pas encore ouvert. Préviens le staff en un clic." },
  archive: { ic: "🔄", titre: "Ton compte est en pause", texte: "Ton compte est archivé (ancien membre). Tu veux revenir aux Lions ? Envoie ta demande, le staff réactive ton accès." },
  code: { ic: "📭", titre: "Le code n'arrive pas ?", texte: "Avant de demander de l'aide, vérifie ces 4 points. Dans 9 cas sur 10, c'est réglé." },
};

/** One form, adapted to the situation: only the useful fields. */
function Formulaire({ sujet, email, nom, retour }: { sujet: Sujet; email: string; nom?: string; retour?: () => void }) {
  const [etat, action, pending] = useActionState<DemandeState, FormData>(envoyerDemande, { status: "idle" });
  const [prenom0, ...reste] = (nom || "").split(" ");
  if (etat.status === "ok")
    return (
      <div className="aide-ok" role="status">
        <div className="aide-ic">✅</div>
        <h3>Demande envoyée !</h3>
        <p>Le staff des Lions l&apos;a reçue. On te répond au plus vite par e-mail{etat.message ? <> à <b>{etat.message}</b></> : null}.</p>
        <Link className="btn" href="/club">🦁 En attendant, découvrir le club</Link>
      </div>
    );
  return (
    <form action={action} className="aide-form">
      <input type="hidden" name="sujet" value={sujet} />
      <input type="text" name="site" tabIndex={-1} autoComplete="off" className="aide-pot" aria-hidden="true" />
      <div className="aide-2">
        <label className="f">Prénom<input className="input" name="prenom" required defaultValue={prenom0 || ""} autoComplete="given-name" /></label>
        <label className="f">Nom<input className="input" name="nom" required defaultValue={reste.join(" ")} autoComplete="family-name" /></label>
      </div>
      <label className="f">{sujet === "membre" ? "Ta nouvelle adresse e-mail" : "Ton adresse e-mail (pour te répondre)"}<input className="input" type="email" name="email" required defaultValue={email} autoComplete="email" /></label>
      {sujet === "membre" ? <label className="f">Ancienne adresse donnée au club <small className="muted">(si tu t&apos;en souviens)</small><input className="input" type="email" name="ancienne" /></label> : null}
      {sujet === "parent" ? <label className="f">Prénom et nom de ton enfant (joueur)<input className="input" name="enfant" required /></label> : null}
      {sujet === "rejoindre" ? (
        <>
          <label className="f">Téléphone <small className="muted">(facultatif)</small><input className="input" type="tel" name="tel" autoComplete="tel" /></label>
          <label className="f">Le Subbuteo et toi
            <select className="input" name="niveau" defaultValue="Jamais joué">
              <option>Jamais joué</option><option>Un peu, pour le plaisir</option><option>Déjà joué en club</option><option>Je joue en compétition</option>
            </select>
          </label>
        </>
      ) : null}
      {sujet === "code" ? (
        <label className="f">Ce qui se passe
          <select className="input" name="probleme" defaultValue="Je ne reçois aucun mail">
            <option>Je ne reçois aucun mail</option><option>Le code est refusé</option><option>Le lien du mail ne marche pas</option><option>Autre chose</option>
          </select>
        </label>
      ) : null}
      {sujet === "code" || sujet === "archive" ? <label className="f">Téléphone <small className="muted">(facultatif, pour t&apos;aider plus vite)</small><input className="input" type="tel" name="tel" autoComplete="tel" /></label> : null}
      <label className="f">Un mot pour le staff <small className="muted">(facultatif)</small>
        <textarea className="input" name="message" rows={3} maxLength={1000} placeholder={sujet === "rejoindre" ? "Ex. Je voudrais venir essayer un vendredi." : sujet === "archive" ? "Ex. Je reprends cette saison !" : ""} />
      </label>
      {etat.status === "error" ? <div className="notice err" role="alert">{etat.message}</div> : null}
      <button className="btn primary" type="submit" disabled={pending} style={{ minHeight: 50 }}>{pending ? "Envoi…" : "📨 Envoyer ma demande au staff"}</button>
      {retour ? <button type="button" className="btn ghost" onClick={retour}>← Retour</button> : null}
    </form>
  );
}

/**
 * Help page shown instead of the login form when someone cannot get in: an explanation made for his situation
 * and a request form that reaches the staff (Courrier « Pour le staff » + notification).
 */
export default function Aide({ cas, email, nom }: { cas: CasAide; email: string; nom?: string }) {
  const [choix, setChoix] = useState<Sujet | null>(cas === "attente" ? "attente" : cas === "archive" ? "archive" : null);
  const [aideCode, setAideCode] = useState(false);
  const t = TETES[cas];
  const recommencer = () => window.location.assign("/login");

  return (
    <div className="aide">
      <div className="aide-tete">
        <span className="aide-ic" aria-hidden="true">{t.ic}</span>
        <div>
          <h3>{t.titre}</h3>
          {email ? <p className="aide-mail">{email}</p> : null}
        </div>
      </div>
      <p className="aide-txt">{t.texte}</p>

      {cas === "inconnu" && !choix ? (
        <>
          <button type="button" className="aide-faute" onClick={recommencer}>✏️ Je me suis trompé d&apos;adresse : <b>corriger</b></button>
          <p className="aide-q">Quelle est ta situation ?</p>
          <div className="aide-choix">
            <button type="button" onClick={() => setChoix("membre")}><span>🦁</span><b>Je suis déjà membre</b><small>J&apos;ai changé d&apos;adresse ou donné une autre adresse au club</small></button>
            <button type="button" onClick={() => setChoix("rejoindre")}><span>👋</span><b>Je veux rejoindre le club</b><small>Découvrir le Subbuteo, venir à un entraînement</small></button>
            <button type="button" onClick={() => setChoix("parent")}><span>👨‍👩‍👧</span><b>Je suis parent d&apos;un joueur</b><small>Suivre les inscriptions et le planning de mon enfant</small></button>
          </div>
        </>
      ) : null}

      {cas === "code" && !aideCode ? (
        <>
          <ol className="aide-pas">
            <li><b>Regarde dans les indésirables</b> (spam, promotions) : le mail vient de « SC Lions d&apos;Eugies ».</li>
            <li><b>Attends 2 minutes</b> : le mail met parfois un peu de temps.</li>
            <li><b>Vérifie l&apos;adresse</b>{email ? <> : <b>{email}</b></> : null}. Une lettre de travers et le code part ailleurs.</li>
            <li><b>Utilise le dernier code reçu</b> : chaque nouvelle demande annule les codes précédents. Un code reste valable 1 heure.</li>
          </ol>
          <div className="aide-act">
            <button type="button" className="btn primary" onClick={recommencer}>↺ Redemander un code</button>
            <button type="button" className="btn" onClick={() => setAideCode(true)}>🆘 Toujours rien : demander de l&apos;aide</button>
          </div>
        </>
      ) : null}

      {choix ? <Formulaire sujet={choix} email={email} nom={nom} retour={cas === "inconnu" ? () => setChoix(null) : undefined} /> : null}
      {cas === "code" && aideCode ? <Formulaire sujet="code" email={email} retour={() => setAideCode(false)} /> : null}

      <button type="button" className="btn ghost aide-retour" onClick={recommencer}>← Retour à la connexion</button>
    </div>
  );
}
