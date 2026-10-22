"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfil } from "@/lib/profil";

/** Marks a visitor's contact request as handled (or not). */
export async function basculerContact(fd: FormData) {
  const { supabase, profil } = await getSessionProfil();
  if (profil?.role !== "admin") return;
  const id = String(fd.get("id") || "");
  const traite = String(fd.get("traite") || "") === "1";
  if (id) await supabase.from("contacts").update({ traite }).eq("id", id);
  revalidatePath("/admin", "layout");
}
