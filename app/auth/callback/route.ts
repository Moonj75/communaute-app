import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pageDeRetour } from "@/lib/retour";

/** Magic-link landing: exchanges the one-time code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${await pageDeRetour()}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as "email" | "magiclink" });
    if (!error) return NextResponse.redirect(`${origin}${await pageDeRetour()}`);
  }
  return NextResponse.redirect(`${origin}/login?erreur=lien`);
}
