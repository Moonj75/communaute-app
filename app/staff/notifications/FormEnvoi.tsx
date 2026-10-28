"use client";

import { useActionState, useEffect, useState } from "react";
import { envoyerManuel, type RetourEnvoi } from "./actions";
import Apercu from "./Apercu";
import { GROUPES_ENT } from "@/lib/entrainements-types";

/** Ready-made messages: choosing one fills the title and the text (they can still be changed). */
const MODELES = [
  { id: "libre", nom: "✏️ Message libre", titre: "", texte: "" },
  { id: "relance", nom: "⏰ Relance : réponds au formulaire", titre: "⏰ On attend ta réponse : {competition}", texte: "Il ne reste que quelques jours pour répondre. Un clic suffit dans l'appli !" },
  { id: "dernier", nom: "🚨 Dernier rappel", titre: "🚨 Dernier jour pour répondre : {competition}", texte: "Sans réponse ce soir, on ne pourra pas t'inscrire." },
  { id: "infos", nom: "📍 Infos pratiques", titre: "📍 Infos pour {competition}", texte: "Rendez-vous à … à …h. Pense à ta licence et à ton matériel." },
  { id: "entrainement", nom: "🎯 Entraînement", titre: "🎯 Entraînement ce …", texte: "Rendez-vous à la Maison du Peuple à …h. Viens nombreux !" },
  { id: "annule", nom: "❌ Annulation", titre: "❌ Entraînement annulé", texte: "L'entraînement de … est annulé. On se retrouve la semaine prochaine." },
  { id: "equipe", nom: "📅 Équipe : prenez vos dates", titre: "📅 Planning des entraînements", texte: "Il reste des places libres ce mois-ci. Ouvre l'appli → Entraînements et prends tes dates." },
  { id: "guide", nom: "📘 Équipe : le guide des entraînements", titre: "📘 Le guide de l'équipe entraînements", texte: "Comment prendre tes dates, valider ta place, ce que font les suppléants et quand l'entraînement est confirmé : tout est expliqué dans ce guide. Touche « Ouvrir le guide » pour le lire.", doc: "guide-entrainements" },
  { id: "valider", nom: "✅ Équipe : pensez à valider", titre: "✅ Pense à valider ta place", texte: "Ouvre l'appli → Entraînements et touche « Je valide » pour ta prochaine séance." },
];

export default function FormEnvoi({ evenements, cible }: { evenements: { id: string; nom: string; court: string }[]; cible?: string }) {
  const [etat, action, pending] = useActionState<RetourEnvoi | null, FormData>(envoyerManuel, null);
  const [dest, setDest] = useState(cible || "tous");
  const [titre, setTitre] = useState("");
  const [texte, setTexte] = useState("");
  const [verif, setVerif] = useState(false);
  const [doc, setDoc] = useState("");

  // After a successful sending, a clean form.
  useEffect(() => {
    if (etat?.ok) { setTitre(""); setTexte(""); setVerif(false); setDoc(""); }
  }, [etat]);

  const ev = evenements.find((e) => dest.endsWith(":" + e.id));
  const libelleDest =
    dest === "tous" ? "tous les joueurs actifs" : dest === "staff" ? "le staff (administrateurs)" : dest.startsWith("ent:") ? GROUPES_ENT.find((g) => `ent:${g.id}` === dest)?.nom || dest : ev ? `${dest.startsWith("attente:") ? "ceux qui n'ont pas répondu" : "les inscrits « Oui »"} · ${ev.nom}` : dest;
  const choisirModele = (id: string) => {
    const m = MODELES.find((x) => x.id === id);
    if (!m) return;
    const nom = ev?.court || "…";
    setTitre(m.titre.replace("{competition}", nom));
    setTexte(m.texte.replace("{competition}", nom));
    setDoc((m as { doc?: string }).doc || "");
    if ((m as { doc?: string }).doc && !dest.startsWith("ent:")) setDest("ent:tous");
    setVerif(false);
  };

  return (
    <form action={action} className="envoi nm-envoi">
      <div className="nm-ed">
        <div className="nm-champs">
          <label className="f">
            Destinataires
            <select className="input" name="cible" value={dest} onChange={(e) => { setDest(e.target.value); setVerif(false); }}>
              <option value="tous">Tous les joueurs actifs</option>
              <option value="staff">Le staff (administrateurs)</option>
              <optgroup label="Équipe entraînements">
                {GROUPES_ENT.map((g) => <option key={g.id} value={`ent:${g.id}`}>{g.nom}</option>)}
              </optgroup>
              {evenements.length ? (
                <optgroup label="Pas encore répondu">
                  {evenements.map((e) => <option key={"a" + e.id} value={`attente:${e.id}`}>Sans réponse · {e.nom}</option>)}
                </optgroup>
              ) : null}
              {evenements.length ? (
                <optgroup label="Inscrits « Oui »">
                  {evenements.map((e) => <option key={"o" + e.id} value={`oui:${e.id}`}>Inscrits « Oui » · {e.nom}</option>)}
                </optgroup>
              ) : null}
            </select>
          </label>
          <label className="f">
            Modèle de message
            <select className="input" defaultValue="libre" onChange={(e) => choisirModele(e.target.value)}>
              {MODELES.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </label>
          <label className="f">
            Document joint
            <select className="input" name="doc" value={doc} onChange={(e) => { setDoc(e.target.value); setVerif(false); }}>
              <option value="">— Aucun —</option>
              <option value="guide-entrainements">📘 Guide de l&apos;équipe entraînements (PDF)</option>
            </select>
          </label>
          <label className="f">
            Titre
            <input className="input" name="titre" required maxLength={80} value={titre} onChange={(e) => { setTitre(e.target.value); setVerif(false); }} placeholder="Ex. 🏁 Dernier rappel pour Majorque" />
          </label>
          <label className="f">
            Message
            <textarea className="input area" name="message" maxLength={240} rows={3} value={texte} onChange={(e) => { setTexte(e.target.value); setVerif(false); }} placeholder="Ex. Il reste 2 jours pour répondre, on compte sur toi !" />
          </label>
        </div>
        <Apercu titre={titre} texte={texte} rangement={dest.startsWith("attente:") ? "Relances" : "Notifications"} />
      </div>

      <label className="nm-copie" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14 }}>
        <input type="checkbox" name="copie" defaultChecked /> 📩 M&apos;envoyer aussi une copie (pour voir ce que reçoivent les autres)
      </label>
      {/* Two steps: check first, then confirm. */}
      {!verif ? (
        <button className="btn primary" type="button" disabled={!titre.trim()} onClick={() => setVerif(true)}>
          👀 Vérifier avant d&apos;envoyer
        </button>
      ) : (
        <div className="nm-verif">
          <p>Ce message va partir maintenant vers <b>{libelleDest}</b>, sur leur téléphone et dans leur Courrier.</p>
          <div className="nm-act">
            <button className="btn primary" type="submit" disabled={pending}>{pending ? "Envoi…" : "📣 Confirmer l'envoi"}</button>
            <button className="btn" type="button" disabled={pending} onClick={() => setVerif(false)}>✏️ Modifier</button>
          </div>
        </div>
      )}
      {etat ? <p className={`notice ${etat.ok ? "ok" : "err"}`}>{etat.message}</p> : null}
    </form>
  );
}
