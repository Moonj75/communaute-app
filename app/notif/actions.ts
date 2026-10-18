"use server";

import { getSessionProfil } from "@/lib/profil";
import type { Message } from "@/lib/courrier";

const COLS = "id,cree_le,type,de_email,de_nom,a_email,pour_staff,titre,texte,lien,parent,lu";
const sans = (t: string) => t.replace(/^[^\p{L}\p{N}]+/u, "").trim();

/**
 * The full message behind a notification (by its id, or the newest one with that title in my mail),
 * marked as read. Called in the background while the window is already on screen.
 */
export async function ouvrirMessage(q: { id?: string | null; titre?: string | null }): Promise<Message | null> {
  try {
    const { supabase, user, profil } = await getSessionProfil();
    if (!user?.email) return null;
    const moi = user.email.toLowerCase();
    let m: Message | null = null;
    if (q.id && /^[0-9a-f-]{36}$/i.test(q.id)) {
      const { data } = await supabase.from("messages").select(COLS).eq("id", q.id).maybeSingle();
      m = (data as Message) || null;
    } else if (q.titre) {
      const cle = sans(q.titre);
      const { data } = await supabase
        .from("messages")
        .select(COLS)
        .or(`a_email.eq.${moi}${profil?.role === "admin" ? ",pour_staff.eq.true" : ""}`)
        .ilike("titre", `%${cle.slice(0, 60).replace(/[%_,()]/g, " ")}%`)
        .order("cree_le", { ascending: false })
        .limit(5);
      m = ((data || []) as Message[]).find((x) => sans(x.titre) === cle) || ((data || []) as Message[])[0] || null;
    }
    if (m && !m.lu) await supabase.from("messages").update({ lu: true }).eq("id", m.id);
    return m;
  } catch {
    return null;
  }
}
