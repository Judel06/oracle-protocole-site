-- =========================================================
-- SERIN 2027 — Candidatures
-- Necessite schema.sql (fonction public.is_valid_email) deja execute.
-- =========================================================

create table public.candidatures_serin (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  nom_organisation text not null,
  secteur_activite text not null,

  type_candidature text not null check (type_candidature in (
    'exposant', 'intervenant_paneliste', 'partenaire', 'delegation_participante'
  )),

  axes_thematiques text[] not null default '{}',
  -- au moins un axe thematique requis
  constraint axes_thematiques_non_vide check (cardinality(axes_thematiques) > 0),

  nom_representant text not null,
  fonction text not null,
  email text not null check (public.is_valid_email(email)),
  telephone text not null,
  pays text not null,
  ville text not null,

  presentation_motivation text not null,
  nombre_personnes_delegation integer check (nombre_personnes_delegation > 0),

  besoins_specifiques text[] not null default '{}',
  besoin_autre_precision text,

  piece_jointe_path text,
  piece_jointe_nom text,

  accepte_conditions boolean not null check (accepte_conditions = true),

  statut text not null default 'nouveau' check (statut in ('nouveau', 'en_cours', 'traite'))
);

comment on table public.candidatures_serin is 'Candidatures deposees pour le SERIN 2027 (exposants, panelistes, partenaires, delegations).';

alter table public.candidatures_serin enable row level security;

create policy "Insertion publique - candidatures_serin"
  on public.candidatures_serin for insert
  to anon
  with check (true);
-- Aucune policy SELECT/UPDATE/DELETE pour anon : consultation via service_role uniquement.

create index idx_candidatures_serin_statut on public.candidatures_serin (statut, created_at desc);

-- =========================================================
-- Stockage des pieces jointes (presentation PDF / logo HD)
-- =========================================================
-- Etape manuelle prealable (Supabase ne permet pas de creer un bucket en SQL pur
-- via ce script standard) : dans le Dashboard -> Storage -> New bucket
--   Nom du bucket : candidatures-serin
--   Public bucket : NON (laisser prive)
--
-- Une fois le bucket cree, executez les policies ci-dessous :

create policy "Upload public - candidatures-serin"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'candidatures-serin');
-- Aucune policy SELECT/UPDATE/DELETE pour anon sur ce bucket : seul le
-- Dashboard Supabase (proprietaire du projet) peut parcourir/telecharger
-- les fichiers deposes.
