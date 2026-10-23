-- =========================================================
-- SERIN 2027 — Espace admin : statuts, historique, notes, acces admin
-- Necessite schema_admin.sql et schema_serin.sql deja executes.
-- =========================================================

-- 1. Statuts : en_attente (defaut) / approuve / rejete
alter table public.candidatures_serin drop constraint if exists candidatures_serin_statut_check;
update public.candidatures_serin set statut = case statut
  when 'traite' then 'approuve'
  else 'en_attente'
end;
alter table public.candidatures_serin alter column statut set default 'en_attente';
alter table public.candidatures_serin add constraint candidatures_serin_statut_check
  check (statut in ('en_attente', 'approuve', 'rejete'));

-- 2. Numero de dossier, notes internes, derniere decision
create sequence if not exists public.candidatures_serin_numero_seq;

alter table public.candidatures_serin
  add column if not exists numero_dossier text unique
    default ('SERIN-' || lpad(nextval('public.candidatures_serin_numero_seq')::text, 4, '0')),
  add column if not exists notes_internes text,
  add column if not exists motif_decision text,
  add column if not exists decide_par_email text,
  add column if not exists date_decision timestamptz;

-- 3. Historique des changements de statut (rien n'est jamais supprime)
create table if not exists public.candidatures_serin_historique (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  candidature_id uuid not null references public.candidatures_serin(id) on delete cascade,
  ancien_statut text,
  nouveau_statut text not null,
  motif text,
  auteur_email text not null
);

create index if not exists idx_serin_historique_candidature
  on public.candidatures_serin_historique (candidature_id, created_at desc);

alter table public.candidatures_serin_historique enable row level security;

drop policy if exists "Admins lisent l'historique SERIN" on public.candidatures_serin_historique;
create policy "Admins lisent l'historique SERIN"
  on public.candidatures_serin_historique for select
  to authenticated
  using (public.is_admin(auth.uid()));
-- Pas de policy d'ecriture : l'historique n'est alimente que par serin_changer_statut().

-- 4. Acces admin aux candidatures et aux pieces jointes
drop policy if exists "Admins lisent les candidatures SERIN" on public.candidatures_serin;
create policy "Admins lisent les candidatures SERIN"
  on public.candidatures_serin for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins modifient les candidatures SERIN" on public.candidatures_serin;
create policy "Admins modifient les candidatures SERIN"
  on public.candidatures_serin for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "Admins lisent les pieces jointes SERIN" on storage.objects;
create policy "Admins lisent les pieces jointes SERIN"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'candidatures-serin' and public.is_admin(auth.uid()));

-- 5. Changement de statut (unitaire ou en lot) : met a jour le dossier,
-- l'historique et le Journal d'activite dans une seule transaction.
create or replace function public.serin_changer_statut(
  p_ids uuid[], p_statut text, p_motif text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_motif text := nullif(btrim(coalesce(p_motif, '')), '');
  v_count integer := 0;
  r record;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acces refuse';
  end if;
  if p_statut not in ('en_attente', 'approuve', 'rejete') then
    raise exception 'Statut invalide';
  end if;
  if p_statut = 'rejete' and v_motif is null then
    raise exception 'Un motif est obligatoire pour un rejet';
  end if;

  select email into v_email from public.admin_users where id = auth.uid();

  for r in
    select id, numero_dossier, statut from public.candidatures_serin
    where id = any(p_ids) and statut <> p_statut
    for update
  loop
    update public.candidatures_serin
      set statut = p_statut, motif_decision = v_motif,
          decide_par_email = v_email, date_decision = now()
      where id = r.id;

    insert into public.candidatures_serin_historique
      (candidature_id, ancien_statut, nouveau_statut, motif, auteur_email)
      values (r.id, r.statut, p_statut, v_motif, v_email);

    insert into public.activity_log (admin_id, admin_email, action, details)
      values (auth.uid(), v_email, 'serin_statut_change', jsonb_build_object(
        'dossier', r.numero_dossier, 'de', r.statut, 'vers', p_statut, 'motif', v_motif));

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.serin_changer_statut(uuid[], text, text) from public, anon;
grant execute on function public.serin_changer_statut(uuid[], text, text) to authenticated;

notify pgrst, 'reload schema';
