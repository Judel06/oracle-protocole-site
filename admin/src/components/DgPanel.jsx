import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { formatDateTime } from '../utils/format';

const THIRTY_DAYS_AGO = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const SEVEN_DAYS_AGO = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

// Tableau de bord du Directeur General : validations en attente, paiements au-dessus
// du plafond, alertes, activite des gestionnaires sur 30 jours.
export default function DgPanel() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: pending }, { data: cfg }, { data: log }, { count: stale }, { count: devisWaiting }] = await Promise.all([
        supabase.from('validations').select('*').eq('statut', 'en_attente').order('created_at'),
        supabase.from('admin_config').select('plafond_paiement').eq('id', 1).maybeSingle(),
        supabase.from('activity_log').select('admin_email, details').gte('created_at', THIRTY_DAYS_AGO()).limit(5000),
        supabase.from('messages_contact').select('id', { count: 'exact', head: true }).eq('statut', 'nouveau').is('archived_at', null).lt('created_at', SEVEN_DAYS_AGO()),
        supabase.from('demandes_devis').select('id', { count: 'exact', head: true }).eq('statut_approbation', 'en_attente'),
      ]);
      if (cancelled) return;

      const plafond = Number(cfg?.plafond_paiement ?? 0);
      const byUser = {};
      (log || []).forEach((l) => {
        const u = byUser[l.admin_email] || (byUser[l.admin_email] = { actions: 0, role: l.details?.role });
        u.actions += 1;
        u.role = l.details?.role || u.role;
      });
      setData({
        pending: pending || [],
        overThreshold: (pending || []).filter((p) => p.module === 'paiements' && Number(p.montant) > plafond),
        plafond,
        activity: Object.entries(byUser).sort((a, b) => b[1].actions - a[1].actions),
        alerts: [
          stale ? `${stale} message(s) de contact sans réponse depuis plus de 7 jours.` : null,
          devisWaiting ? `${devisWaiting} demande(s) de devis en attente d'approbation.` : null,
        ].filter(Boolean),
      });
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (!data) return null;

  return (
    <div className="card card-pad" style={{ marginBottom: 24, borderTop: '3px solid var(--gold)' }}>
      <div className="section-title">Tableau de bord du Directeur Général</div>

      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="kpi-card">
          <div className="kpi-label">En attente de ma validation</div>
          <div className="kpi-value">{data.pending.length}</div>
          <div className="kpi-sub"><Link to="/validations">Ouvrir les validations</Link></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Paiements au-dessus du seuil</div>
          <div className="kpi-value">{data.overThreshold.length}</div>
          <div className="kpi-sub">Plafond : {data.plafond.toLocaleString('fr-FR')}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Alertes</div>
          <div className="kpi-value">{data.alerts.length}</div>
        </div>
      </div>

      {data.alerts.length > 0 && (
        <ul style={{ margin: '0 0 18px 18px', color: 'var(--red)', fontSize: '.88rem' }}>
          {data.alerts.map((a) => <li key={a}>{a}</li>)}
        </ul>
      )}

      {data.pending.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: 18 }}>
          <table className="data-table">
            <thead><tr><th>Dossier en attente</th><th>Module</th><th>Montant</th><th>Depuis</th></tr></thead>
            <tbody>
              {data.pending.slice(0, 5).map((p) => (
                <tr key={p.id} style={{ cursor: 'default' }}>
                  <td>{p.titre}</td><td>{p.module}</td>
                  <td>{p.montant != null ? Number(p.montant).toLocaleString('fr-FR') : '—'}</td>
                  <td>{formatDateTime(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--text-soft)', marginBottom: 8 }}>Activité des gestionnaires — 30 derniers jours</div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Utilisateur</th><th>Rôle</th><th>Actions</th></tr></thead>
          <tbody>
            {data.activity.map(([email, u]) => (
              <tr key={email} style={{ cursor: 'default' }}><td>{email}</td><td>{u.role || '—'}</td><td>{u.actions}</td></tr>
            ))}
            {data.activity.length === 0 && <tr><td colSpan={3} className="table-empty">Aucune activité.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
