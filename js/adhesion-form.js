/* =========================================================
   ORACLE — Formulaire de candidature d'adhesion (/adhesion)
   Reutilise les helpers definis dans js/forms.js (EMAIL_RE, PHONE_RE,
   setFieldError, clearFieldError, showStatus, canSubmitNow,
   markSubmitted, fieldValue, checkedValues).
   Charger forms.js AVANT ce fichier.
   ========================================================= */

const ADHESION_MAX_FILE_MB = 10;
const ADHESION_CV_TYPES = ['application/pdf'];
const ADHESION_PHOTO_TYPES = ['image/jpeg', 'image/png'];
const ADHESION_STORAGE_BUCKET = 'candidatures-adhesion';

function initAdhesionAutrePrecision() {
  const autreCheckbox = document.getElementById('adh-langue-autre');
  const precisionField = document.getElementById('adh-langue-autre-wrap');
  if (!autreCheckbox || !precisionField) return;

  function toggle() {
    precisionField.style.display = autreCheckbox.checked ? '' : 'none';
    if (!autreCheckbox.checked) {
      const input = document.getElementById('adh-langue-autre-precision');
      if (input) input.value = '';
    }
  }
  autreCheckbox.addEventListener('change', toggle);
  toggle();
}

async function uploadAdhesionFile(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const { data, error } = await window.supabaseClient
    .storage
    .from(ADHESION_STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;
  return { path: data.path, nom: file.name };
}

function initAdhesionForm() {
  const form = document.getElementById('adhesionForm');
  const status = document.getElementById('adhesionFormStatus');
  if (!form || !status) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = submitBtn.textContent;
  const cvInput = document.getElementById('adh-cv');
  const photoInput = document.getElementById('adh-photo');
  const cooldownKey = 'oracle_last_submit_adhesion';

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

    // Domaine d'interet
    const domaineField = form.querySelector('#adh-domaine');
    if (domaineField && !domaineField.value) {
      setFieldError(domaineField, 'Veuillez sélectionner un domaine d\'intérêt.');
      valid = false;
    }

    // Disponibilite (groupe radio requis)
    const disponibilite = form.querySelector('input[name="disponibilite"]:checked');
    const disponibiliteGroup = document.getElementById('adh-disponibilite-group');
    if (!disponibilite) {
      if (disponibiliteGroup) {
        disponibiliteGroup.style.outline = '2px solid var(--error)';
        disponibiliteGroup.style.outlineOffset = '4px';
      }
      valid = false;
    } else if (disponibiliteGroup) {
      disponibiliteGroup.style.outline = 'none';
    }

    // Acceptation des conditions obligatoire
    const accepte = document.getElementById('adh-accepte-conditions');
    if (!accepte.checked) {
      setFieldError(accepte, 'Vous devez accepter les conditions pour soumettre votre candidature.');
      valid = false;
    }

    // Fichiers : validation type/poids si presents
    const cvFile = cvInput && cvInput.files[0];
    if (cvFile) {
      if (!ADHESION_CV_TYPES.includes(cvFile.type)) {
        setFieldError(cvInput, 'Le CV doit être un fichier PDF.');
        valid = false;
      } else if (cvFile.size > ADHESION_MAX_FILE_MB * 1024 * 1024) {
        setFieldError(cvInput, `Fichier trop volumineux (max ${ADHESION_MAX_FILE_MB} Mo).`);
        valid = false;
      }
    }
    const photoFile = photoInput && photoInput.files[0];
    if (photoFile) {
      if (!ADHESION_PHOTO_TYPES.includes(photoFile.type)) {
        setFieldError(photoInput, 'La photo doit être au format JPG ou PNG.');
        valid = false;
      } else if (photoFile.size > ADHESION_MAX_FILE_MB * 1024 * 1024) {
        setFieldError(photoInput, `Fichier trop volumineux (max ${ADHESION_MAX_FILE_MB} Mo).`);
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
      showStatus(status, 'success', "Votre candidature a bien été reçue, l'équipe ORACLE l'examinera prochainement.");
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
      let cvAttachment = null;
      let photoAttachment = null;

      if (cvFile) {
        submitBtn.textContent = 'Envoi du CV…';
        cvAttachment = await uploadAdhesionFile(cvFile);
      }
      if (photoFile) {
        submitBtn.textContent = 'Envoi de la photo…';
        photoAttachment = await uploadAdhesionFile(photoFile);
      }

      submitBtn.textContent = 'Envoi en cours…';

      const payload = {
        nom_complet: fieldValue(form, 'nom_complet'),
        date_naissance: fieldValue(form, 'date_naissance'),
        email: fieldValue(form, 'email'),
        telephone: fieldValue(form, 'telephone'),
        ville: fieldValue(form, 'ville'),
        formation: fieldValue(form, 'formation'),
        experience_pertinente: fieldValue(form, 'experience_pertinente'),
        langues: checkedValues(form, 'langues'),
        langue_autre_precision: fieldValue(form, 'langue_autre_precision'),
        disponibilite: disponibilite.value,
        domaine_interet: fieldValue(form, 'domaine_interet'),
        lettre_motivation: fieldValue(form, 'lettre_motivation'),
        cv_storage_path: cvAttachment ? cvAttachment.path : null,
        cv_nom_fichier: cvAttachment ? cvAttachment.nom : null,
        photo_storage_path: photoAttachment ? photoAttachment.path : null,
        photo_nom_fichier: photoAttachment ? photoAttachment.nom : null,
        accepte_conditions: true
      };

      const { error } = await window.supabaseClient.from('candidatures_adhesion').insert([payload]);
      if (error) throw error;

      markSubmitted(cooldownKey);
      form.reset();
      initAdhesionAutrePrecision();
      showStatus(status, 'success', "Votre candidature a bien été reçue, l'équipe ORACLE l'examinera prochainement.");
    } catch (err) {
      console.error('[ORACLE] Erreur soumission candidature adhesion:', err);
      showStatus(status, 'error', "Une erreur est survenue lors de l'envoi. Vos informations n'ont pas été perdues : vérifiez votre connexion et réessayez.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAdhesionAutrePrecision();
  initAdhesionForm();
});
