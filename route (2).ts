import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { clientAdmin } from "@/lib/supabase/admin";
import { TAGS } from "@/lib/club";
import { traiterEntrainements } from "@/lib/entrainements-cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Trainings: Monday reminders and the confirmation / cancellation after Monday 21:00.
 * Called every hour by Supabase (pg_cron, SQL step 21) with the CRON_SECRET; nobody else can trigger it.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  const db = clientAdmin();
  if (!db) return NextResponse.json({ info: "SUPABASE_SECRET_KEY absente" });
  const r = await traiterEntrainements(db);
  if (r.decisions.length) revalidateTag(TAGS.entrainements);
  return NextResponse.json(r);
}
