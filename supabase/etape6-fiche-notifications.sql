-- =====================================================================
--  SC Lions d'Eugies — Étape 6 : classements, palmarès, photo Notion
--  et notifications. À coller dans Supabase → SQL Editor → Run.
--  Relançable sans risque (ne supprime aucune donnée).
-- =====================================================================

-- 1. Nouvelles informations de la fiche ---------------------------------
alter table public.joueurs add column if not exists classement_belge integer;
alter table public.joueurs add column if not exists classement_international integer;
alter table public.joueurs add column if not exists palmares text;
-- Nom du fichier photo connu dans Notion (sert à synchroniser dans les deux sens)
alter table public.joueurs add column if not exists photo_notion text;

create or replace function public.definir_photo_notion(p_notion_id text, p_nom text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.peut_gerer_photo(p_notion_id) then
    raise exception 'photo_interdite';
  end if;
  update public.joueurs set photo_notion = p_nom where notion_id = p_notion_id;
end;
$$;
revoke all on function public.definir_photo_notion(text, text) from public;
grant execute on function public.definir_photo_notion(text, text) to authenticated;

-- 2. Notifications : appareils abonnés ----------------------------------
create table if not exists public.push_abonnements (
  endpoint    text primary key,
  email       text not null,
  p256dh      text not null,
  auth        text not null,
  appareil    text,
  created_at  timestamptz not null default now()
);
create index if not exists push_abonnements_email_idx on public.push_abonnements (email);
alter table public.push_abonnements enable row level security;

drop policy if exists "push : lire les siens" on public.push_abonnements;
create policy "push : lire les siens" on public.push_abonnements for select to authenticated
  using (email = lower(auth.jwt() ->> 'email') or public.est_admin());
drop policy if exists "push : s'abonner" on public.push_abonnements;
create policy "push : s'abonner" on public.push_abonnements for insert to authenticated
  with check (email = lower(auth.jwt() ->> 'email'));
drop policy if exists "push : mettre à jour" on public.push_abonnements;
create policy "push : mettre à jour" on public.push_abonnements for update to authenticated
  using (email = lower(auth.jwt() ->> 'email')) with check (email = lower(auth.jwt() ->> 'email'));
drop policy if exists "push : se désabonner" on public.push_abonnements;
create policy "push : se désabonner" on public.push_abonnements for delete to authenticated
  using (email = lower(auth.jwt() ->> 'email') or public.est_admin());

-- 3. Journal des envois automatiques (évite les doublons) ----------------
create table if not exists public.push_journal (
  cle        text primary key,
  envoye_le  timestamptz not null default now(),
  nb         integer not null default 0
);
alter table public.push_journal enable row level security;
drop policy if exists "journal : admin lit" on public.push_journal;
create policy "journal : admin lit" on public.push_journal for select to authenticated
  using (public.est_admin());
