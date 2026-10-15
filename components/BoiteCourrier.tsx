import Link from "next/link";
import { getVue } from "@/lib/profil";
import { lireNonLus } from "@/lib/courrier";

/** Mailbox icon in the top banner, with the number of unread messages and notifications. */
export default async function BoiteCourrier() {
  try {
    const { supabase, user, profil, apercu } = await getVue();
    if (!user) return null;
    const n = (await lireNonLus(supabase, user.email || "", profil?.role === "admin" && !apercu)).length;
    return (
      <Link href="/courrier" className={`boite${n ? " nouveau" : ""}`} aria-label={n ? `Courrier : ${n} non lu${n > 1 ? "s" : ""}` : "Courrier"} title="Courrier">
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path d="M3.5 6h17v12h-17zM3.5 6.5l8.5 7 8.5-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        {n ? <b className="boite-n num">{n > 19 ? "19+" : n}</b> : null}
        <span className="boite-t">{n ? "Nouveau" : "Courrier"}</span>
      </Link>
    );
  } catch {
    return null;
  }
}
