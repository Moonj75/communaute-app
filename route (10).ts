import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { clientAdmin } from "@/lib/supabase/admin";
import { importerTout } from "@/lib/classements";
import { TAGS } from "@/lib/club";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Monthly rankings update (Vercel Cron, see vercel.json: the 1st of each month at 6:00 UTC).
 * A file already imported is skipped, so only new rankings are processed.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  const db = clientAdmin();
  if (!db) return NextResponse.json({ info: "SUPABASE_SECRET_KEY absente : rien importé" });
  const res = await importerTout(db, "automatique");
  revalidateTag(TAGS.club);
  revalidatePath("/club/classements");
  return NextResponse.json(res);
}
