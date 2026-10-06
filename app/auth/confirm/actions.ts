"use server";

import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Verifies the one-time token only when the person clicks the button (mail scanners never POST). */
export async function confirmLogin(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") || "");
  const type = (String(formData.get("type") || "email") as EmailOtpType) || "email";
  if (!tokenHash) redirect("/login?erreur=lien");
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    const msg = (error.message || "").toLowerCase();
    redirect(msg.includes("database error") ? "/login?erreur=acces" : "/login?erreur=lien");
  }
  redirect("/");
}
