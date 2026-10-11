import { getVue, estInactif } from "@/lib/profil";
import { essayer, lireCalendrier, lireParticipations, lireTaches } from "@/lib/club";
import { chargerJoueurs } from "@/lib/donnees";
import { urgences } from "@/lib/urgences";
import Defilant from "./Defilant";

/** Scrolling band under the top banner with what the player must do now; nothing → no band. */
export default async function BandeauUrgent() {
  try {
    const { supabase, user, profil } = await getVue();
    if (!user || estInactif(profil)) return null;
    const admin = profil?.role === "admin";
    const [cal, parts, famille, taches] = await Promise.all([
      essayer(lireCalendrier),
      essayer(lireParticipations),
      chargerJoueurs(supabase, user.email),
      admin ? essayer(lireTaches) : Promise.resolve({ data: null, erreur: null }),
    ]);
    const l = urgences(cal.data || [], parts.data || [], famille.filter((j) => j.actif), taches.data);
    if (!l.length) return null;
    return <Defilant items={l} />;
  } catch {
    return null;
  }
}
