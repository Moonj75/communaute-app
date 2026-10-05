"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Cette adresse e-mail ne semble pas valide.", email };
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: true },
  });

  if (error) {
    const msg = (error.message || "").toLowerCase();
    // The database trigger refuses addresses that are not in the club's member list.
    if (msg.includes("database error") || msg.includes("acces_refuse")) {
      return {
        status: "error",
        message: "Cette adresse n'est pas encore enregistrée au club. Demandez à un administrateur de vous ajouter.",
        email,
      };
    }
    if (error.status === 429 || msg.includes("rate limit") || msg.includes("security purposes")) {
      return { status: "error", message: "Trop de demandes. Patientez une minute avant de redemander un lien.", email };
    }
    return { status: "error", message: "Impossible d'envoyer le lien pour le moment. Réessayez dans un instant.", email };
  }
  return { status: "sent", email };
}
