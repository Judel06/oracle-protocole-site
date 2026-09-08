-- =========================================================
-- ORACLE — Presence Protocole + Approbation des devis
-- Necessite schema.sql et schema_admin.sql deja executes.
-- =========================================================

create extension if not exists pg_net;

-- =========================================================
-- 1. evenements — evenement courant auquel rattacher la presence
-- =========================================================
create table public.evenements (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  date_evenement date,
  lieu text,
  actif boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.evenements is 'Evenements geres par ORACLE. Un seul devrait etre actif=true a la fois (evenement courant affiche dans le module Presence).';

alter table public.evenements enable row level security;

create policy "Admins gerent les evenements"
  on public.evenements for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- =========================================================
-- 2. presence_protocole — suivi d'arrivee des membres du protocole
-- =========================================================
create table public.presence_protocole (
  id uuid primary key default gen_random_uuid(),
  evenement_id uuid references public.evenements(id) on delete cascade,
  nom_complet text not null,
  niveau_accreditation text not null check (niveau_accreditation in ('niveau_1', 'niveau_2', 'niveau_3')),
  affectation text not null,
  statut text not null default 'non_arrive' check (statut in ('non_arrive', 'present')),
  lieu_arrivee text,
  heure_arrivee timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.presence_protocole is 'Suivi de presence des membres du protocole affectes a un evenement.';

alter table public.presence_protocole enable row level security;

create policy "Admins gerent la presence protocole"
  on public.presence_protocole for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create index idx_presence_protocole_evenement on public.presence_protocole (evenement_id);

-- =========================================================
-- 3. demandes_devis — champs pour le module Approbation
-- =========================================================
alter table public.demandes_devis add column if not exists lieu text;
alter table public.demandes_devis add column if not exists heure_evenement text;
alter table public.demandes_devis add column if not exists statut_approbation text
  not null default 'en_attente' check (statut_approbation in ('en_attente', 'approuve_attente_paiement', 'refuse'));
alter table public.demandes_devis add column if not exists motif_refus text;
alter table public.demandes_devis add column if not exists date_approbation timestamptz;
alter table public.demandes_devis add column if not exists approuve_par uuid references public.admin_users(id);

-- =========================================================
-- 4. Notifications automatiques par email (trigger -> Edge Function)
-- =========================================================
-- Le secret ci-dessous doit correspondre exactement au secret Edge Function
-- WEBHOOK_SECRET (deploye separement). Il n'a pas vocation a etre ultra-secret
-- (il est visible par quiconque a acces au SQL Editor du projet) mais empeche
-- un appel externe direct de l'URL de la fonction de declencher un envoi.

create or replace function public.notify_presence_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  evt record;
  payload jsonb;
begin
  if TG_OP = 'UPDATE' and OLD.statut = NEW.statut then
    return NEW;
  end if;
  if NEW.statut <> 'present' then
    return NEW;
  end if;

  select nom, lieu into evt from public.evenements where id = NEW.evenement_id;

  payload := jsonb_build_object(
    'nom_complet', NEW.nom_complet,
    'niveau_accreditation', NEW.niveau_accreditation,
    'affectation', NEW.affectation,
    'lieu_arrivee', coalesce(NEW.lieu_arrivee, evt.lieu),
    'heure_arrivee', NEW.heure_arrivee,
    'evenement_nom', evt.nom
  );

  perform net.http_post(
    url := 'https://wnaojfnjnnsfjgjwdosn.supabase.co/functions/v1/notify-presence',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', '4afe9fd73f5cfa7e4f5f597d66181d4753ff6e50cd8e3e66'),
    body := payload
  );

  return NEW;
end;
$$;

drop trigger if exists trg_notify_presence_confirmed on public.presence_protocole;
create trigger trg_notify_presence_confirmed
  after insert or update on public.presence_protocole
  for each row execute function public.notify_presence_confirmed();


create or replace function public.notify_devis_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  if TG_OP = 'UPDATE' and OLD.statut_approbation = NEW.statut_approbation then
    return NEW;
  end if;
  if NEW.statut_approbation not in ('approuve_attente_paiement', 'refuse') then
    return NEW;
  end if;

  payload := jsonb_build_object(
    'type', NEW.statut_approbation,
    'nom_complet', NEW.nom_complet,
    'organisation', NEW.organisation,
    'type_evenement', NEW.type_evenement,
    'services', NEW.services,
    'lieu', NEW.lieu,
    'heure_evenement', NEW.heure_evenement,
    'date_evenement', NEW.date_evenement,
    'motif_refus', NEW.motif_refus
  );

  perform net.http_post(
    url := 'https://wnaojfnjnnsfjgjwdosn.supabase.co/functions/v1/notify-devis-approval',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', '4afe9fd73f5cfa7e4f5f597d66181d4753ff6e50cd8e3e66'),
    body := payload
  );

  return NEW;
end;
$$;

drop trigger if exists trg_notify_devis_approval on public.demandes_devis;
create trigger trg_notify_devis_approval
  after update on public.demandes_devis
  for each row execute function public.notify_devis_approval();
