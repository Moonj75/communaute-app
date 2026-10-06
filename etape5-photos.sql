-- =====================================================================
--  SC Lions d'Eugies — Étape 5 : photos des joueurs
--  À coller dans Supabase → SQL Editor → New query → Run (relançable).
--  Les photos sont PRIVÉES : seuls la famille concernée et les
--  administrateurs peuvent les voir ou les changer.
-- =====================================================================

alter table public.joueurs add column if not exists photo_path text;

-- Dossier de stockage privé « photos » (2 Mo maximum par image)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- La personne connectée peut-elle gérer la photo de cette fiche ?
create or replace function public.peut_gerer_photo(p_notion_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.est_admin()
      or exists (
        select 1 from public.joueurs
         where notion_id = p_notion_id
           and email = lower(auth.jwt() ->> 'email')
      );
$$;
revoke all on function public.peut_gerer_photo(text) from public;
grant execute on function public.peut_gerer_photo(text) to authenticated;

-- Règles d'accès aux fichiers : dossier = identifiant Notion du joueur
drop policy if exists "photos : voir"     on storage.objects;
drop policy if exists "photos : ajouter"  on storage.objects;
drop policy if exists "photos : modifier" on storage.objects;
drop policy if exists "photos : retirer"  on storage.objects;

create policy "photos : voir" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.peut_gerer_photo((storage.foldername(name))[1]));
create policy "photos : ajouter" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.peut_gerer_photo((storage.foldername(name))[1]));
create policy "photos : modifier" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and public.peut_gerer_photo((storage.foldername(name))[1]));
create policy "photos : retirer" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.peut_gerer_photo((storage.foldername(name))[1]));

-- Enregistre (ou efface) la photo d'une fiche, sans toucher aux autres colonnes
create or replace function public.definir_photo(p_notion_id text, p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.peut_gerer_photo(p_notion_id) then
    raise exception 'photo_interdite';
  end if;
  if p_path is not null and split_part(p_path, '/', 1) <> p_notion_id then
    raise exception 'chemin_invalide';
  end if;
  update public.joueurs set photo_path = p_path where notion_id = p_notion_id;
end;
$$;
revoke all on function public.definir_photo(text, text) from public;
grant execute on function public.definir_photo(text, text) to authenticated;
