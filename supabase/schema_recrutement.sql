-- =========================================================
-- ORACLE — Plateforme de recrutement / gestion des membres
-- Necessite schema.sql et schema_admin.sql deja executes.
-- =========================================================

-- =========================================================
-- 1. candidats — table principale (22 blocs du formulaire)
-- =========================================================
create sequence if not exists public.numero_membre_seq start 1;

create table public.candidats (
  id uuid primary key default gen_random_uuid(),
  resume_token uuid not null default gen_random_uuid() unique,
  brouillon boolean not null default true,
  numero_membre text unique,
  statut text check (statut in ('candidat', 'en_evaluation', 'forme', 'actif', 'inactif', 'suspendu')),
  niveau_protocolaire text,
  notes_internes text,
  evaluation_moyenne numeric,

  -- Bloc 1 — Identite & contact
  civilite text,
  prenom text,
  nom text,
  date_naissance date,
  genre text,
  nationalite text,
  telephone text,
  whatsapp text,
  email text,
  adresse text,
  ville text,
  code_postal text,
  pays text,
  contact_urgence_nom text,
  contact_urgence_lien text,
  contact_urgence_telephone text,

  -- Bloc 2 — Profil professionnel
  poste_actuel text,
  employeur_actuel text,
  domaine_activite text,
  niveau_formation text,
  diplomes jsonb not null default '[]',
  certifications jsonb not null default '[]',
  annees_experience integer,
  portfolio_url text,
  linkedin_url text,

  -- Bloc 3 — Experience protocole/evenementiel
  experience_protocole boolean,
  types_evenements jsonb not null default '[]',
  volume_evenements text,
  responsabilites text,
  publics_serves jsonb not null default '[]',
  roles_tenus jsonb not null default '[]',

  -- Bloc 4 — Competences ORACLE
  competences jsonb not null default '{}',
  capacite_rapport_post_evenement integer,

  -- Bloc 5 — Langues
  langues jsonb not null default '[]',
  accueil_langue_etrangere boolean,

  -- Bloc 6 — Disponibilite
  disponibilite_niveau text,
  disponibilite_matrice jsonb not null default '{}',
  weekends boolean,
  jours_feries boolean,
  derniere_minute boolean,
  voyages boolean,
  missions_internationales boolean,
  heures_semaine integer,

  -- Bloc 7 — Mobilite
  vehicule boolean,
  vehicule_details text,
  permis_conduire boolean,
  autonomie_deplacement text,
  zone_geo_max text,
  transport_materiel boolean,

  -- Bloc 8 — Sante & besoins particuliers (facultatif)
  allergies text,
  restrictions_alimentaires text,
  amenagements_necessaires text,
  prefere_ne_pas_repondre_sante boolean not null default false,

  -- Bloc 9 — Tenue
  tailles jsonb not null default '{}',
  preference_coupe text,

  -- Bloc 10 — Presentation professionnelle
  aisance_tenue_formelle integer,
  endurance integer,

  -- Bloc 11 — Image, consentement medias & reseaux sociaux
  niveau_autorisation_image text check (niveau_autorisation_image in ('aucun', 'interne', 'externe', 'site_web', 'reseaux_sociaux', 'promotionnel', 'tout')),
  consent_photos_videos boolean,
  consent_communications_marketing boolean,
  liens_reseaux_sociaux jsonb not null default '{}',
  aisance_rp_camera integer,

  -- Bloc 12 — Redaction & rapports
  autoeval_redaction integer,
  mini_test_reponse text,

  -- Bloc 13 — Outils numeriques
  outils_numeriques jsonb not null default '{}',

  -- Bloc 14 — Types de missions souhaitees
  types_missions_souhaitees jsonb not null default '[]',

  -- Bloc 15 — Role prefere
  roles_preferes jsonb not null default '[]',

  -- Bloc 16 — Comportement professionnel
  comportement jsonb not null default '{}',
  qualite_cle_protocole text,

  -- Bloc 17 — Confidentialite & ethique
  confirme_comprehension_regles boolean,
  declaration_engagement boolean,

  -- Bloc 19 — Motivation
  motivation_pourquoi_oracle text,
  motivation_differenciation text,
  motivation_contribution text,
  motivation_projection_3ans text,

  -- Bloc 20 — Formation
  formation_disponibilite jsonb not null default '{}',
  formation_domaines_interet jsonb not null default '[]',

  -- Bloc 22 — Consentement final
  accepte_politique_confidentialite boolean,
  accepte_traitement_donnees boolean,
  accepte_conditions_mission boolean,
  confirme_exactitude_infos boolean,
  signature_nom_complet text,
  signature_image_data text,
  signature_date timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);

comment on table public.candidats is 'Candidats et membres ORACLE Protocole & Services — formulaire de recrutement en 22 blocs.';

create index idx_candidats_statut on public.candidats (statut);
create index idx_candidats_brouillon on public.candidats (brouillon);

-- =========================================================
-- 2. candidat_documents — CV, photos, certificats, signature...
-- =========================================================
create table public.candidat_documents (
  id uuid primary key default gen_random_uuid(),
  candidat_id uuid not null references public.candidats(id) on delete cascade,
  type text not null check (type in ('cv', 'photo_portrait', 'photo_pied', 'certificat', 'diplome', 'portfolio')),
  storage_path text not null,
  nom_fichier text,
  uploaded_at timestamptz not null default now()
);

create index idx_candidat_documents_candidat on public.candidat_documents (candidat_id);

-- =========================================================
-- 3. candidat_references — references professionnelles (facultatif)
-- =========================================================
create table public.candidat_references (
  id uuid primary key default gen_random_uuid(),
  candidat_id uuid not null references public.candidats(id) on delete cascade,
  nom text,
  fonction text,
  organisation text,
  telephone text,
  email text,
  autorisation_verification boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_candidat_references_candidat on public.candidat_references (candidat_id);

-- =========================================================
-- 4. missions_historique — structure prete, module futur d'affectation
-- =========================================================
create table public.missions_historique (
  id uuid primary key default gen_random_uuid(),
  candidat_id uuid not null references public.candidats(id) on delete cascade,
  mission_nom text,
  date_mission date,
  role text,
  evaluation_score numeric,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_missions_historique_candidat on public.missions_historique (candidat_id);

-- =========================================================
-- 5. RLS — candidats/references accessibles uniquement via RPC ou admin ;
--    documents en INSERT public (upload pendant la saisie), lecture admin seule.
-- =========================================================
alter table public.candidats enable row level security;
alter table public.candidat_documents enable row level security;
alter table public.candidat_references enable row level security;
alter table public.missions_historique enable row level security;

create policy "Admins gerent les candidats"
  on public.candidats for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Upload public de documents candidat"
  on public.candidat_documents for insert
  to anon
  with check (true);
create policy "Admins lisent/gerent les documents candidat"
  on public.candidat_documents for select
  to authenticated
  using (public.is_admin(auth.uid()));
create policy "Admins modifient les documents candidat"
  on public.candidat_documents for update
  to authenticated
  using (public.is_admin(auth.uid()));
create policy "Admins suppriment les documents candidat"
  on public.candidat_documents for delete
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "Ajout public de references candidat"
  on public.candidat_references for insert
  to anon
  with check (true);
create policy "Admins gerent les references candidat"
  on public.candidat_references for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins gerent l'historique de missions"
  on public.missions_historique for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- =========================================================
-- 6. Fonctions RPC (security definer) pour le formulaire public
-- =========================================================

create or replace function public.generate_numero_membre()
returns text
language sql
as $$
  select 'ORA-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.numero_membre_seq')::text, 4, '0');
$$;

create or replace function public.rpc_create_candidat_draft()
returns table (id uuid, resume_token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  new_token uuid;
begin
  insert into public.candidats default values
  returning candidats.id, candidats.resume_token into new_id, new_token;
  return query select new_id, new_token;
end;
$$;

create or replace function public.rpc_get_candidat_draft(p_token uuid)
returns public.candidats
language sql
security definer
set search_path = public
as $$
  select * from public.candidats where resume_token = p_token and brouillon = true;
$$;

create or replace function public.rpc_save_candidat_draft(p_token uuid, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.candidats c set
    civilite = coalesce(p_data->>'civilite', c.civilite),
    prenom = coalesce(p_data->>'prenom', c.prenom),
    nom = coalesce(p_data->>'nom', c.nom),
    date_naissance = coalesce((p_data->>'date_naissance')::date, c.date_naissance),
    genre = coalesce(p_data->>'genre', c.genre),
    nationalite = coalesce(p_data->>'nationalite', c.nationalite),
    telephone = coalesce(p_data->>'telephone', c.telephone),
    whatsapp = coalesce(p_data->>'whatsapp', c.whatsapp),
    email = coalesce(p_data->>'email', c.email),
    adresse = coalesce(p_data->>'adresse', c.adresse),
    ville = coalesce(p_data->>'ville', c.ville),
    code_postal = coalesce(p_data->>'code_postal', c.code_postal),
    pays = coalesce(p_data->>'pays', c.pays),
    contact_urgence_nom = coalesce(p_data->>'contact_urgence_nom', c.contact_urgence_nom),
    contact_urgence_lien = coalesce(p_data->>'contact_urgence_lien', c.contact_urgence_lien),
    contact_urgence_telephone = coalesce(p_data->>'contact_urgence_telephone', c.contact_urgence_telephone),

    poste_actuel = coalesce(p_data->>'poste_actuel', c.poste_actuel),
    employeur_actuel = coalesce(p_data->>'employeur_actuel', c.employeur_actuel),
    domaine_activite = coalesce(p_data->>'domaine_activite', c.domaine_activite),
    niveau_formation = coalesce(p_data->>'niveau_formation', c.niveau_formation),
    diplomes = coalesce(p_data->'diplomes', c.diplomes),
    certifications = coalesce(p_data->'certifications', c.certifications),
    annees_experience = coalesce((p_data->>'annees_experience')::integer, c.annees_experience),
    portfolio_url = coalesce(p_data->>'portfolio_url', c.portfolio_url),
    linkedin_url = coalesce(p_data->>'linkedin_url', c.linkedin_url),

    experience_protocole = coalesce((p_data->>'experience_protocole')::boolean, c.experience_protocole),
    types_evenements = coalesce(p_data->'types_evenements', c.types_evenements),
    volume_evenements = coalesce(p_data->>'volume_evenements', c.volume_evenements),
    responsabilites = coalesce(p_data->>'responsabilites', c.responsabilites),
    publics_serves = coalesce(p_data->'publics_serves', c.publics_serves),
    roles_tenus = coalesce(p_data->'roles_tenus', c.roles_tenus),

    competences = coalesce(p_data->'competences', c.competences),
    capacite_rapport_post_evenement = coalesce((p_data->>'capacite_rapport_post_evenement')::integer, c.capacite_rapport_post_evenement),

    langues = coalesce(p_data->'langues', c.langues),
    accueil_langue_etrangere = coalesce((p_data->>'accueil_langue_etrangere')::boolean, c.accueil_langue_etrangere),

    disponibilite_niveau = coalesce(p_data->>'disponibilite_niveau', c.disponibilite_niveau),
    disponibilite_matrice = coalesce(p_data->'disponibilite_matrice', c.disponibilite_matrice),
    weekends = coalesce((p_data->>'weekends')::boolean, c.weekends),
    jours_feries = coalesce((p_data->>'jours_feries')::boolean, c.jours_feries),
    derniere_minute = coalesce((p_data->>'derniere_minute')::boolean, c.derniere_minute),
    voyages = coalesce((p_data->>'voyages')::boolean, c.voyages),
    missions_internationales = coalesce((p_data->>'missions_internationales')::boolean, c.missions_internationales),
    heures_semaine = coalesce((p_data->>'heures_semaine')::integer, c.heures_semaine),

    vehicule = coalesce((p_data->>'vehicule')::boolean, c.vehicule),
    vehicule_details = coalesce(p_data->>'vehicule_details', c.vehicule_details),
    permis_conduire = coalesce((p_data->>'permis_conduire')::boolean, c.permis_conduire),
    autonomie_deplacement = coalesce(p_data->>'autonomie_deplacement', c.autonomie_deplacement),
    zone_geo_max = coalesce(p_data->>'zone_geo_max', c.zone_geo_max),
    transport_materiel = coalesce((p_data->>'transport_materiel')::boolean, c.transport_materiel),

    allergies = coalesce(p_data->>'allergies', c.allergies),
    restrictions_alimentaires = coalesce(p_data->>'restrictions_alimentaires', c.restrictions_alimentaires),
    amenagements_necessaires = coalesce(p_data->>'amenagements_necessaires', c.amenagements_necessaires),
    prefere_ne_pas_repondre_sante = coalesce((p_data->>'prefere_ne_pas_repondre_sante')::boolean, c.prefere_ne_pas_repondre_sante),

    tailles = coalesce(p_data->'tailles', c.tailles),
    preference_coupe = coalesce(p_data->>'preference_coupe', c.preference_coupe),

    aisance_tenue_formelle = coalesce((p_data->>'aisance_tenue_formelle')::integer, c.aisance_tenue_formelle),
    endurance = coalesce((p_data->>'endurance')::integer, c.endurance),

    niveau_autorisation_image = coalesce(p_data->>'niveau_autorisation_image', c.niveau_autorisation_image),
    consent_photos_videos = coalesce((p_data->>'consent_photos_videos')::boolean, c.consent_photos_videos),
    consent_communications_marketing = coalesce((p_data->>'consent_communications_marketing')::boolean, c.consent_communications_marketing),
    liens_reseaux_sociaux = coalesce(p_data->'liens_reseaux_sociaux', c.liens_reseaux_sociaux),
    aisance_rp_camera = coalesce((p_data->>'aisance_rp_camera')::integer, c.aisance_rp_camera),

    autoeval_redaction = coalesce((p_data->>'autoeval_redaction')::integer, c.autoeval_redaction),
    mini_test_reponse = coalesce(p_data->>'mini_test_reponse', c.mini_test_reponse),

    outils_numeriques = coalesce(p_data->'outils_numeriques', c.outils_numeriques),

    types_missions_souhaitees = coalesce(p_data->'types_missions_souhaitees', c.types_missions_souhaitees),
    roles_preferes = coalesce(p_data->'roles_preferes', c.roles_preferes),

    comportement = coalesce(p_data->'comportement', c.comportement),
    qualite_cle_protocole = coalesce(p_data->>'qualite_cle_protocole', c.qualite_cle_protocole),

    confirme_comprehension_regles = coalesce((p_data->>'confirme_comprehension_regles')::boolean, c.confirme_comprehension_regles),
    declaration_engagement = coalesce((p_data->>'declaration_engagement')::boolean, c.declaration_engagement),

    motivation_pourquoi_oracle = coalesce(p_data->>'motivation_pourquoi_oracle', c.motivation_pourquoi_oracle),
    motivation_differenciation = coalesce(p_data->>'motivation_differenciation', c.motivation_differenciation),
    motivation_contribution = coalesce(p_data->>'motivation_contribution', c.motivation_contribution),
    motivation_projection_3ans = coalesce(p_data->>'motivation_projection_3ans', c.motivation_projection_3ans),

    formation_disponibilite = coalesce(p_data->'formation_disponibilite', c.formation_disponibilite),
    formation_domaines_interet = coalesce(p_data->'formation_domaines_interet', c.formation_domaines_interet),

    accepte_politique_confidentialite = coalesce((p_data->>'accepte_politique_confidentialite')::boolean, c.accepte_politique_confidentialite),
    accepte_traitement_donnees = coalesce((p_data->>'accepte_traitement_donnees')::boolean, c.accepte_traitement_donnees),
    accepte_conditions_mission = coalesce((p_data->>'accepte_conditions_mission')::boolean, c.accepte_conditions_mission),
    confirme_exactitude_infos = coalesce((p_data->>'confirme_exactitude_infos')::boolean, c.confirme_exactitude_infos),
    signature_nom_complet = coalesce(p_data->>'signature_nom_complet', c.signature_nom_complet),
    signature_image_data = coalesce(p_data->>'signature_image_data', c.signature_image_data),

    updated_at = now()
  where c.resume_token = p_token and c.brouillon = true;
end;
$$;

create or replace function public.rpc_submit_candidat(p_token uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero text;
begin
  v_numero := public.generate_numero_membre();

  update public.candidats
  set brouillon = false,
      statut = 'candidat',
      numero_membre = v_numero,
      signature_date = now(),
      submitted_at = now(),
      updated_at = now()
  where resume_token = p_token and brouillon = true;

  if not found then
    raise exception 'Brouillon introuvable ou deja soumis.';
  end if;

  return v_numero;
end;
$$;

grant execute on function public.rpc_create_candidat_draft() to anon;
grant execute on function public.rpc_get_candidat_draft(uuid) to anon;
grant execute on function public.rpc_save_candidat_draft(uuid, jsonb) to anon;
grant execute on function public.rpc_submit_candidat(uuid) to anon;

-- =========================================================
-- 7. Stockage des documents candidats
-- =========================================================
-- Etape manuelle prealable : Dashboard -> Storage -> New bucket
--   Nom du bucket : candidats-documents
--   Public bucket : NON (prive)
-- Puis executez :

create policy "Upload public - candidats-documents"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'candidats-documents');
