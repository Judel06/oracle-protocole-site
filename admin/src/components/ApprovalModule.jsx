import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { logActivity } from '../utils/logActivity';
import { formatDate } from '../utils/format';

/**
 * Module "Approbation" du dashboard : demandes de devis en attente de
 * validation avant passage en facturation. L'email de notification est
 * envoye automatiquement cote base (trigger sur demandes_devis).
 */
export default function ApprovalModule() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [refusingId, setRefusingId] = useState(null);
  const [motif, setMotif] = useState('');
  const [fadingId, setFadingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('demandes_devis')
      .select('*')
      .eq('statut_approbation', 'en_attente')
      .order('created_at', { ascending: true });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const applyDecision = async (row, decision, reason) => {
    setBusyId(row.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('demandes_devis')
      .update({
        statut_approbation: decision,
        motif_refus: decision === 'refuse' ? (reason || null) : null,
        date_approbation: new Date().toISOString(),
        approuve_par: user?.id || null,
      })
      .eq('id', row.id);
    setBusyId(null);

    if (error) {
      showToast("L'action a échoué.", 'error');
      return;
    }

    await logActivity(decision === 'approuve_attente_paiement' ? 'devis_approuve' : 'devis_refuse', {
      record_id: row.id, organisation: row.organisation, motif: reason || null,
    });
    showToast(decision === 'approuve_attente_paiement' ? 'Demande approuvée — en attente de paiement.' : 'Demande refusée.');

    setFadingId(row.id);
    setTimeout(() => {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setFadingId(null);
    }, 350);
    setRefusingId(null);
    setMotif('');
  };

  return (
    <div className="card card-pad module-card">
      <div className="module-header">
        <div>
          <div className="section-title" style={{ marginBottom: 4 }}>Approbation</div>
          <span className="field-hint" style={{ marginTop: 0 }}>
            <strong style={{ color: 'var(--gold-dark)' }}>{rows.length}</strong> demande{rows.length > 1 ? 's' : ''} en attente d'approbation
          </span>
        </div>
      </div>

      <div className="module-list">
        {!loading && rows.length === 0 && <p className="field-hint">Aucune demande en attente pour l'instant.</p>}
        {rows.map((row) => (
          <div key={row.id} className={`module-row module-row-col ${fadingId === row.id ? 'fading-out' : ''}`}>
            <div className="module-row-main" style={{ cursor: 'pointer' }} onClick={() => navigate(`/devis/${row.id}`)}>
              <strong>{row.organisation || row.nom_complet}</strong>
              <div className="module-row-meta">
                <span className="field-hint" style={{ margin: 0 }}>
                  {Array.isArray(row.services) && row.services.length ? row.services.join(', ') : 'Service non précisé'}
                </span>
              </div>
              <div className="field-hint" style={{ margin: 0 }}>
                {formatDate(row.date_evenement)}{row.lieu ? ` · ${row.lieu}` : ' · Lieu non renseigné'}
              </div>
            </div>

            {refusingId === row.id ? (
              <div className="confirm-popover" style={{ width: '100%' }}>
                <input type="text" placeholder="Motif du refus (optionnel)" value={motif} onChange={(e) => setMotif(e.target.value)} />
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => { setRefusingId(null); setMotif(''); }}>Annuler</button>
                  <button className="btn btn-danger btn-sm" disabled={busyId === row.id} onClick={() => applyDecision(row, 'refuse', motif)}>
                    {busyId === row.id ? '…' : 'Confirmer le refus'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="module-row-action" style={{ justifyContent: 'flex-end', width: '100%' }}>
                <button className="btn btn-outline btn-sm" disabled={busyId === row.id} onClick={() => setRefusingId(row.id)}>Refuser</button>
                <button className="btn btn-primary btn-sm" disabled={busyId === row.id} onClick={() => applyDecision(row, 'approuve_attente_paiement')}>
                  {busyId === row.id ? '…' : 'Approuver'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
