import { NOM_PAYS, paysDe } from "@/lib/drapeaux";
import "./drapeau.css";

/* Flags drawn in SVG (30 × 20): the same picture on every phone and computer (Windows shows emoji flags as letters). */
const V = (a: string, b: string, c: string) => <><rect width="10" height="20" fill={a} /><rect x="10" width="10" height="20" fill={b} /><rect x="20" width="10" height="20" fill={c} /></>;
const H = (a: string, b: string, c: string) => <><rect width="30" height="6.67" fill={a} /><rect y="6.67" width="30" height="6.67" fill={b} /><rect y="13.33" width="30" height="6.67" fill={c} /></>;

const DESSINS: Record<string, React.ReactNode> = {
  BE: V("#000", "#fdda24", "#ef3340"),
  FR: V("#0055a4", "#fff", "#ef4135"),
  IT: V("#009246", "#fff", "#ce2b37"),
  IE: V("#169b62", "#fff", "#ff883e"),
  DE: H("#000", "#dd0000", "#ffce00"),
  AT: H("#ed2939", "#fff", "#ed2939"),
  NL: H("#ae1c28", "#fff", "#21468b"),
  LU: H("#ed2939", "#fff", "#00a1de"),
  ES: <><rect width="30" height="20" fill="#aa151b" /><rect y="5" width="30" height="10" fill="#f1bf00" /></>,
  PT: <><rect width="30" height="20" fill="#da291c" /><rect width="12" height="20" fill="#046a38" /><circle cx="12" cy="10" r="3.6" fill="#ffe900" stroke="#fff" strokeWidth=".6" /></>,
  GR: <><rect width="30" height="20" fill="#0d5eaf" />{[1, 3, 5, 7].map((k) => <rect key={k} y={k * 2.22} width="30" height="2.22" fill="#fff" />)}<rect width="11.1" height="11.1" fill="#0d5eaf" /><rect x="4.44" width="2.22" height="11.1" fill="#fff" /><rect y="4.44" width="11.1" height="2.22" fill="#fff" /></>,
  GB: <><rect width="30" height="20" fill="#012169" /><path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" /><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" strokeWidth="1.6" /><path d="M15 0V20M0 10H30" stroke="#fff" strokeWidth="6" /><path d="M15 0V20M0 10H30" stroke="#c8102e" strokeWidth="3.4" /></>,
  CH: <><rect width="30" height="20" fill="#da291c" /><rect x="13" y="4" width="4" height="12" fill="#fff" /><rect x="9" y="8" width="12" height="4" fill="#fff" /></>,
  CZ: <><rect width="30" height="10" fill="#fff" /><rect y="10" width="30" height="10" fill="#d7141a" /><path d="M0 0L15 10L0 20Z" fill="#11457e" /></>,
  MT: <><rect width="15" height="20" fill="#fff" /><rect x="15" width="15" height="20" fill="#cf142b" /><rect x="2.5" y="2.5" width="3" height="3" fill="#c0c0c0" /></>,
  GI: <><rect width="30" height="13.3" fill="#fff" /><rect y="13.3" width="30" height="6.7" fill="#da000c" /><rect x="11" y="4" width="8" height="7" fill="#da000c" /></>,
  CY: <><rect width="30" height="20" fill="#fff" /><path d="M8 9c3-3 9-4 14-2l-3 3c-3-1-7 0-11 1z" fill="#d57800" /><path d="M11 14q4 2 8 0" stroke="#4e5b31" strokeWidth="1" fill="none" /></>,
  US: <><rect width="30" height="20" fill="#fff" />{[0, 2, 4, 6, 8, 10, 12].map((k) => <rect key={k} y={k * 1.54} width="30" height="1.54" fill="#b22234" />)}<rect width="12" height="10.8" fill="#3c3b6e" /></>,
};

/**
 * The flag of the tournament's country, waving gently next to (or above) its name.
 * code: country already known; otherwise read from lieu / nom; defaut: country when nothing is recognised.
 */
export default function Drapeau({ code: force, lieu, nom, defaut = "BE", taille }: { /** Country already known (« BE »). */ code?: string | null; lieu?: string | null; nom?: string | null; defaut?: string | null; taille?: number }) {
  const code = force !== undefined ? force : paysDe(lieu, nom) || defaut;
  if (!code || !DESSINS[code]) return null;
  return (
    <span className="drapeau" role="img" aria-label={NOM_PAYS[code] || code} title={NOM_PAYS[code] || code} style={taille ? { fontSize: taille } : undefined}>
      <svg className="drapeau-in" viewBox="0 0 30 20" aria-hidden="true">
        <defs>
          <linearGradient id={`pli-${code}`} x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".18" /><stop offset=".3" stopColor="#000" stopOpacity=".12" /><stop offset=".55" stopColor="#fff" stopOpacity=".22" /><stop offset=".8" stopColor="#000" stopOpacity=".14" /><stop offset="1" stopColor="#fff" stopOpacity=".1" />
          </linearGradient>
        </defs>
        {DESSINS[code]}
        {/* Folds of the cloth, so it looks like a real flag in the wind. */}
        <rect width="30" height="20" fill={`url(#pli-${code})`} />
        <rect width="30" height="20" fill="none" stroke="rgba(0,0,0,.25)" strokeWidth=".6" />
      </svg>
    </span>
  );
}
