/* =========================================================
   SERIN 2027 — Formulaire de candidature
   Reutilise les helpers definis dans js/forms.js (EMAIL_RE, PHONE_RE,
   setFieldError, clearFieldError, showStatus, canSubmitNow,
   markSubmitted, fieldValue, fieldInt, checkedValues).
   Charger forms.js AVANT ce fichier.
   ========================================================= */

const SERIN_MAX_WORDS = 300;
const SERIN_MAX_FILE_MB = 10;
const SERIN_ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const SERIN_STORAGE_BUCKET = 'candidatures-serin';

function initSerinWordCounter() {
  const textarea = document.getElementById('serin-motivation');
  const counter = document.getElementById('serinWordCount');
  if (!textarea || !counter) return;

  function update() {
    const words = textarea.value.trim().split(/\s+/).filter(Boolean).length;
    counter.textContent = `${words} / ${SERIN_MAX_WORDS} mots`;
    counter.classList.toggle('over-limit', words > SERIN_MAX_WORDS);
  }
  textarea.addEventListener('input', update);
  update();
}

function initSerinAutrePrecision() {
  const autreCheckbox = document.querySelector('input[name="besoins_specifiques"][value="autre"]');
  const precisionField = document.getElementById('serin-besoin-autre-wrap');
  const precisionInput = document.getElementById('serin-besoin-autre');
  if (!autreCheckbox || !precisionField || !precisionInput) return;

  function toggle() {
    const show = autreCheckbox.checked;
    precisionField.style.display = show ? '' : 'none';
    precisionInput.required = show;
    if (!show) precisionInput.value = '';
  }
  autreCheckbox.addEventListener('change', toggle);
  toggle();
}

async function uploadSerinAttachment(file) {
  const ext = file.name.split('.').pop();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const { data, error } = await window.supabaseClient
    .storage
    .from(SERIN_STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;
  return { path: data.path, nom: file.name };
}

function initSerinForm() {
  const form = document.getElementById('serinCandidatureForm');
  const status = document.getElementById('serinFormStatus');
  if (!form || !status) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = submitBtn.textContent;
  const fileInput = document.getElementById('serin-piece-jointe');
  const cooldownKey = 'serin_last_submit_candidature';

  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('input', () => clearFieldError(field));
    field.addEventListener('change', () => clearFieldError(field));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.classList.remove('show', 'success', 'error');

    const honeypot = form.querySelector('[name="site_web"]');
    const isBot = honeypot && honeypot.value.trim() !== '';

    let valid = true;

    form.querySelectorAll('[required]').forEach(field => {
      clearFieldError(field);
      if (field.type === 'checkbox' || field.type === 'radio') return;
      if (!field.value.trim()) {
        setFieldError(field, 'Ce champ est requis.');
        valid = false;
      } else if (field.type === 'email' && !EMAIL_RE.test(field.value.trim())) {
        setFieldError(field, 'Adresse email invalide.');
        valid = false;
      }
    });

    const phoneField = form.querySelector('input[type="tel"]');
    if (phoneField && phoneField.value.trim() && !PHONE_RE.test(phoneField.value.trim())) {
      setFieldError(phoneField, 'Numéro de téléphone invalide.');
      valid = false;
    }

    // Au moins un axe thematique
    const axes = checkedValues(form, 'axes_thematiques');
    const axesGroup = form.querySelector('#serin-axes-group');
    if (axes.length === 0) {
      axesGroup.style.outline = '2px solid var(--error)';
      axesGroup.style.outlineOffset = '4px';
      valid = false;
    } else {
      axesGroup.style.outline = 'none';
    }

    // Acceptation des conditions obligatoire
    const accepte = form.querySelector('#serin-accepte-conditions');
    if (!accepte.checked) {
      setFieldError(accepte, 'Vous devez accepter les conditions de participation.');
      valid = false;
    }

    // Fichier joint : validation optionnelle du type/poids si present
    const file = fileInput && fileInput.files[0];
    if (file) {
      if (!SERIN_ALLOWED_FILE_TYPES.includes(file.type)) {
        setFieldError(fileInput, 'Format non supporté (PDF, JPG ou PNG uniquement).');
        valid = false;
      } else if (file.size > SERIN_MAX_FILE_MB * 1024 * 1024) {
        setFieldError(fileInput, `Fichier trop volumineux (max ${SERIN_MAX_FILE_MB} Mo).`);
        valid = false;
      }
    }

    if (!valid) {
      showStatus(status, 'error', 'Veuillez corriger les champs indiqués ci-dessous.');
      return;
    }

    if (!canSubmitNow(cooldownKey)) {
      showStatus(status, 'error', 'Une candidature a déjà été envoyée récemment. Merci de patienter quelques instants avant de réessayer.');
      return;
    }

    if (isBot) {
      form.reset();
      showStatus(status, 'success', "Merci, votre candidature a bien été reçue. L'équipe du SERIN vous recontactera prochainement.");
      markSubmitted(cooldownKey);
      return;
    }

    if (!window.supabaseClient) {
      showStatus(status, 'error', 'Le service est momentanément indisponible. Vos informations sont conservées : réessayez dans un instant.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours…';

    try {
      let attachment = null;
      if (file) {
        submitBtn.textContent = 'Envoi du fichier…';
        attachment = await uploadSerinAttachment(file);
      }

      submitBtn.textContent = 'Envoi en cours…';

      const payload = {
        nom_organisation: fieldValue(form, 'nom_organisation'),
        secteur_activite: fieldValue(form, 'secteur_activite'),
        type_candidature: fieldValue(form, 'type_candidature'),
        axes_thematiques: axes,
        nom_representant: fieldValue(form, 'nom_representant'),
        fonction: fieldValue(form, 'fonction'),
        email: fieldValue(form, 'email'),
        telephone: fieldValue(form, 'telephone'),
        pays: fieldValue(form, 'pays'),
        ville: fieldValue(form, 'ville'),
        presentation_motivation: fieldValue(form, 'presentation_motivation'),
        nombre_personnes_delegation: fieldInt(form, 'nombre_personnes_delegation'),
        besoins_specifiques: checkedValues(form, 'besoins_specifiques'),
        besoin_autre_precision: fieldValue(form, 'besoin_autre_precision'),
        piece_jointe_path: attachment ? attachment.path : null,
        piece_jointe_nom: attachment ? attachment.nom : null,
        accepte_conditions: true
      };

      const { error } = await window.supabaseClient.from('candidatures_serin').insert([payload]);
      if (error) throw error;

      markSubmitted(cooldownKey);
      form.reset();
      initSerinAutrePrecision();
      initSerinWordCounter();
      showStatus(status, 'success', "Merci. Votre candidature a bien été reçue, l'équipe du SERIN vous recontactera prochainement.");
    } catch (err) {
      console.error('[SERIN] Erreur soumission candidature:', err);
      showStatus(status, 'error', "Une erreur est survenue lors de l'envoi. Vos informations n'ont pas été perdues : vérifiez votre connexion et réessayez.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSerinWordCounter();
  initSerinAutrePrecision();
  initSerinForm();
});
