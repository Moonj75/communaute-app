import { NextResponse } from "next/server";
import { lireListe } from "@/lib/classements-lire";
import { LISTES } from "@/lib/classements-types";
import { getSessionProfil } from "@/lib/profil";

/** Lists a visitor (not signed in) may see, only with our club's lines. */
const VISIBLES = ["FBFTS-Clubs", "WR-Teams", "FBFTS", "WR-Open"];

/**
 * One full ranking, for the rankings page (switching from one list to another without reloading the page).
 * Read from the server's memory (the rankings only change once a month); the phone keeps it 6 hours too.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const l = u.searchParams.get("l") || "FBFTS";
  if (!LISTES.some((x) => x.id === l)) return NextResponse.json({ erreur: "Classement inconnu" }, { status: 400 });
  const { user } = await getSessionProfil();
  if (!user && !VISIBLES.includes(l)) return NextResponse.json({ erreur: "Réservé aux membres" }, { status: 403 });
  const lignes = await lireListe(undefined as never, l, user ? "" : "club");
  return NextResponse.json({ l, lignes }, { headers: { "Cache-Control": "private, max-age=21600" } });
}
