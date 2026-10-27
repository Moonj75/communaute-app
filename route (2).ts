import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { clientAdmin } from "@/lib/supabase/admin";
import { TAGS } from "@/lib/club";
import { traiterEntrainements } from "@/lib/entrainements-cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Trainings: Monday reminders and the confirmation / cancellation after Monday 21:00.
 * Called every hour by Supabase (pg_cron, SQL step 21) with its own secret token; nobody else can trigger it.
 */
export async function GET(req: NextRequest) {
  const db = clientAdmin();
  if (!db) return NextResponse.json({ info: "SUPABASE_SECRET_KEY absente" });
  // Accepted: the Vercel CRON_SECRET, or the token created in Supabase by SQL step 21 (nothing to copy by hand).
  const auth = req.headers.get("authorization") || "";
  const { data: j } = await db.from("cron_jetons").select("jeton").eq("nom", "entrainements").maybeSingle();
  const permis = [process.env.CRON_SECRET, (j as { jeton?: string } | null)?.jeton].filter((x): x is string => Boolean(x && x.length >= 16));
  if (!permis.some((x) => auth === `Bearer ${x}`)) return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  const r = await traiterEntrainements(db);
  if (r.decisions.length) revalidateTag(TAGS.entrainements);
  return NextResponse.json(r);
}
