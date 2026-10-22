import { getVue } from "@/lib/profil";
import PluieGain, { type Gain } from "./PluieGain";

/**
 * Kitty gains of the logged-in member (his fiches and their shared kitties) from the last days.
 * The client part shows the « +20 € » ones he has not seen yet, with a slot-machine « ting ».
 */
export default async function Gains() {
  try {
    const { supabase, user } = await getVue();
    if (!user?.email) return null;
    const { data: moi } = await supabase.from("joueurs").select("notion_id,cagnotte_groupe").eq("email", user.email.toLowerCase());
    const fiches = (moi || []) as { notion_id: string; cagnotte_groupe: string | null }[];
    if (!fiches.length) return null;
    const ids = new Set(fiches.map((f) => f.notion_id));
    const groupes = [...new Set(fiches.map((f) => f.cagnotte_groupe).filter(Boolean))] as string[];
    if (groupes.length) {
      const { data } = await supabase.from("joueurs").select("notion_id").in("cagnotte_groupe", groupes);
      for (const x of (data || []) as { notion_id: string }[]) ids.add(x.notion_id);
    }
    const depuis = new Date(Date.now() - 14 * 864e5).toISOString();
    const { data, error } = await supabase
      .from("cag_mouvements")
      .select("id,montant,libelle,valide_le")
      .in("joueur_id", [...ids])
      .eq("sens", "gain")
      .eq("statut", "valide")
      .neq("categorie", "Solde de départ")
      .gte("valide_le", depuis)
      .order("valide_le", { ascending: true })
      .limit(30);
    if (error || !data?.length) return <PluieGain gains={[]} cle={user.email} />;
    return <PluieGain gains={(data as Gain[]).map((g) => ({ ...g, montant: Number(g.montant) }))} cle={user.email} />;
  } catch {
    return null;
  }
}
