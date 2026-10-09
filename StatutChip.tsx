import type { Reponse } from "@/lib/club-types";

const CLS: Record<string, string> = { Oui: "o", "Peut-être": "m", Non: "n", "En attente": "p" };

/** Response chip. Without an answer: « À répondre » when the form is open, « Sans réponse » when closed, « — » before opening. */
export default function StatutChip({ s, ouvert = true, clos = false }: { s: Reponse | null | undefined; ouvert?: boolean; clos?: boolean }) {
  const v = s || "En attente";
  const vide = v === "En attente";
  const txt = !vide ? v : ouvert ? "À répondre" : clos ? "Sans réponse" : "—";
  return <span className={`st st-${CLS[v] || "p"}${vide && !ouvert ? " st-x" : ""}`}>{txt}</span>;
}
