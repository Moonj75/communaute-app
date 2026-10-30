import { NOM_PAYS, emojiDrapeau, paysDe } from "@/lib/drapeaux";
import "./drapeau.css";

/**
 * The flag of the tournament's country, waving gently next to its name.
 * lieu / nom: where it happens and its name (« Grand Prix de Paris »); defaut: country when nothing is recognised.
 */
export default function Drapeau({ code: force, lieu, nom, defaut = "BE", taille }: { /** Country already known (« BE »). */ code?: string | null; lieu?: string | null; nom?: string | null; defaut?: string | null; taille?: number }) {
  const code = force !== undefined ? force : paysDe(lieu, nom) || defaut;
  if (!code) return null;
  return (
    <span className="drapeau" role="img" aria-label={NOM_PAYS[code] || code} title={NOM_PAYS[code] || code} style={taille ? { fontSize: taille } : undefined}>
      <span className="drapeau-in">{emojiDrapeau(code)}</span>
    </span>
  );
}
