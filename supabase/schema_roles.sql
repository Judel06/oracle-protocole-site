-- =========================================================
-- ORACLE — Refonte des roles et permissions (matrice modules x actions)
-- Necessite schema_admin.sql deja execute. Idempotent : peut etre relance.
-- A executer dans Supabase > SQL Editor.
--
-- Les droits sont appliques par l'interface (admin/). Cote base, on protege
-- seulement les tables de gouvernance (roles, delegations, validations,
-- comptes admin) : seul le Directeur General peut les modifier.
-- =========================================================

-- 1. Comptes : roles multiples (cles de public.roles). La colonne historique
--    "role" (admin/editor) est conservee telle quelle pour les Edge Functions
--    d'invitation/revocation.
alter table public.admin_users add column if not exists roles text[] not null default '{}';

create or replace function public.is_dg(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where id = uid and active = true and 'directeur_general' = any(roles)
  );
$$;

-- 2. Catalogue des roles. permissions = {"devis":["voir","modifier"], ...}
create table if not exists public.roles (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  label text not null,
  color text not null default 'navy',
  permissions jsonb not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.roles enable row level security;

drop policy if exists "Admins lisent les roles" on public.roles;
create policy "Admins lisent les roles" on public.roles for select to authenticated
  using (public.is_admin(auth.uid()));
drop policy if exists "DG cree les roles" on public.roles;
create policy "DG cree les roles" on public.roles for insert to authenticated
  with check (public.is_dg(auth.uid()) and is_system = false);
drop policy if exists "DG modifie les roles" on public.roles;
create policy "DG modifie les roles" on public.roles for update to authenticated
  using (public.is_dg(auth.uid()) and key <> 'directeur_general')
  with check (public.is_dg(auth.uid()) and key <> 'directeur_general');
drop policy if exists "DG supprime les roles personnalises" on public.roles;
create policy "DG supprime les roles personnalises" on public.roles for delete to authenticated
  using (public.is_dg(auth.uid()) and is_system = false);

insert into public.roles (key, label, color, is_system, permissions) values
  ('directeur_general', 'Directeur Général', 'gold', true, '{}'),
  ('directoire', 'Directoire (Ambassadeurs)', 'navy', true, '{
    "membres":["voir","creer","modifier","valider","exporter"],
    "candidatures":["voir","creer","modifier","valider","exporter"],
    "adhesions":["voir"],"devis":["voir"],"formations":["voir"],"messages":["voir"]}'),
  ('commission', 'Commission (Représentants Permanents)', 'teal', true, '{
    "membres":["voir","creer","modifier","valider","exporter"],
    "formations":["voir","creer","modifier","exporter"],
    "devis":["voir"],"messages":["voir"],"candidatures":["voir"]}'),
  ('rh', 'Ressources humaines', 'purple', true, '{
    "membres":["voir","creer","modifier","exporter"],
    "candidatures":["voir","creer","modifier","valider","exporter"],
    "adhesions":["voir","creer","modifier","valider","exporter"],
    "formations":["voir"]}'),
  ('tresorerie', 'Trésorerie', 'green', true, '{
    "paiements":["voir","creer","modifier","valider","exporter"],
    "devis":["voir","creer","modifier","exporter"],
    "adhesions":["voir","exporter"],"membres":["voir"]}'),
  ('direction', 'Direction', 'red', true, '{
    "devis":["voir","valider","exporter"],"formations":["voir","exporter"],
    "messages":["voir","exporter"],"membres":["voir","exporter"],
    "candidatures":["voir","valider","exporter"],"adhesions":["voir","valider","exporter"],
    "paiements":["voir","valider","exporter"],"galerie":["voir"],"journal":["voir","exporter"]}'),
  ('responsable_club', 'Responsable de club (Vie & Communauté)', 'orange', true, '{
    "formations":["voir","creer","modifier","valider","exporter","supprimer"],
    "membres":["voir"],"messages":["voir","modifier"],
    "galerie":["voir","creer","modifier"]}'),
  ('communication', 'Communication', 'blue', true, '{
    "galerie":["voir","creer","modifier","valider","exporter","supprimer"],
    "messages":["voir","creer","modifier","valider","exporter","supprimer"],
    "devis":["voir"],"formations":["voir"]}')
on conflict (key) do nothing;

-- 3. Delegations temporaires des pouvoirs du DG (fin obligatoire)
create table if not exists public.delegations (
  id uuid primary key default gen_random_uuid(),
  delegated_by uuid not null references public.admin_users(id),
  to_role text not null references public.roles(key),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null check (ends_at > starts_at),
  motif text,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.delegations enable row level security;
drop policy if exists "Admins lisent les delegations" on public.delegations;
create policy "Admins lisent les delegations" on public.delegations for select to authenticated
  using (public.is_admin(auth.uid()));
drop policy if exists "DG cree les delegations" on public.delegations;
create policy "DG cree les delegations" on public.delegations for insert to authenticated
  with check (public.is_dg(auth.uid()) and delegated_by = auth.uid() and to_role <> 'directeur_general');
drop policy if exists "DG revoque les delegations" on public.delegations;
create policy "DG revoque les delegations" on public.delegations for update to authenticated
  using (public.is_dg(auth.uid())) with check (public.is_dg(auth.uid()));

-- 4. Validations en attente (paiements au-dessus du plafond, decisions a confirmer...)
create table if not exists public.validations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null,
  module text not null,
  titre text not null,
  montant numeric,
  ref_table text,
  ref_id uuid,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'approuve', 'rejete', 'annule')),
  demande_par uuid references public.admin_users(id),
  demande_par_email text,
  decide_par uuid references public.admin_users(id),
  decide_le timestamptz,
  note_decision text
);
alter table public.validations enable row level security;
drop policy if exists "Admins lisent les validations" on public.validations;
create policy "Admins lisent les validations" on public.validations for select to authenticated
  using (public.is_admin(auth.uid()));
drop policy if exists "Admins demandent une validation" on public.validations;
create policy "Admins demandent une validation" on public.validations for insert to authenticated
  with check (public.is_admin(auth.uid()) and statut = 'en_attente' and demande_par = auth.uid());
drop policy if exists "DG decide les validations" on public.validations;
create policy "DG decide les validations" on public.validations for update to authenticated
  using (public.is_dg(auth.uid())) with check (public.is_dg(auth.uid()));

-- 5. Seuils (lecture admins, ecriture DG) — table a part, parametres_site est publique
create table if not exists public.admin_config (
  id int primary key default 1 check (id = 1),
  plafond_paiement numeric not null default 1000
);
insert into public.admin_config (id) values (1) on conflict do nothing;
alter table public.admin_config enable row level security;
drop policy if exists "Admins lisent la config" on public.admin_config;
create policy "Admins lisent la config" on public.admin_config for select to authenticated
  using (public.is_admin(auth.uid()));
drop policy if exists "DG modifie la config" on public.admin_config;
create policy "DG modifie la config" on public.admin_config for update to authenticated
  using (public.is_dg(auth.uid())) with check (public.is_dg(auth.uid()));

-- 6. Comptes admin : seul le DG attribue les roles / desactive un compte,
--    personne ne modifie ses propres roles. Les Edge Functions (service_role,
--    auth.uid() nul) ne sont pas concernees.
drop policy if exists "DG modifie les comptes admin" on public.admin_users;
create policy "DG modifie les comptes admin" on public.admin_users for update to authenticated
  using (public.is_dg(auth.uid())) with check (public.is_dg(auth.uid()));

create or replace function public.guard_admin_users_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return new; end if;
  if (new.roles is distinct from old.roles or new.active is distinct from old.active) then
    if new.id = auth.uid() then
      raise exception 'Vous ne pouvez pas modifier vos propres roles ni votre statut.';
    end if;
    if 'directeur_general' = any(old.roles) and not public.is_dg(auth.uid()) then
      raise exception 'Le compte Directeur General ne peut pas etre modifie par un autre role.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_admin_users_update on public.admin_users;
create trigger trg_guard_admin_users_update before update on public.admin_users
  for each row execute function public.guard_admin_users_update();

-- 7. Archivage (suppression reversible) sur les demandes du site
alter table public.demandes_devis add column if not exists archived_at timestamptz;
alter table public.inscriptions_formation add column if not exists archived_at timestamptz;
alter table public.messages_contact add column if not exists archived_at timestamptz;

-- 8. Suppression definitive : DG uniquement (les autres archivent)
do $$
declare t text;
begin
  foreach t in array array['demandes_devis', 'inscriptions_formation', 'messages_contact'] loop
    execute format('drop policy if exists "DG supprime definitivement" on public.%I', t);
    execute format('create policy "DG supprime definitivement" on public.%I for delete to authenticated using (public.is_dg(auth.uid()))', t);
  end loop;
end $$;

-- 9. PREMIER DIRECTEUR GENERAL — a lancer UNE fois avec votre email :
-- update public.admin_users set roles = '{directeur_general}' where email = 'VOTRE_EMAIL';
