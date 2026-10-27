"use client";

import Link from "next/link";
import { useState } from "react";
import { videoIntegree, type Exercice } from "@/lib/entrainements-types";
import { FormExercice } from "./Bibliotheque";
import "./entrainements.css";

/** One exercise sheet: video played in the page, then how it goes, aim, equipment. */
export default function FicheExercice({ e, peutEditer }: { e: Exercice; peutEditer: boolean }) {
  const [edit, setEdit] = useState(false);
  const integree = videoIntegree(e.video);
  return (
    <div className="en">
      <Link className="btn" href="/entrainements#bloc-exercices">← Fiches d&apos;exercices</Link>
      <section className="en-carte">
        <header className="en-tete">
          <div>
            <p className="en-k">{e.styles.join(" · ") || "Exercice"}</p>
            <h3 className="en-date"><span className="en-code">{e.code || "—"}</span> {e.titre}</h3>
            <p className="en-h">{[e.duree ? `⏱️ ${e.duree} min` : "", e.joueurs ? `👥 ${e.joueurs} joueur${e.joueurs > 1 ? "s" : ""}` : "", e.niveau || ""].filter(Boolean).join(" · ")}</p>
          </div>
          {peutEditer && !edit ? <button type="button" className="btn en-mini" onClick={() => setEdit(true)}>✏️ Modifier</button> : null}
        </header>
        {edit ? (
          <FormExercice e={e} onFini={() => setEdit(false)} />
        ) : (
          <>
            {integree ? (
              <div className="en-video"><iframe src={integree} title={e.titre} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen loading="lazy" /></div>
            ) : e.video ? (
              <a className="btn primary" href={e.video} target="_blank" rel="noopener">🎬 Voir la vidéo ↗</a>
            ) : null}
            {e.description ? <div className="en-bloc"><p className="en-k">Déroulement</p><p className="en-txt">{e.description}</p></div> : null}
            {e.objectif ? <div className="en-bloc"><p className="en-k">Objectif</p><p className="en-txt">{e.objectif}</p></div> : null}
            {e.materiel ? <div className="en-bloc"><p className="en-k">Matériel</p><p className="en-txt">{e.materiel}</p></div> : null}
            {!e.description && !e.video ? <p className="muted small">Fiche encore vide{peutEditer ? " : touche « Modifier » pour la compléter." : "."}</p> : null}
          </>
        )}
      </section>
    </div>
  );
}
