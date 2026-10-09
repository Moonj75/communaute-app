-- Étape 8 : les membres non actifs peuvent se connecter (espace « découverte » limité)
-- À coller dans Supabase → SQL Editor → Run. Peut être relancé sans risque.

-- 1. Le profil retient si la personne est active.
alter table public.profils add column if not exists actif boolean not null default true;
update public.profils p set actif = m.actif from public.membres m where m.email = p.email;

-- 2. Première connexion : tout membre connu du club est accepté (actif ou non).
create or replace function public.gerer_nouvel_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.membres%rowtype;
begin
  select * into m from public.membres where email = lower(new.email);
  if not found then
    raise exception 'acces_refuse: % n''est pas membre du club', new.email;
  end if;
  insert into public.profils (id, email, nom, prenom, role, notion_id, actif)
  values (new.id, lower(new.email), m.nom, m.prenom, m.role, m.notion_id, m.actif)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3. Quand la liste des membres change (synchronisation Notion), le profil suit, y compris « actif ».
create or replace function public.synchroniser_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profils
     set nom = new.nom, prenom = new.prenom, role = new.role, notion_id = new.notion_id, actif = new.actif
   where email = new.email;
  return new;
end;
$$;
