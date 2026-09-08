import { useState, useMemo } from 'react';
import { STEPS } from '../config/steps';
import { supabase } from '../lib/supabaseClient';
import { useAutosave } from '../hooks/useAutosave';
import FieldRenderer from './FieldRenderer';

function flattenFields(fields) {
  return fields.flatMap((f) => (f.type === 'row' ? f.fields : [f]));
}

function validateStep(step, formData) {
  const errors = {};
  flattenFields(step.fields).forEach((f) => {
    if (!f.required) return;
    if (f.conditionalOn && !formData[f.conditionalOn]) return;
    if (f.conditionalOnNot && formData[f.conditionalOnNot]) return;
    const v = formData[f.key];
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    if (empty) errors[f.key] = 'Ce champ est requis.';
  });
  return errors;
}

export default function Wizard({ candidatId, token, initialData, onSubmitted }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { status: saveStatus, saveNow } = useAutosave(token, formData);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const progressPct = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  };

  const goNext = async () => {
    const stepErrors = validateStep(step, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    await saveNow();
    if (isLast) {
      await handleSubmit();
    } else {
      setStepIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goPrev = () => {
    setStepIndex((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      await saveNow();

      // References professionnelles -> table dediee (pas de colonne sur candidats)
      if (Array.isArray(formData.references) && formData.references.length > 0) {
        const rows = formData.references
          .filter((r) => r.nom || r.email)
          .map((r) => ({ candidat_id: candidatId, ...r }));
        if (rows.length > 0) await supabase.from('candidat_references').insert(rows);
      }

      const { data: numero, error } = await supabase.rpc('rpc_submit_candidat', { p_token: token });
      if (error) throw error;

      onSubmitted(numero);
    } catch (err) {
      console.error(err);
      setSubmitError("La soumission a échoué. Vos informations sont conservées : réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepNumberLabel = useMemo(() => `Étape ${stepIndex + 1} / ${STEPS.length}`, [stepIndex]);

  return (
    <>
      <div className="progress-bar-wrap">
        <div className="progress-bar-inner">
          <div className="progress-label">
            <span>{stepNumberLabel}</span>
            <span className="autosave-indicator">
              <span className={`autosave-dot ${saveStatus === 'saving' ? 'saving' : ''}`} />
              {saveStatus === 'saving' ? 'Sauvegarde…' : saveStatus === 'error' ? 'Erreur de sauvegarde' : 'Sauvegardé'}
            </span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progressPct}%` }} /></div>
        </div>
      </div>

      <main className="wizard-main">
        <span className="step-eyebrow">{step.title === STEPS[0].title ? 'Candidature ORACLE' : `Bloc ${stepIndex + 1}`}</span>
        <h2 className="step-title">{step.title}</h2>
        {step.desc && <p className="step-desc">{step.desc}</p>}

        {step.fields.map((f) => (
          <FieldRenderer key={f.key} field={f} formData={formData} onFieldChange={handleFieldChange} errors={errors} candidatId={candidatId} />
        ))}

        {submitError && <p className="field-error" style={{ marginBottom: 16 }}>{submitError}</p>}

        <div className="wizard-nav">
          <button type="button" className="btn btn-outline" onClick={goPrev} disabled={stepIndex === 0 || submitting}>← Précédent</button>
          <button type="button" className="btn btn-primary" onClick={goNext} disabled={submitting}>
            {submitting ? 'Envoi…' : isLast ? 'Soumettre ma candidature' : 'Suivant →'}
          </button>
        </div>
      </main>
    </>
  );
}
