-- =====================================================================
--  SC Lions d'Eugies — Étape 1 : membres, profils, rôles et sécurité
--  À coller dans Supabase → SQL Editor → New query → Run.
--  Le script peut être relancé sans risque (il ne supprime aucune donnée).
-- =====================================================================

-- 1. Liste des membres autorisés à se connecter -------------------------
--    Seules les adresses présentes ici peuvent recevoir un lien de connexion.
create table if not exists public.membres (
  email       text primary key check (email = lower(email)),
  nom         text not null,
  prenom      text,
  role        text not null default 'joueur' check (role in ('admin', 'joueur')),
  actif       boolean not null default true,
  notion_id   text,
  created_at  timestamptz not null default now()
);

-- 2. Profil de chaque personne connectée ---------------------------------
create table if not exists public.profils (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  nom         text,
  prenom      text,
  role        text not null default 'joueur' check (role in ('admin', 'joueur')),
  notion_id   text,
  created_at  timestamptz not null default now()
);

alter table public.membres enable row level security;
alter table public.profils enable row level security;

-- 3. Est-ce que la personne connectée est administrateur ? ---------------
create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profils where id = auth.uid() and role = 'admin'
  );
$$;
revoke all on function public.est_admin() from public;
grant execute on function public.est_admin() to authenticated;

-- 4. Règles d'accès (RLS) ------------------------------------------------
drop policy if exists "profil : lire le sien ou tout si admin" on public.profils;
create policy "profil : lire le sien ou tout si admin"
  on public.profils for select to authenticated
  using (id = auth.uid() or public.est_admin());

drop policy if exists "membres : admin lit" on public.membres;
create policy "membres : admin lit"
  on public.membres for select to authenticated
  using (public.est_admin());

drop policy if exists "membres : admin ajoute" on public.membres;
create policy "membres : admin ajoute"
  on public.membres for insert to authenticated
  with check (public.est_admin());

drop policy if exists "membres : admin modifie" on public.membres;
create policy "membres : admin modifie"
  on public.membres for update to authenticated
  using (public.est_admin()) with check (public.est_admin());

drop policy if exists "membres : admin supprime" on public.membres;
create policy "membres : admin supprime"
  on public.membres for delete to authenticated
  using (public.est_admin());

-- 5. À la première connexion : créer le profil, ou refuser l'inconnu -----
create or replace function public.gerer_nouvel_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.membres%rowtype;
begin
  select * into m from public.membres
   where email = lower(new.email) and actif;
  if not found then
    raise exception 'acces_refuse: % n''est pas membre du club', new.email;
  end if;
  insert into public.profils (id, email, nom, prenom, role, notion_id)
  values (new.id, lower(new.email), m.nom, m.prenom, m.role, m.notion_id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.gerer_nouvel_utilisateur();

-- 6. Quand un admin modifie un membre, son profil suit ------------------
create or replace function public.synchroniser_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profils
     set nom = new.nom, prenom = new.prenom, role = new.role, notion_id = new.notion_id
   where email = new.email;
  return new;
end;
$$;

drop trigger if exists on_membre_updated on public.membres;
create trigger on_membre_updated
  after update on public.membres
  for each row execute function public.synchroniser_profil();

-- 7. Premier administrateur ----------------------------------------------
insert into public.membres (email, nom, prenom, role)
values ('rouis.mongi.ad13@gmail.com', 'Rouis', 'Mongi', 'admin')
on conflict (email) do update set role = 'admin', actif = true;
