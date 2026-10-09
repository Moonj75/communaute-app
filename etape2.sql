-- =====================================================================
--  SC Lions d'Eugies — Étape 2 : fiches joueurs synchronisées avec Notion
--  À coller dans Supabase → SQL Editor → New query → Run.
-- =====================================================================

alter table public.membres add column if not exists telephone  text;
alter table public.membres add column if not exists roles      text[] not null default '{}';
alter table public.membres add column if not exists cagnotte   numeric(10,2);
alter table public.membres add column if not exists vehicule   text;
alter table public.membres add column if not exists categorie  text;
alter table public.membres add column if not exists serie      text;
alter table public.membres add column if not exists synced_at  timestamptz;

-- Chaque membre connecté peut lire SA propre fiche (et rien d'autre).
drop policy if exists "membres : lire sa fiche" on public.membres;
create policy "membres : lire sa fiche"
  on public.membres for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));
