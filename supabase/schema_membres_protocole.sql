-- =========================================================
-- ORACLE — Annuaire permanent des membres du protocole
-- Necessite schema_admin.sql et schema_presence_approbation.sql deja executes.
-- =========================================================

create table public.membres_protocole (
  id uuid primary key default gen_random_uuid(),
  nom_complet text not null,
  niveau_accreditation text not null default 'niveau_2' check (niveau_accreditation in ('niveau_1', 'niveau_2', 'niveau_3')),
  affectation_defaut text,
  telephone text,
  email text,
  statut text not null default 'actif' check (statut in ('actif', 'inactif')),
  created_at timestamptz not null default now()
);

comment on table public.membres_protocole is 'Annuaire permanent des membres du protocole ORACLE (reutilisable d''un evenement a l''autre), distinct du suivi de presence par evenement.';

alter table public.membres_protocole enable row level security;

create policy "Admins gerent l'annuaire des membres"
  on public.membres_protocole for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create index idx_membres_protocole_statut on public.membres_protocole (statut);

-- Rattache (optionnellement) une ligne de presence a un membre de l'annuaire.
-- Reste nullable : une entree de presence "hors annuaire" (staff ponctuel) reste possible.
alter table public.presence_protocole add column if not exists membre_id uuid references public.membres_protocole(id);
