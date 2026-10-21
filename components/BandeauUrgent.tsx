import { getVue, estInactif } from "@/lib/profil";
import { essayer, lireCalendrier, lireParticipations, lireTaches } from "@/lib/club";
import { chargerJoueurs } from "@/lib/donnees";
import { urgences, urgencesMatchs } from "@/lib/urgences";
import { lireEnCours } from "@/lib/internes-db";
import { situations } from "@/lib/internes";
import { lireEligibles } from "@/lib/eligibles";
import { lireNonLus } from "@/lib/courrier";
import Defilant from "./Defilant";

/** Scrolling band under the top banner with what the player must do now; nothing → no band. */
export default async function BandeauUrgent() {
  try {
    const { supabase, user, profil } = await getVue();
    if (!user) return null;
    const nonLus = await lireNonLus(supabase, user.email || "", profil?.role === "admin");
    if (estInactif(profil)) return nonLus.length ? <Defilant items={urgences([], [], [], null, undefined, undefined, nonLus)} /> : null;
    const admin = profil?.role === "admin";
    const [cal, parts, famille, taches, elig] = await Promise.all([
      essayer(lireCalendrier),
      essayer(lireParticipations),
      chargerJoueurs(supabase, user.email),
      admin ? essayer(lireTaches) : Promise.resolve({ data: null, erreur: null }),
      lireEligibles(supabase),
    ]);
    const l = urgences(cal.data || [], parts.data || [], famille.filter((j) => j.actif), taches.data, undefined, elig, nonLus);
    // Club competitions: matches still to play when the stage ends soon.
    try {
      const sits = situations(await lireEnCours(supabase), famille.map((j) => j.notionId));
      l.push(...urgencesMatchs(sits, undefined, famille.length > 1));
    } catch { /* competitions not installed yet */ }
    if (!l.length) return null;
    return <Defilant items={l} />;
  } catch {
    return null;
  }
}
