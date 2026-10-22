"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { basculerArchive } from "./archives";

type J = { notion_id: string; prenom: string | null; nom: string; actif: boolean; archive: boolean; email: string | null };
const sansAccent = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Former members: archived (out of every list, no more login) or brought back. */
export default function Archives({ joueurs }: { joueurs: J[] }) {
  const router = useRouter();
  const [vue, setVue] = useState<"membres" | "archives">("membres");
  const [cherche, setCherche] = useState("");
  const [conf, setConf] = useState<J | null>(null);
  const [info, setInfo] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const nom = (j: J) => [j.prenom, j.nom].filter(Boolean).join(" ");
  const archives = joueurs.filter((j) => j.archive);
  const liste = joueurs
    .filter((j) => (vue === "archives" ? j.archive : !j.archive))
    .filter((j) => !cherche || sansAccent(nom(j)).includes(sansAccent(cherche)))
    .sort((a, b) => Number(a.actif) - Number(b.actif) || nom(a).localeCompare(nom(b), "fr"));
  const valider = () =>
    start(async () => {
      if (!conf) return;
      const r = await basculerArchive(conf.notion_id, !conf.archive);
      setInfo(r);
      setConf(null);
      if (r.ok) router.refresh();
    });
  return (
    <div className="vl">
      <p className="muted small">Un membre <b>archivé</b> (ancien joueur) disparaît de toutes les listes (compétitions, cagnottes, mails, valideurs, inscriptions…) et <b>ne peut plus se connecter</b>. Il reste gardé dans Notion (colonne « Archivé ») : tu peux le ressortir à tout moment.</p>
      <div className="cg-tete">
        <div className="rp-liste-choix" role="radiogroup" aria-label="Quels membres montrer">
          <button type="button" className={`rp-seg${vue === "membres" ? " on" : ""}`} onClick={() => setVue("membres")}>Membres {joueurs.length - archives.length}</button>
          <button type="button" className={`rp-seg${vue === "archives" ? " on" : ""}`} onClick={() => setVue("archives")}>🗄️ Archivés {archives.length}</button>
        </div>
        <input className="input cg-cherche" type="search" value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder="🔎 Chercher un membre…" aria-label="Chercher un membre" />
      </div>
      {info ? <p className={`notice ${info.ok ? "ok" : "err"}`}>{info.message}</p> : null}
      <ul className="cg-l">
        {liste.map((j) => (
          <li key={j.notion_id} className={`cg-li vl-li ar-li${j.archive ? " archive" : ""}${j.actif ? "" : " inactif"}`}>
            <span className="cg-nom"><b>{nom(j)}</b><small> · {j.archive ? "archivé" : j.actif ? "actif" : "non actif"}</small></span>
            <button type="button" className={`vl-b ar-b${j.archive ? " on" : ""}`} onClick={() => { setInfo(null); setConf(j); }}>{j.archive ? "↩️ Désarchiver" : "🗄️ Archiver"}</button>
          </li>
        ))}
        {!liste.length ? <li className="muted small">{vue === "archives" ? "Aucun membre archivé." : "Aucun membre."}</li> : null}
      </ul>
      {conf ? (
        <div className="ig-fond" onClick={() => !pending && setConf(null)}>
          <div className="ig-saisie" role="dialog" aria-label="Confirmer" onClick={(e) => e.stopPropagation()}>
            <p className="ig-qui">{conf.archive ? "Désarchiver" : "Archiver"} {nom(conf)} ?</p>
            <p className="muted small" style={{ textAlign: "center" }}>{conf.archive ? "Il revient dans les listes et peut de nouveau se connecter (si son adresse e-mail est dans Notion)." : "Il disparaît des listes et ne pourra plus se connecter. Sa fiche reste dans Notion."}</p>
            <span className="ig-btns">
              <button type="button" className="btn primary" disabled={pending} onClick={valider}>{pending ? "…" : conf.archive ? "↩️ Oui, désarchiver" : "🗄️ Oui, archiver"}</button>
              <button type="button" className="btn" disabled={pending} onClick={() => setConf(null)}>Annuler</button>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
