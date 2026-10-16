-- =====================================================================
--  SC Lions d'Eugies — Étape 11 : textes des envois automatiques
--  modifiables par le staff. À coller dans Supabase → SQL Editor → Run.
--  Relançable sans risque (ne supprime aucune donnée).
-- =====================================================================

create table if not exists public.notif_modeles (
  cle text primary key,
  titre text check (char_length(titre) <= 120),
  texte text check (char_length(texte) <= 400),
  actif boolean not null default true,
  maj_le timestamptz not null default now(),
  maj_par text
);
alter table public.notif_modeles enable row level security;
drop policy if exists "notif_modeles : admin gère" on public.notif_modeles;
create policy "notif_modeles : admin gère" on public.notif_modeles
  for all to authenticated using (public.est_admin()) with check (public.est_admin());
grant select, insert, update, delete on public.notif_modeles to authenticated;
