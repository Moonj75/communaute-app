import "server-only";

/** « Liste des joueurs » database in Notion (page Deplacements). */
const JOUEURS_DB = process.env.NOTION_JOUEURS_DB || "3e3292528add80358107e88c3d8af12f";

export type JoueurNotion = {
  notionId: string;
  nomComplet: string;
  prenom: string | null;
  nom: string;
  email: string | null;
  actif: boolean;
  admin: boolean;
  roles: string[];
  cagnotte: number | null;
  telephone: string | null;
  vehicule: string | null;
  categorie: string | null;
  serie: string | null;
};

type Prop = Record<string, unknown> & { type: string };

function text(p?: Prop): string | null {
  if (!p) return null;
  const arr = (p[p.type] as { plain_text?: string }[] | undefined) ?? [];
  if (Array.isArray(arr)) {
    const s = arr.map((t) => t.plain_text || "").join("").trim();
    return s || null;
  }
  return null;
}

function parse(page: { id: string; properties: Record<string, Prop> }): JoueurNotion {
  const p = page.properties;
  const nomComplet = (text(p["Nom complet"]) || "").replace(/\s*\(\d+\)\s*$/, "").trim();
  const prenom = text(p["Prénom"]);
  let nom = nomComplet;
  if (prenom && nom.toLowerCase().startsWith(prenom.toLowerCase())) nom = nom.slice(prenom.length).trim();
  const email = ((p["Email"]?.email as string | null) || "").trim().toLowerCase() || null;
  const acces = (p["Accès application"]?.select as { name?: string } | null)?.name || "";
  const roles = ((p["Rôles"]?.multi_select as { name: string }[] | undefined) || []).map((r) => r.name);
  const vehicule = (p["Véhicule"]?.select as { name?: string } | null)?.name || null;
  return {
    notionId: page.id,
    nomComplet,
    prenom,
    nom: nom || nomComplet,
    email,
    actif: Boolean(p["Actif"]?.checkbox),
    admin: acces === "Administrateur",
    roles,
    cagnotte: typeof p["Cagnotte"]?.number === "number" ? (p["Cagnotte"].number as number) : null,
    telephone: (p["Téléphone"]?.phone_number as string | null) || null,
    vehicule,
    categorie: text(p["Catégorie"]),
    serie: text(p["Série"]),
  };
}

/** Reads every row of the players database (server side only, with the integration secret). */
export async function lireJoueurs(): Promise<JoueurNotion[]> {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN manquant dans Vercel (Settings → Environment Variables).");
  const out: JoueurNotion[] = [];
  let cursor: string | undefined;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${JOUEURS_DB}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401) throw new Error("Le secret Notion est refusé : vérifiez NOTION_TOKEN dans Vercel.");
      if (res.status === 404)
        throw new Error("Notion ne trouve pas la Liste des joueurs : connectez « Lions Eugies App » à la page Deplacements (••• → Connexions).");
      throw new Error(`Notion a répondu ${res.status} : ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      results: { id: string; properties: Record<string, Prop>; archived?: boolean; in_trash?: boolean }[];
      has_more: boolean;
      next_cursor: string | null;
    };
    for (const page of data.results) if (!page.archived && !page.in_trash) out.push(parse(page));
    cursor = data.has_more ? data.next_cursor || undefined : undefined;
  } while (cursor);
  return out.filter((j) => j.nomComplet);
}
