/** FISTF logo, used as the « international » icon everywhere (instead of the 🌍 globe). */
export default function LogoFistf({ taille }: { taille?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="logo-fistf" src="/fistf.png" alt="FISTF" title="FISTF (international)" width={taille || 16} height={taille || 16} style={taille ? { width: taille, height: taille } : undefined} />;
}
