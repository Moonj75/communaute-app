import { cookies } from "next/headers";

/** Page asked before the login (set by the middleware), or « / ». Only internal paths are accepted. */
export async function pageDeRetour(): Promise<string> {
  const jar = await cookies();
  const v = jar.get("lions_retour")?.value || "";
  try {
    jar.delete("lions_retour");
  } catch {
    /* read-only context */
  }
  return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "/";
}
