-- =========================================================
-- ORACLE — Panneau d'administration
-- Necessite schema.sql (is_valid_email) deja execute.
-- =========================================================

-- =========================================================
-- 1. admin_users — comptes autorises a acceder a /admin
-- =========================================================
create table public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('admin', 'editor')),
  active boolean not null default true,
  invited_by uuid references public.admin_users(id),
  created_at timestamptz not null default now()
);

comment on table public.admin_users is 'Comptes ayant acces au panneau d''administration ORACLE.';

-- Fonction reutilisable dans les policies RLS : l'utilisateur courant est-il un admin actif ?
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where id = uid and active = true
  );
$$;

alter table public.admin_users enable row level security;

create policy "Admins peuvent lire la liste des admins"
  on public.admin_users for select
  to authenticated
  using (public.is_admin(auth.uid()));
-- Aucune policy INSERT/UPDATE/DELETE cote client : la creation/revocation de
-- comptes passe exclusivement par les Edge Functions (service_role), qui
-- verifient elles-memes que l'appelant est admin avant d'agir.

-- =========================================================
-- 2. parametres_site — coordonnees affichees sur le site public
--    (table "singleton" : une seule ligne, id fixe = 1)
-- =========================================================
create table public.parametres_site (
  id smallint primary key default 1 check (id = 1),
  adresse text,
  telephone text,
  email text,
  facebook_url text,
  x_url text,
  linkedin_url text,
  instagram_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_users(id)
);

comment on table public.parametres_site is 'Coordonnees et liens reseaux sociaux du site public, modifiables sans toucher au code.';

insert into public.parametres_site (id, adresse, telephone, email, facebook_url, x_url, linkedin_url, instagram_url)
values (1, 'Port-au-Prince, Haïti', '+509 4245-4545', 'admin@oracleprotocole.com', null, null, null, null);

alter table public.parametres_site enable row level security;

create policy "Lecture publique des parametres du site"
  on public.parametres_site for select
  to anon, authenticated
  using (true);

create policy "Seuls les admins modifient les parametres"
  on public.parametres_site for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- =========================================================
-- 3. activity_log — journal d'activite de l'admin
-- =========================================================
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_id uuid references public.admin_users(id),
  admin_email text not null,
  action text not null,
  details jsonb
);

comment on table public.activity_log is 'Historique des actions effectuees dans le panneau d''administration.';

alter table public.activity_log enable row level security;

create policy "Admins lisent le journal"
  on public.activity_log for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "Admins ecrivent dans le journal"
  on public.activity_log for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

create index idx_activity_log_created on public.activity_log (created_at desc);

-- =========================================================
-- 4. Extension des tables existantes : notes internes + acces admin
-- =========================================================
alter table public.demandes_devis add column if not exists notes_internes text;
alter table public.inscriptions_formation add column if not exists notes_internes text;
alter table public.messages_contact add column if not exists notes_internes text;

-- messages_contact : ajout du statut "repondu" en plus de nouveau/en_cours/traite
alter table public.messages_contact drop constraint if exists messages_contact_statut_check;
alter table public.messages_contact add constraint messages_contact_statut_check
  check (statut in ('nouveau', 'en_cours', 'traite', 'repondu'));

-- Lecture + mise a jour reservees aux admins sur les 3 tables de formulaires
create policy "Admins lisent les demandes de devis"
  on public.demandes_devis for select
  to authenticated
  using (public.is_admin(auth.uid()));
create policy "Admins modifient les demandes de devis"
  on public.demandes_devis for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins lisent les inscriptions formation"
  on public.inscriptions_formation for select
  to authenticated
  using (public.is_admin(auth.uid()));
create policy "Admins modifient les inscriptions formation"
  on public.inscriptions_formation for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins lisent les messages de contact"
  on public.messages_contact for select
  to authenticated
  using (public.is_admin(auth.uid()));
create policy "Admins modifient les messages de contact"
  on public.messages_contact for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- =========================================================
-- 5. Premier compte admin
-- =========================================================
-- Etape manuelle prealable : Dashboard Supabase -> Authentication -> Users
-- -> Add user (creez le compte email/mot de passe de la premiere personne
-- de l'equipe ORACLE), puis copiez son UUID et executez :
--
--   insert into public.admin_users (id, email, role)
--   values ('UUID-COPIE-ICI', 'email@oracleprotocole.com', 'admin');
--
-- Les invitations suivantes se feront depuis /admin/utilisateurs (Edge Function).
