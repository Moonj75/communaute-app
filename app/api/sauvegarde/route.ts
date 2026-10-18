import { NextResponse } from "next/server";
import { getSessionProfil } from "@/lib/profil";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Backup of the app's own data (what is NOT in Notion): accounts, players' copy, mail, contacts,
 * forms' concerned players, notification texts, import history. Staff only; downloaded as one JSON file.
 * The rankings are not included (they are imported again from FBFTS / FISTF), nor the phones' notification keys.
 */
const TABLES = ["membres", "profils", "joueurs", "formulaire_joueurs", "messages", "contacts", "notif_modeles", "push_journal", "classements_imports"];

export async function GET() {
  const { supabase, profil, user } = await getSessionProfil();
  if (!user || profil?.role !== "admin") return NextResponse.json({ erreur: "Réservé aux administrateurs." }, { status: 403 });
  const contenu: Record<string, unknown[] | string> = {};
  for (const t of TABLES) {
    const lignes: unknown[] = [];
    for (let de = 0; de < 20000; de += 1000) {
      const { data, error } = await supabase.from(t).select("*").range(de, de + 999);
      if (error) { contenu[t] = `non sauvegardé : ${error.message}`; break; }
      lignes.push(...(data || []));
      if (!data || data.length < 1000) { contenu[t] = lignes; break; }
    }
  }
  const quand = new Date().toISOString();
  const nom = `sauvegarde-lions-eugies-${quand.slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify({ app: "SC Lions d'Eugies", faite_le: quand, par: user.email, tables: contenu }, null, 1), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${nom}"`, "Cache-Control": "no-store" },
  });
}
