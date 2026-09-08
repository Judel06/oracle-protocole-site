/* =========================================================
   ORACLE — Formulaires connectes a Supabase
   Gere : validation, etat de chargement, honeypot anti-spam,
   cooldown de soumission, messages de succes/erreur.
   Necessite supabase-client.js charge avant ce fichier.
   ========================================================= */

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_RE = /^[+()\d\s.-]{6,20}$/;
const COOLDOWN_MS = 30000; // anti-spam basique : 1 soumission / 30s / navigateur

function canSubmitNow(cooldownKey) {
  const last = Number(localStorage.getItem(cooldownKey) || 0);
  return Date.now() - last > COOLDOWN_MS;
}
function markSubmitted(cooldownKey) {
  try { localStorage.setItem(cooldownKey, String(Date.now())); } catch (e) { /* stockage indisponible : on ignore */ }
}

function setFieldError(field, message) {
  const wrap = field.closest('.field');
  if (!wrap) return;
  wrap.classList.add('invalid');
  const errorEl = wrap.querySelector('.field-error');
  if (errorEl) errorEl.textContent = message;
}
function clearFieldError(field) {
  const wrap = field.closest('.field');
  if (wrap) wrap.classList.remove('invalid');
}

function showStatus(statusEl, type, message) {
  statusEl.textContent = message;
  statusEl.classList.remove('show', 'success', 'error');
  statusEl.classList.add('show', type);
}

/**
 * Initialise un formulaire relie a une table Supabase.
 * @param {Object} opts
 * @param {string} opts.formId - id du <form>
 * @param {string} opts.statusId - id du conteneur de message de statut
 * @param {string} opts.table - nom de la table Supabase cible
 * @param {string} opts.honeypotName - name du champ piege a bots
 * @param {string} opts.cooldownKey - cle localStorage pour l'anti-spam
 * @param {(form: HTMLFormElement) => Object} opts.buildPayload - construit l'objet a inserer
 * @param {(form: HTMLFormElement) => boolean} [opts.extraValidate] - validation additionnelle ; retourne false si invalide
 * @param {string} [opts.successMessage]
 */
function initSupabaseForm(opts) {
  const form = document.getElementById(opts.formId);
  const status = document.getElementById(opts.statusId);
  if (!form || !status) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = submitBtn ? submitBtn.textContent : '';

  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('input', () => clearFieldError(field));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.classList.remove('show', 'success', 'error');

    // Honeypot : un bot remplit generalement tous les champs, y compris celui-ci,
    // cache visuellement mais present dans le DOM.
    const honeypot = form.querySelector(`[name="${opts.honeypotName}"]`);
    const isBot = honeypot && honeypot.value.trim() !== '';

    // Validation des champs obligatoires natifs + regles specifiques
    let valid = true;
    form.querySelectorAll('[required]').forEach(field => {
      clearFieldError(field);
      if (field.type === 'checkbox' || field.type === 'radio') return; // groupes geres via extraValidate
      if (!field.value.trim()) {
        setFieldError(field, 'Ce champ est requis.');
        valid = false;
      } else if (field.type === 'email' && !EMAIL_RE.test(field.value.trim())) {
        setFieldError(field, 'Adresse email invalide.');
        valid = false;
      }
    });

    // Telephone : optionnel partout, mais si rempli doit ressembler a un numero
    const phoneField = form.querySelector('input[type="tel"]');
    if (phoneField && phoneField.value.trim() && !PHONE_RE.test(phoneField.value.trim())) {
      setFieldError(phoneField, 'Numéro de téléphone invalide.');
      valid = false;
    }

    if (opts.extraValidate && !opts.extraValidate(form)) {
      valid = false;
    }

    if (!valid) {
      showStatus(status, 'error', 'Veuillez corriger les champs indiqués ci-dessous.');
      return;
    }

    if (!canSubmitNow(opts.cooldownKey)) {
      showStatus(status, 'error', 'Une demande a déjà été envoyée récemment. Merci de patienter quelques instants avant de réessayer.');
      return;
    }

    // Piege a bots : on feint le succes sans rien enregistrer ni contacter Supabase.
    if (isBot) {
      form.reset();
      showStatus(status, 'success', opts.successMessage || 'Merci, votre demande a bien été envoyée.');
      markSubmitted(opts.cooldownKey);
      return;
    }

    if (!window.supabaseClient) {
      showStatus(status, 'error', 'Le service est momentanément indisponible. Vos informations sont conservées : réessayez dans un instant.');
      return;
    }

    const payload = opts.buildPayload(form);

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi en cours…';
    }

    try {
      const { error } = await window.supabaseClient.from(opts.table).insert([payload]);
      if (error) throw error;

      markSubmitted(opts.cooldownKey);
      form.reset();
      showStatus(status, 'success', opts.successMessage || 'Merci. Votre demande a bien été enregistrée — notre équipe vous recontactera sous 48h.');
    } catch (err) {
      console.error('[ORACLE] Erreur Supabase:', err);
      showStatus(status, 'error', 'Une erreur est survenue lors de l\'envoi. Vos informations n\'ont pas été perdues : vérifiez votre connexion et réessayez.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
      }
    }
  });
}

function fieldValue(form, name) {
  const el = form.elements[name];
  if (!el) return null;
  const val = el.value.trim();
  return val === '' ? null : val;
}
function fieldInt(form, name) {
  const val = fieldValue(form, name);
  return val === null ? null : parseInt(val, 10);
}
function checkedValues(form, name) {
  return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map(el => el.value);
}

document.addEventListener('DOMContentLoaded', () => {

  /* ===== 1. Formulaire de demande de devis (contact.html) ===== */
  initSupabaseForm({
    formId: 'quoteForm',
    statusId: 'quoteFormStatus',
    table: 'demandes_devis',
    honeypotName: 'site_web',
    cooldownKey: 'oracle_last_submit_devis',
    successMessage: 'Merci. Votre demande de devis a bien été enregistrée — notre équipe vous recontactera sous 48h.',
    extraValidate(form) {
      // Aucune regle additionnelle obligatoire au-dela des [required] natifs
      return true;
    },
    buildPayload(form) {
      return {
        nom_complet: fieldValue(form, 'fullname'),
        organisation: fieldValue(form, 'organization'),
        fonction: fieldValue(form, 'fonction'),
        email: fieldValue(form, 'email'),
        telephone: fieldValue(form, 'phone'),
        type_evenement: fieldValue(form, 'event-type'),
        date_evenement: fieldValue(form, 'event-date'),
        nombre_participants: fieldInt(form, 'participants'),
        services: checkedValues(form, 'services'),
        description: fieldValue(form, 'message')
      };
    }
  });

  /* ===== 2. Formulaire d'inscription formation (services.html) ===== */
  initSupabaseForm({
    formId: 'trainingForm',
    statusId: 'trainingFormStatus',
    table: 'inscriptions_formation',
    honeypotName: 'site_web',
    cooldownKey: 'oracle_last_submit_formation',
    successMessage: 'Merci. Votre inscription a bien été enregistrée — notre équipe vous recontactera sous 48h.',
    extraValidate(form) {
      const checked = form.querySelector('input[name="format_souhaite"]:checked');
      const group = form.querySelector('.radio-group');
      if (!checked && group) {
        group.style.outline = '2px solid var(--error)';
        group.style.outlineOffset = '4px';
        return false;
      }
      if (group) group.style.outline = 'none';
      return true;
    },
    buildPayload(form) {
      return {
        nom_complet: fieldValue(form, 'nom_complet'),
        organisation: fieldValue(form, 'organisation'),
        email: fieldValue(form, 'email'),
        telephone: fieldValue(form, 'telephone'),
        formation: fieldValue(form, 'formation'),
        format_souhaite: fieldValue(form, 'format_souhaite'),
        nombre_participants: fieldInt(form, 'nombre_participants'),
        periode_souhaitee: fieldValue(form, 'periode_souhaitee'),
        message: fieldValue(form, 'message')
      };
    }
  });

  /* ===== 3. Formulaire de contact general (contact.html) ===== */
  initSupabaseForm({
    formId: 'generalContactForm',
    statusId: 'generalContactFormStatus',
    table: 'messages_contact',
    honeypotName: 'site_web',
    cooldownKey: 'oracle_last_submit_contact',
    successMessage: 'Merci, votre message a bien été envoyé — notre équipe vous répondra sous 48h.',
    buildPayload(form) {
      return {
        nom: fieldValue(form, 'nom'),
        email: fieldValue(form, 'email'),
        telephone: fieldValue(form, 'telephone'),
        sujet: fieldValue(form, 'sujet'),
        message: fieldValue(form, 'message')
      };
    }
  });

});
