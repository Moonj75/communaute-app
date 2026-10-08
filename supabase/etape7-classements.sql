-- Étape 7 : classements nationaux (FBFTS) et mondiaux (FISTF)
-- À coller dans Supabase → SQL Editor → Run. Peut être relancé sans risque.

-- 1. Toutes les lignes des classements (le dernier relevé de chaque liste).
create table if not exists public.classements (
  id bigint generated always as identity primary key,
  liste text not null,            -- FBFTS, FBFTS-Clubs, WR-Open, WR-Veterans, WR-Women, WR-U20, WR-U16, WR-U12, WR-Teams
  mois text not null,             -- 2026-10
  rang integer not null,
  nom text not null,
  prenom text,
  club text,
  pays text,
  categorie text,
  categorie_suivante text,
  points numeric,
  evolution text,
  a_defendre numeric,
  eugies boolean not null default false,
  joueur_id text,                 -- notion_id du joueur du club reconnu
  cree_le timestamptz not null default now()
);
create index if not exists classements_liste_rang on public.classements (liste, rang);
create index if not exists classements_joueur on public.classements (joueur_id);

-- 2. Journal des imports (un par source).
create table if not exists public.classements_imports (
  source text primary key,        -- fbfts | fistf
  mois text,
  libelle text,
  empreinte text,
  nb integer,
  importe_le timestamptz not null default now(),
  par text
);

-- 3. Lecture pour tout le monde (ce sont des classements publics), écriture réservée aux admins.
alter table public.classements enable row level security;
alter table public.classements_imports enable row level security;

drop policy if exists "classements : lecture" on public.classements;
create policy "classements : lecture" on public.classements for select to anon, authenticated using (true);
drop policy if exists "classements : admin" on public.classements;
create policy "classements : admin" on public.classements for all to authenticated using (public.est_admin()) with check (public.est_admin());

drop policy if exists "imports : lecture" on public.classements_imports;
create policy "imports : lecture" on public.classements_imports for select to anon, authenticated using (true);
drop policy if exists "imports : admin" on public.classements_imports;
create policy "imports : admin" on public.classements_imports for all to authenticated using (public.est_admin()) with check (public.est_admin());

-- 4. Catégorie nationale sur la fiche joueur.
alter table public.joueurs add column if not exists categorie_nationale text;
