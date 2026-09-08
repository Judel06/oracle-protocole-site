import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import { ENTITIES, STATUT_LABELS } from '../config/entities';
import { formatDate, formatDateTime } from '../utils/format';
import { logActivity } from '../utils/logActivity';
import { useToast } from '../context/ToastContext';

export default function EntityDetail({ entityKey }) {
  const { id } = useParams();
  const cfg = ENTITIES[entityKey];
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.from(cfg.table).select('*').eq('id', id).single();
      if (!cancelled) {
        if (!error) {
          setRow(data);
          setNotes(data.notes_internes || '');
        }
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [cfg.table, id]);

  const handleStatusChange = async (newStatut) => {
    const previous = row.statut;
    setSavingStatus(true);
    setRow((r) => ({ ...r, statut: newStatut }));
    const { error } = await supabase.from(cfg.table).update({ statut: newStatut }).eq('id', id);
    setSavingStatus(false);
    if (error) {
      setRow((r) => ({ ...r, statut: previous }));
      showToast("Le changement de statut a échoué.", 'error');
      return;
    }
    await logActivity('statut_change', { table: cfg.table, record_id: id, ancien_statut: previous, nouveau_statut: newStatut });
    showToast('Statut mis à jour.');
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const { error } = await supabase.from(cfg.table).update({ notes_internes: notes }).eq('id', id);
    setSavingNotes(false);
    if (error) {
      showToast("L'enregistrement des notes a échoué.", 'error');
      return;
    }
    await logActivity('notes_update', { table: cfg.table, record_id: id });
    showToast('Notes internes enregistrées.');
  };

  if (!cfg) return <div className="admin-content">Section inconnue.</div>;
  if (loading) return (<><PageHeader title={cfg.label} /><div className="admin-content"><LoadingSpinner /></div></>);
  if (!row) return (<><PageHeader title={cfg.label} /><div className="admin-content">Introuvable. <Link to={`/${cfg.route}`}>← Retour à la liste</Link></div></>);

  const displayName = row.nom_complet || row.nom || row.email;

  return (
    <>
      <PageHeader title={cfg.label} />
      <div className="admin-content">
        <Link to={`/${cfg.route}`} style={{ fontSize: '.86rem', color: 'var(--text-soft)', display: 'inline-block', marginBottom: 16 }}>← Retour à {cfg.labelPlural.toLowerCase()}</Link>

        <div className="detail-header">
          <div>
            <h2 style={{ color: 'var(--navy)', marginBottom: 6 }}>{displayName}</h2>
            <span style={{ fontSize: '.84rem', color: 'var(--text-soft)' }}>Soumis le {formatDateTime(row.created_at)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {savingStatus && <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
            <select
              className="status-select"
              value={row.statut}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={savingStatus}
            >
              {cfg.statutOptions.map((s) => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
            </select>
          </div>
        </div>

        <div className="detail-grid">
          <div>
            <div className="card card-pad">
              {cfg.detailGroups.map((group, i) => (
                <div className="detail-group" key={i}>
                  {group.title && <h3>{group.title}</h3>}
                  {group.fields.map((f) => {
                    const value = row[f.key];
                    if (f.isLongText) {
                      return <div key={f.key} className="detail-longtext">{value || '—'}</div>;
                    }
                    const display = f.isDate ? formatDate(value)
                      : f.isDateTime ? formatDateTime(value)
                      : f.isList ? (Array.isArray(value) && value.length ? value.join(', ') : '—')
                      : f.format ? f.format(value, row)
                      : (value ?? '—');
                    return (
                      <div className="detail-row" key={f.key}>
                        <span className="k">{f.label}</span>
                        <span className="v">{display}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {row.piece_jointe_nom && (
                <div className="detail-group">
                  <h3>Pièce jointe</h3>
                  <div className="detail-row"><span className="k">Fichier</span><span className="v">{row.piece_jointe_nom}</span></div>
                  <p className="field-hint">Téléchargeable depuis Supabase Storage (bucket candidatures-serin).</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="card card-pad">
              <div className="section-title">Notes internes</div>
              <p className="field-hint" style={{ marginTop: -6, marginBottom: 12 }}>Visibles uniquement par l'équipe admin.</p>
              <textarea
                rows={8}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajoutez une note de suivi…"
                style={{ width: '100%', padding: 12, border: '1.5px solid var(--border)', borderRadius: 8, marginBottom: 12, resize: 'vertical' }}
              />
              <button className="btn btn-primary" onClick={handleSaveNotes} disabled={savingNotes}>
                {savingNotes ? 'Enregistrement…' : 'Enregistrer les notes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
