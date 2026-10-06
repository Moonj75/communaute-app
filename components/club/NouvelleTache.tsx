"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ajouterTache, type Retour } from "@/app/staff/actions";

export default function NouvelleTache({ evenements, evDefaut }: { evenements: { id: string; nom: string }[]; evDefaut?: string }) {
  const [etat, action, pending] = useActionState<Retour | null, FormData>(ajouterTache, null);
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (etat?.ok) {
      form.current?.reset();
      router.refresh();
    }
  }, [etat, router]);
  return (
    <form ref={form} action={action} className="newtask">
      <label className="f grow">
        Nouvelle tâche ou rappel
        <input className="input" name="titre" placeholder="Ex. Réserver l'hôtel pour Paris" required maxLength={200} />
      </label>
      <label className="f">
        Échéance
        <input className="input" type="date" name="echeance" />
      </label>
      <label className="f">
        Priorité
        <select className="input" name="priorite" defaultValue="Normal">
          <option>Urgent</option>
          <option>Normal</option>
          <option>Faible</option>
        </select>
      </label>
      <label className="f grow">
        Évènement lié
        <select className="input" name="evenement" defaultValue={evDefaut || ""} key={evDefaut || "x"}>
          <option value="">— Aucun —</option>
          {evenements.map((e) => (
            <option key={e.id} value={e.id}>{e.nom}</option>
          ))}
        </select>
      </label>
      <label className="chkf">
        <input type="checkbox" name="rappel" /> ⏰ C&apos;est un rappel
      </label>
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Ajout…" : "+ Ajouter"}
      </button>
      {etat?.message ? <p className={`notice ${etat.ok ? "ok" : "err"} full`}>{etat.message}</p> : null}
    </form>
  );
}
