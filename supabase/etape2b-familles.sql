-- =====================================================================
--  SC Lions d'Eugies — Étape 2b : comptes famille
--  Une personne = une fiche « joueurs » ; plusieurs fiches peuvent partager
--  le même e-mail de connexion (un parent et ses enfants).
-- =====================================================================

create table if not exists public.joueurs (
  notion_id  text primary key,
  email      text,                     -- e-mail de connexion du compte (peut être partagé)
  nom        text not null,
  prenom     text,
  actif      boolean not null default true,
  titulaire  boolean not null default false,
  roles      text[] not null default '{}',
  cagnotte   numeric(10,2),
  telephone  text,
  vehicule   text,
  categorie  text,
  serie      text,
  synced_at  timestamptz
);
create index if not exists joueurs_email_idx on public.joueurs (email);
alter table public.joueurs enable row level security;

-- Le titulaire du compte voit toutes les fiches de sa famille ; l'admin voit tout.
drop policy if exists "joueurs : lire sa famille" on public.joueurs;
create policy "joueurs : lire sa famille"
  on public.joueurs for select to authenticated
  using (email = lower(auth.jwt() ->> 'email') or public.est_admin());

drop policy if exists "joueurs : admin écrit" on public.joueurs;
create policy "joueurs : admin écrit"
  on public.joueurs for all to authenticated
  using (public.est_admin()) with check (public.est_admin());
