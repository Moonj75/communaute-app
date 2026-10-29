"use client";

import { useId } from "react";

/**
 * Palmarès pictures: a golden cup for a 1st place (« ÉQUIPE » written on it for a team result),
 * a medal with the place written on it for the others (2e silver, 3e bronze, ¼ / 8e… steel).
 * A light streak passes over them from time to time (reflection).
 */
export function Trophee({ place, equipe = false, taille = 40, delai = 0 }: { place: number | null; equipe?: boolean; taille?: number; delai?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (place === 1) {
    return (
      <svg viewBox="0 0 64 64" width={taille} height={taille} aria-label={equipe ? "Victoire par équipe" : "Victoire"} role="img" className="trophee">
        <defs>
          <linearGradient id={`o${id}`} x1="0" x2="1">
            <stop offset="0" stopColor="#a87400" /><stop offset=".45" stopColor="#ffe680" /><stop offset=".6" stopColor="#ffd23a" /><stop offset="1" stopColor="#b98300" />
          </linearGradient>
          <clipPath id={`c${id}`}><path d="M18 6 h28 v12 c0 11-6 19-14 19 S18 29 18 18z" /><rect x="29" y="36" width="6" height="7" /><path d="M21 43 h22 l3 7 H18z" /></clipPath>
        </defs>
        <path d="M19 10 H11 c0 9 4 15 11 16" fill="none" stroke={`url(#o${id})`} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M45 10 H53 c0 9-4 15-11 16" fill="none" stroke={`url(#o${id})`} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M18 6 h28 v12 c0 11-6 19-14 19 S18 29 18 18z" fill={`url(#o${id})`} />
        <path d="M23 9 v9 c0 6 3 11 6 13" fill="none" stroke="#ffffff88" strokeWidth="2" />
        <rect x="29" y="36" width="6" height="7" fill={`url(#o${id})`} />
        <path d="M21 43 h22 l3 7 H18z" fill={`url(#o${id})`} />
        <rect x="15" y="50" width="34" height="9" rx="2" fill="#2b1d0a" />
        <text x="32" y="57" textAnchor="middle" fontSize="7" fontWeight="900" fill="#ffd54a" fontFamily="Arial, sans-serif">{equipe ? "ÉQUIPE" : "1er"}</text>
        {equipe ? <text x="32" y="25" textAnchor="middle" fontSize="11">👥</text> : <text x="32" y="25" textAnchor="middle" fontSize="10" fontWeight="900" fill="#7a5200">★</text>}
        <g clipPath={`url(#c${id})`}>
          <rect x="-40" y="-10" width="14" height="90" fill="#fff" opacity=".75" transform="skewX(-20)">
            <animate attributeName="x" values="-40;90;90" keyTimes="0;.45;1" dur="3s" begin={`${delai}s`} repeatCount="indefinite" />
          </rect>
        </g>
      </svg>
    );
  }
  const c = place === 2 ? ["#8d99a6", "#f4f7fa", "#a9b4bf"] : place === 3 ? ["#8a4f22", "#f0b27a", "#a5622d"] : ["#2f5d73", "#9fdcf0", "#3d7891"];
  const t = place === 2 ? "2e" : place === 3 ? "3e" : place === 5 ? "¼" : place === 9 ? "8e" : place === 17 ? "16e" : place ? `${place}e` : "✓";
  return (
    <svg viewBox="0 0 64 64" width={taille} height={taille} aria-label={place ? `${t} place` : "Participation"} role="img" className="trophee">
      <defs>
        <radialGradient id={`m${id}`} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor={c[1]} /><stop offset=".6" stopColor={c[2]} /><stop offset="1" stopColor={c[0]} /></radialGradient>
        <clipPath id={`c${id}`}><circle cx="32" cy="40" r="19" /></clipPath>
      </defs>
      <path d="M20 2 h10 l6 20 h-10z" fill="#c8102e" />
      <path d="M44 2 h-10 l-6 20 h10z" fill="#ffd54a" />
      <circle cx="32" cy="40" r="19" fill={`url(#m${id})`} stroke={c[0]} strokeWidth="2" />
      <circle cx="32" cy="40" r="14" fill="none" stroke="#ffffff66" strokeWidth="1.5" />
      <text x="32" y={t === "¼" ? 47 : 46} textAnchor="middle" fontSize={t.length > 2 ? 13 : 17} fontWeight="900" fill="#1d1716" fontFamily="Arial, sans-serif">{t}</text>
      <g clipPath={`url(#c${id})`}>
        <rect x="-30" y="10" width="10" height="70" fill="#fff" opacity=".7" transform="skewX(-20)">
          <animate attributeName="x" values="-30;90;90" keyTimes="0;.45;1" dur="3.4s" begin={`${delai}s`} repeatCount="indefinite" />
        </rect>
      </g>
      {equipe ? <><circle cx="49" cy="26" r="8" fill="#00e5ff" /><text x="49" y="30" textAnchor="middle" fontSize="10">👥</text></> : null}
    </svg>
  );
}

