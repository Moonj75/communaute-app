import { getVue, estInactif } from "@/lib/profil";
import { essayer, lireCalendrier, lireParticipations, lireTaches } from "@/lib/club";
import { chargerJoueurs } from "@/lib/donnees";
import { urgences, urgencesMatchs } from "@/lib/urgences";
import { lireEnCours } from "@/lib/internes-db";
import { matchsAValider, situations } from "@/lib/internes";
import { droitsValideur } from "@/lib/valideurs";
import { lireEligibles } from "@/lib/eligibles";
import { lireNonLus } from "@/lib/courrier";
import Defilant from "./Defilant";

/** Scrolling band under the top banner with what the player must do now; nothing → no band. */
export default async function BandeauUrgent() {
  try {
    const { supabase, user, profil } = await getVue();
    if (!user) return null;
    const nonLus = await lireNonLus(supabase, user.email || "", profil?.role === "admin");
    if (estInactif(profil)) {
      // A non-active member may still play the club championship: his matches count too.
      const l0 = urgences([], [], [], null, undefined, undefined, nonLus);
      try {
        const fam = await chargerJoueurs(supabase, user.email);
        l0.push(...urgencesMatchs(situations(await lireEnCours(supabase), fam.map((j) => j.notionId)), undefined, fam.length > 1));
      } catch { /* competitions not installed yet */ }
      return l0.length ? <Defilant items={l0} /> : null;
    }
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
      const enCours = await lireEnCours(supabase);
      const sits = situations(enCours, famille.map((j) => j.notionId));
      l.push(...urgencesMatchs(sits, undefined, famille.length > 1));
      // Validators: scores waiting for a validation (not their own matches).
      const droits = await droitsValideur(supabase, user.email, admin);
      if (droits.ok) {
        const n = matchsAValider(enCours).filter((x) => !droits.miens.includes(x.a.id) && !droits.miens.includes(x.b.id)).length;
        if (n) l.push({ ic: "✅", txt: `${n} score${n > 1 ? "s" : ""} à valider`, quoi: `${n} score${n > 1 ? "s" : ""} à valider`, detail: "Compétitions du club · valideur", href: "/internes#bloc-a-valider", niveau: "moyen" });
      }
    } catch { /* competitions not installed yet */ }
    if (!l.length) return null;
    return <Defilant items={l} />;
  } catch {
    return null;
  }
}
