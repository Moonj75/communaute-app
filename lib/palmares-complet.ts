import { revalidateTag } from "next/cache";
import { TAGS, completerResultatNotion, lirePalmares } from "./club";
import { avecDates } from "./palmares-types";

/**
 * Every morning (cron): the results with an empty « Lieu » or « Date » (or a season written with the year only)
 * are completed in Notion with what the club calendar says about the same competition.
 * A few at a time, so Notion is never flooded; what was typed by hand is never changed.
 */
export async function completerPalmares(evs: { nom: string; date: string | null; lieu?: string | null }[], max = 40) {
  const avant = await lirePalmares(true);
  const apres = avecDates(avant, evs);
  let n = 0;
  for (let k = 0; k < avant.length && n < max; k++) {
    const a = avant[k], b = apres[k];
    const v = {
      date: !a.date && b.date ? b.date : null,
      lieu: !a.lieu && b.lieu ? b.lieu : null,
      saison: b.saison && b.saison !== a.saison ? b.saison : null,
    };
    if (!v.date && !v.lieu && !v.saison) continue;
    await completerResultatNotion(a.id, v).catch(() => null);
    n++;
  }
  if (n) revalidateTag(TAGS.palmares);
  return { completes: n };
}
