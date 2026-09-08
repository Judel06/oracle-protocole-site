-- =========================================================
-- ORACLE — Protocole et Services | Schema Supabase
-- 3 tables : demandes_devis, inscriptions_formation, messages_contact
-- =========================================================

-- Extension pour gen_random_uuid() (activee par defaut sur Supabase, au cas ou)
create extension if not exists pgcrypto;

-- Expression reguliere email partagee, utilisee dans les CHECK ci-dessous
-- (Postgres ne permet pas de fonction reutilisable simplement dans un CHECK
--  inter-tables sans fonction dediee, donc on definit une fonction utilitaire)
create or replace function public.is_valid_email(email text)
returns boolean
language sql
immutable
as $$
  select email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
$$;

-- =========================================================
-- 1. demandes_devis
-- =========================================================
create table public.demandes_devis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nom_complet text not null,
  organisation text,
  fonction text,
  email text not null check (public.is_valid_email(email)),
  telephone text,
  type_evenement text not null check (type_evenement in (
    'ceremonie_officielle', 'visite_diplomatique', 'evenement_institutionnel', 'autre'
  )),
  date_evenement date,
  nombre_participants integer check (nombre_participants >= 0),
  services text[] not null default '{}',
  description text not null,
  statut text not null default 'nouveau' check (statut in ('nouveau', 'en_cours', 'traite'))
);

comment on table public.demandes_devis is 'Demandes de devis soumises via les boutons "Demander un devis" du site.';

-- =========================================================
-- 2. inscriptions_formation
-- =========================================================
create table public.inscriptions_formation (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nom_complet text not null,
  organisation text,
  email text not null check (public.is_valid_email(email)),
  telephone text,
  formation text not null check (formation in (
    'protocole_table', 'codes_vestimentaires', 'communication_non_verbale', 'protocole_general'
  )),
  format_souhaite text not null check (format_souhaite in ('presentiel', 'distance')),
  nombre_participants integer not null check (nombre_participants > 0),
  periode_souhaitee text,
  message text,
  statut text not null default 'nouveau' check (statut in ('nouveau', 'en_cours', 'traite'))
);

comment on table public.inscriptions_formation is 'Inscriptions aux formations Etiquette & Protocole.';

-- =========================================================
-- 3. messages_contact
-- =========================================================
create table public.messages_contact (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nom text not null,
  email text not null check (public.is_valid_email(email)),
  telephone text,
  sujet text not null check (sujet in (
    'renseignement_general', 'partenariat', 'presse', 'autre'
  )),
  message text not null,
  statut text not null default 'nouveau' check (statut in ('nouveau', 'en_cours', 'traite'))
);

comment on table public.messages_contact is 'Messages du formulaire de contact general.';

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.demandes_devis enable row level security;
alter table public.inscriptions_formation enable row level security;
alter table public.messages_contact enable row level security;

-- Insertion publique autorisee (le site envoie avec la cle anonyme)
create policy "Insertion publique - demandes_devis"
  on public.demandes_devis for insert
  to anon
  with check (true);

create policy "Insertion publique - inscriptions_formation"
  on public.inscriptions_formation for insert
  to anon
  with check (true);

create policy "Insertion publique - messages_contact"
  on public.messages_contact for insert
  to anon
  with check (true);

-- Aucune policy SELECT / UPDATE / DELETE pour "anon" : refusees par defaut
-- des que RLS est active. La consultation/gestion des soumissions se fait
-- via la cle service_role (bypass RLS), depuis le tableau de bord Supabase
-- ou un outil interne futur.

-- =========================================================
-- Index utiles pour le tri/suivi interne
-- =========================================================
create index idx_demandes_devis_statut on public.demandes_devis (statut, created_at desc);
create index idx_inscriptions_formation_statut on public.inscriptions_formation (statut, created_at desc);
create index idx_messages_contact_statut on public.messages_contact (statut, created_at desc);
