import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { logActivity } from '../utils/logActivity';
import { formatDateTime } from '../utils/format';

const STATUT = {
  en_attente: ['En attente', 'badge-gold'],
  approuve: ['Approuvé', 'badge-green'],
  rejete: ['Rejeté', 'badge-red'],
  annule: ['Annulé', 'badge-red'],
};

export default function Validations() {
  const { adminProfile } = useAuth();
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('en_attente');
  const [notes, setNotes] = useState({});

  const load = async () => {
    setLoading(true);
    let q = supabase.from('validations').select('*').order('created_at', { ascending: false }).limit(100);
    if (filter !== 'tous') q = q.eq('statut', filter);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const decide = async (row, statut) => {
    const { error } = await supabase.from('validations').update({
      statut, decide_par: adminProfile.id, decide_le: new Date().toISOString(), note_decision: notes[row.id]?.trim() || null,
    }).eq('id', row.id);
    if (error) { showToast(error.message, 'error'); return; }
    await logActivity(`validation_${statut}`, { module: row.module, titre: row.titre, montant: row.montant, note: notes[row.id]?.trim() || null });
    showToast('Décision enregistrée.');
    load();
  };

  return (
    <>
      <PageHeader title="Validations" />
      <div className="admin-content">
        <div className="role-tabs">
          {[['en_attente', 'En attente'], ['approuve', 'Approuvées'], ['rejete', 'Rejetées'], ['annule', 'Annulées'], ['tous', 'Toutes']].map(([k, l]) => (
            <button key={k} type="button" className={`role-tab${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Demande</th><th>Module</th><th>Montant</th><th>Demandé par</th><th>Date</th><th>État</th><th>Décision</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ cursor: 'default' }}>
                    <td>{r.titre}</td>
                    <td>{r.module}</td>
                    <td>{r.montant != null ? Number(r.montant).toLocaleString('fr-FR') : '—'}</td>
                    <td>{r.demande_par_email || '—'}</td>
                    <td>{formatDateTime(r.created_at)}</td>
                    <td><span className={`badge ${STATUT[r.statut][1]}`}>{STATUT[r.statut][0]}</span></td>
                    <td style={{ minWidth: 240 }}>
                      <input
                        placeholder="Note (facultatif)"
                        value={notes[r.id] || ''}
                        onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                        style={{ width: '100%', padding: 6, marginBottom: 6, border: '1.5px solid var(--border)', borderRadius: 6 }}
                      />
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {r.statut !== 'approuve' && <button className="btn btn-primary btn-sm" onClick={() => decide(r, 'approuve')}>Approuver</button>}
                        {r.statut === 'en_attente' && <button className="btn btn-danger btn-sm" onClick={() => decide(r, 'rejete')}>Rejeter</button>}
                        {r.statut === 'approuve' && <button className="btn btn-danger btn-sm" onClick={() => decide(r, 'annule')}>Annuler la décision</button>}
                        {(r.statut === 'rejete' || r.statut === 'annule') && <button className="btn btn-outline btn-sm" onClick={() => decide(r, 'en_attente')}>Débloquer</button>}
                      </div>
                      {r.note_decision && <div className="field-hint">{r.note_decision}</div>}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} className="table-empty">Aucune validation.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
