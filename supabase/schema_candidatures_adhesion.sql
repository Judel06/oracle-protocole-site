-- =========================================================
-- ORACLE — Candidatures d'adhesion au protocole (formulaire public /adhesion)
-- Necessite schema_admin.sql et schema_membres_protocole.sql deja executes.
-- =========================================================

create table public.candidatures_adhesion (
  id uuid primary key default gen_random_uuid(),

  -- Identite & contact
  nom_complet text not null,
  date_naissance date,
  email text not null,
  telephone text not null,
  ville text,

  -- Formation & experience
  formation text,
  experience_pertinente text,

  -- Langues & disponibilite
  langues text[] not null default '{}',
  langue_autre_precision text,
  disponibilite text not null check (disponibilite in ('temps_plein', 'temps_partiel', 'ponctuel')),

  -- Domaine vise (5 categories du site, cf. contact.html)
  domaine_interet text not null check (domaine_interet in (
    'Protocole Officiel & Diplomatique',
    'Étiquette & Formation',
    'Gestion Cérémonielle d''Événements',
    'Conseil & Ingénierie Protocolaire',
    'Image de Marque & Identité Visuelle'
  )),

  -- Motivation
  lettre_motivation text,

  -- Pieces jointes (Supabase Storage)
  cv_storage_path text,
  cv_nom_fichier text,
  photo_storage_path text,
  photo_nom_fichier text,

  -- Consentement
  accepte_conditions boolean not null default false,

  -- Traitement admin
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'en_cours_examen', 'acceptee', 'refusee')),
  motif_refus text,
  niveau_accreditation_assigne text check (niveau_accreditation_assigne in ('niveau_1', 'niveau_2', 'niveau_3')),
  affectation_assignee text,
  membre_protocole_id uuid references public.membres_protocole(id),
  decide_par_email text,
  decide_le timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.candidatures_adhesion is 'Candidatures d''adhesion au protocole ORACLE, soumises depuis /adhesion sur le site public.';

create index idx_candidatures_adhesion_statut on public.candidatures_adhesion (statut);
create index idx_candidatures_adhesion_domaine on public.candidatures_adhesion (domaine_interet);

alter table public.candidatures_adhesion enable row level security;

create policy "Soumission publique de candidature d'adhesion"
  on public.candidatures_adhesion for insert
  to anon
  with check (accepte_conditions = true);

create policy "Admins gerent les candidatures d'adhesion"
  on public.candidatures_adhesion for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- =========================================================
-- Stockage des pieces jointes (CV + photo)
-- =========================================================
-- Etape manuelle prealable : Dashboard -> Storage -> New bucket
--   Nom du bucket : candidatures-adhesion
--   Public bucket : NON (prive)
--   Allowed MIME types : application/pdf, image/jpeg, image/png
-- Puis executez :

create policy "Upload public - candidatures-adhesion"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'candidatures-adhesion');
