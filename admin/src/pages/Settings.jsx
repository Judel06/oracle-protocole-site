import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { logActivity } from '../utils/logActivity';

const FIELDS = [
  { key: 'adresse', label: 'Adresse' },
  { key: 'telephone', label: 'Téléphone' },
  { key: 'email', label: 'Email' },
  { key: 'facebook_url', label: 'Facebook (URL)' },
  { key: 'x_url', label: 'X / Twitter (URL)' },
  { key: 'linkedin_url', label: 'LinkedIn (URL)' },
  { key: 'instagram_url', label: 'Instagram (URL)' },
];

export default function Settings() {
  const { showToast } = useToast();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    supabase.from('parametres_site').select('*').eq('id', 1).single().then(({ data }) => {
      setForm(data || {});
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setConfirmOpen(false);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...form, updated_at: new Date().toISOString(), updated_by: user?.id };
    delete payload.id;
    const { error } = await supabase.from('parametres_site').update(payload).eq('id', 1);
    setSaving(false);
    if (error) {
      showToast("L'enregistrement a échoué.", 'error');
      return;
    }
    await logActivity('parametres_update', { fields: Object.keys(payload) });
    showToast('Paramètres du site mis à jour.');
  };

  if (loading || !form) return (<><PageHeader title="Paramètres du site" /><div className="admin-content"><LoadingSpinner /></div></>);

  return (
    <>
      <PageHeader title="Paramètres du site" />
      <div className="admin-content">
        <div className="card card-pad" style={{ maxWidth: 620 }}>
          <div className="section-title">Coordonnées publiques</div>
          <p className="field-hint" style={{ marginTop: -8, marginBottom: 18 }}>
            Ces informations sont affichées dynamiquement sur oracleprotocole.com (footer, page Contact) — aucune modification de code nécessaire.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); setConfirmOpen(true); }}>
            {FIELDS.map((f) => (
              <div className="field" key={f.key}>
                <label>{f.label}</label>
                <input
                  type="text"
                  value={form[f.key] || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmer la mise à jour"
        message="Ces coordonnées seront visibles immédiatement sur le site public."
        confirmLabel="Confirmer et enregistrer"
        onConfirm={handleSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
