/**
 * « Bonjour » while it is daylight at Eugies, « Bonsoir » once the sun has set (and until it rises).
 * Sunrise and sunset are computed for the club (NOAA formula, accurate to a few minutes).
 */
const LAT = 50.41;
const LON = 3.86;

function soleil(d: Date) {
  const rad = Math.PI / 180;
  const debut = Date.UTC(d.getUTCFullYear(), 0, 0);
  const jour = Math.floor((d.getTime() - debut) / 86400000);
  const g = ((2 * Math.PI) / 365) * (jour - 1);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(LAT * rad) * Math.cos(decl)) - Math.tan(LAT * rad) * Math.tan(decl)) / rad;
  // Minutes after midnight UTC.
  const lever = 720 - 4 * (LON + ha) - eqt;
  const coucher = 720 - 4 * (LON - ha) - eqt;
  return { lever, coucher };
}

export function salutation(maintenant = new Date()) {
  const { lever, coucher } = soleil(maintenant);
  const min = maintenant.getUTCHours() * 60 + maintenant.getUTCMinutes();
  return min >= lever && min < coucher ? "Bonjour" : "Bonsoir";
}
