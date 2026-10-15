import Link from "next/link";
import { getVue } from "@/lib/profil";
import { lireNonLus } from "@/lib/courrier";
import PastilleAppli from "./PastilleAppli";

/**
 * Round mailbox button at the bottom left of every page (above the bottom bar), with a red badge:
 * the number of unread messages + notifications. A tap opens the Courrier.
 */
export default async function BoiteCourrier() {
  try {
    const { supabase, user, profil, apercu } = await getVue();
    if (!user) return null;
    const n = (await lireNonLus(supabase, user.email || "", profil?.role === "admin" && !apercu)).length;
    return (
      <>
        <Link href="/courrier" className={`boite${n ? " nouveau" : ""}`} aria-label={n ? `Courrier : ${n} non lu${n > 1 ? "s" : ""}` : "Courrier"} title="Courrier : messages et notifications">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M3.5 6h17v12h-17zM3.5 6.5l8.5 7 8.5-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          {n ? <b className="boite-n num">{n > 19 ? "19+" : n}</b> : null}
        </Link>
        <PastilleAppli n={n} />
      </>
    );
  } catch {
    return null;
  }
}
