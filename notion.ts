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
  titulaire: boolean;
  roles: string[];
  cagnotte: number | null;
  telephone: string | null;
  vehicule: string | null;
  categorie: string | null;
  serie: string | null;
  classementBelge: number | null;
  classementInternational: number | null;
  palmares: string | null;
  photo: { nom: string; url: string } | null;
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

function nombre(p?: Prop): number | null {
  return typeof p?.number === "number" ? (p.number as number) : null;
}

function premierFichier(p?: Prop): { nom: string; url: string } | null {
  const f = ((p?.files as { name: string; type: string; file?: { url: string }; external?: { url: string } }[] | undefined) || [])[0];
  if (!f) return null;
  const url = f.type === "external" ? f.external?.url : f.file?.url;
  return url ? { nom: f.name || "photo", url } : null;
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
    titulaire: Boolean(p["Titulaire du compte"]?.checkbox),
    roles,
    cagnotte: typeof p["Cagnotte"]?.number === "number" ? (p["Cagnotte"].number as number) : null,
    telephone: (p["Téléphone"]?.phone_number as string | null) || null,
    vehicule,
    categorie: text(p["Catégorie"]),
    serie: text(p["Série"]),
    classementBelge: nombre(p["Place au classement belge"]),
    classementInternational: nombre(p["Place au classement international"]),
    palmares: text(p["Palmarès"]),
    photo: premierFichier(p["Photo"]),
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

/** « Calendrier Déplacements » database. */
const CALENDRIER_DB = process.env.NOTION_CALENDRIER_DB || "5e3396f3cbec42f996a9a79023a209c7";

export type Competition = { id: string; nom: string; date: string; fin: string | null; lieu: string | null; deplacement: string | null };

/** Next competitions the club has decided to attend (cached one hour). Returns [] if Notion is unreachable. */
export async function prochainesCompetitions(limit = 3): Promise<Competition[]> {
  const token = process.env.NOTION_TOKEN;
  if (!token) return [];
  const today = new Date().toISOString().slice(0, 10);
  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${CALENDRIER_DB}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({
        page_size: limit,
        filter: {
          and: [
            { property: "Date", date: { on_or_after: today } },
            { property: "Type d'évènement", select: { equals: "Compétition" } },
            { property: "Décision participation", select: { equals: "✅ On y va" } },
          ],
        },
        sorts: [{ property: "Date", direction: "ascending" }],
      }),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results: { id: string; properties: Record<string, Prop> }[] };
    return data.results
      .map((p) => {
        const d = p.properties["Date"]?.date as { start?: string; end?: string | null } | null;
        return {
          id: p.id,
          nom: (text(p.properties["Nom"]) || "").replace(/^[^0-9A-Za-zÀ-ÿ]+/, "").trim(),
          date: d?.start || "",
          fin: d?.end || null,
          lieu: text(p.properties["Lieu"]),
          deplacement: (p.properties["Type de déplacement"]?.select as { name?: string } | null)?.name || null,
        };
      })
      .filter((c) => c.nom && c.date);
  } catch {
    return [];
  }
}


/* ---------- Writes on the players database (photo sync) ---------- */
function entetes(token: string) {
  return { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" };
}

/** Uploads a picture to Notion and puts it in the « Photo » column of the player's row. */
export async function envoyerPhotoNotion(pageId: string, fichier: Blob, nom: string): Promise<void> {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN manquant.");
  const cree = await fetch("https://api.notion.com/v1/file_uploads", {
    method: "POST",
    headers: { ...entetes(token), "Content-Type": "application/json" },
    body: JSON.stringify({ filename: nom, content_type: "image/jpeg" }),
    cache: "no-store",
  });
  if (!cree.ok) throw new Error(`Notion (création du fichier) : ${cree.status}`);
  const { id } = (await cree.json()) as { id: string };
  const fd = new FormData();
  fd.append("file", fichier, nom);
  const envoi = await fetch(`https://api.notion.com/v1/file_uploads/${id}/send`, { method: "POST", headers: entetes(token), body: fd, cache: "no-store" });
  if (!envoi.ok) throw new Error(`Notion (envoi du fichier) : ${envoi.status}`);
  const maj = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: { ...entetes(token), "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { Photo: { files: [{ type: "file_upload", file_upload: { id }, name: nom }] } } }),
    cache: "no-store",
  });
  if (!maj.ok) throw new Error(`Notion (mise à jour de la fiche) : ${maj.status}`);
}

/** Empties the « Photo » column of the player's row. */
export async function retirerPhotoNotion(pageId: string): Promise<void> {
  const token = process.env.NOTION_TOKEN;
  if (!token) return;
  const r = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: { ...entetes(token), "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { Photo: { files: [] } } }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Notion : ${r.status}`);
}
