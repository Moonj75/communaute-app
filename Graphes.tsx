/* Small SVG charts ported from the original Claude dashboard (server-rendered, no library). */

export function Anneau({ v, taille = 84, epaisseur = 10, couleur, piste = "var(--line2)" }: { v: number; taille?: number; epaisseur?: number; couleur: string; piste?: string }) {
  const r = (taille - epaisseur) / 2;
  const c = 2 * Math.PI * r;
  const d = (Math.max(0, Math.min(100, v)) / 100) * c;
  const m = taille / 2;
  return (
    <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} aria-hidden="true">
      <circle cx={m} cy={m} r={r} fill="none" stroke={piste} strokeWidth={epaisseur} />
      <circle cx={m} cy={m} r={r} fill="none" stroke={couleur} strokeWidth={epaisseur} strokeLinecap="round" strokeDasharray={`${d.toFixed(2)} ${c.toFixed(2)}`} transform={`rotate(-90 ${m} ${m})`} />
    </svg>
  );
}

/** Green when the goal is reached, red when far from it. */
export function couleurObjectif(v: number) {
  const x = Math.max(0, Math.min(100, v));
  return `hsl(${Math.round(x * 1.3)}, 72%, ${x >= 100 ? 40 : 46}%)`;
}

export function Donut({ segs, total }: { segs: { label: string; v: number; col: string; pointille?: boolean }[]; total: number }) {
  const size = 150, st = 18, r = (size - st) / 2, c = 2 * Math.PI * r;
  const gap = segs.filter((x) => x.v > 0).length > 1 ? 3 : 0;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 150 150" role="img" aria-label={segs.map((x) => `${x.label} ${x.v}`).join(", ")}>
      <circle cx="75" cy="75" r={r} fill="none" stroke="var(--line2)" strokeWidth={st} />
      {segs.map((x) => {
        if (!x.v || !total) return null;
        const len = (x.v / total) * c;
        const vis = Math.max(0, len - gap);
        const el = (
          <circle key={x.label} cx="75" cy="75" r={r} fill="none" stroke={x.col} strokeWidth={st} strokeDasharray={`${vis.toFixed(2)} ${c.toFixed(2)}`} strokeDashoffset={(-off).toFixed(2)} transform="rotate(-90 75 75)" opacity={x.pointille ? 0.5 : 1}>
            <title>{`${x.label} : ${x.v}`}</title>
          </circle>
        );
        off += len;
        return el;
      })}
    </svg>
  );
}

/** Cumulative answers per day (black) and « Oui » (green), with the goal line. */
export function Rythme({ points, debut, fin, objectif, max }: { points: { t: string; oui: boolean }[]; debut: string; fin: string; objectif: number | null; max: number }) {
  const DAY = 864e5;
  const t0 = Date.parse(debut.slice(0, 10));
  const days = Math.max(1, Math.round((Date.parse(fin.slice(0, 10)) - t0) / DAY));
  const W = 1000, H = 130, L = 30, R = 12, T = 10, B = 22;
  const ymax = Math.max(max, objectif || 0, 1);
  const X = (d: number) => L + (W - L - R) * (d / days);
  const Y = (v: number) => T + (H - T - B) * (1 - v / ymax);
  const tri = [...points].sort((a, b) => a.t.localeCompare(b.t));
  const cumA: number[] = [], cumO: number[] = [];
  let ia = 0, io = 0, j = 0;
  for (let d = 0; d <= days; d++) {
    const lim = t0 + (d + 1) * DAY;
    while (j < tri.length && Date.parse(tri[j].t) < lim) {
      ia++;
      if (tri[j].oui) io++;
      j++;
    }
    cumA.push(ia);
    cumO.push(io);
  }
  const path = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const lbl = (d: number) => new Date(t0 + d * DAY).toLocaleDateString("fr-BE", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rythme" role="img" aria-label={`${ia} réponses dont ${io} oui`}>
      {[0, Math.round(ymax / 2), ymax].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--line2)" />
          <text x={L - 6} y={Y(v) + 4} textAnchor="end" className="ax">{v}</text>
        </g>
      ))}
      {objectif ? <line x1={L} x2={W - R} y1={Y(objectif)} y2={Y(objectif)} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="5 4" /> : null}
      <path d={`${path(cumA)} L${X(days)} ${Y(0)} L${X(0)} ${Y(0)} Z`} fill="var(--fg)" opacity=".07" />
      <path d={path(cumA)} fill="none" stroke="var(--fg)" strokeWidth="2" strokeLinejoin="round" />
      <path d={path(cumO)} fill="none" stroke="var(--yes)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={X(days)} cy={Y(io)} r="5" fill="var(--yes)" stroke="var(--surface)" strokeWidth="2" />
      {[0, days].concat(days > 4 ? [Math.round(days / 2)] : []).map((d) => (
        <text key={d} x={X(d)} y={H - 6} className="ax" textAnchor={d === 0 ? "start" : d === days ? "end" : "middle"}>{lbl(d)}</text>
      ))}
    </svg>
  );
}
