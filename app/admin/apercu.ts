"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_APERCU, getSessionProfil } from "@/lib/profil";

export async function commencerApercu(formData: FormData) {
  const { profil } = await getSessionProfil();
  if (profil?.role !== "admin") redirect("/");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) redirect("/admin");
  (await cookies()).set(COOKIE_APERCU, email, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 2 });
  redirect("/");
}

export async function quitterApercu() {
  (await cookies()).delete(COOKIE_APERCU);
  redirect("/admin");
}
