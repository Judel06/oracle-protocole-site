import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import PresenceModule from '../components/PresenceModule';
import ApprovalModule from '../components/ApprovalModule';
import { ENTITIES, STATUT_LABELS } from '../config/entities';
import { formatRelative } from '../utils/format';
import { useToast } from '../context/ToastContext';

const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const DOSSIER_COMPLET_URL = 'https://oracleprotocole.com/dossierscomplets';

function ShareDossierLink() {
  const { showToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(DOSSIER_COMPLET_URL);
      showToast('Lien copié dans le presse-papiers.');
    } catch {
      showToast('Impossible de copier automatiquement — sélectionnez et copiez le lien manuellement.', 'error');
    }
  };

  return (
    <div className="card card-pad" style={{ marginBottom: 24 }}>
      <div className="section-title">Lien du dossier de candidature complet</div>
      <p className="field-hint" style={{ marginTop: -6, marginBottom: 14 }}>
        Réservé à l'équipe ORACLE — à transmettre directement (email, WhatsApp…) aux candidats invités à compléter le grand dossier en 22 étapes. Ce lien n'apparaît nulle part sur le site public.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          type="text"
          readOnly
          value={DOSSIER_COMPLET_URL}
          onFocus={(e) => e.target.select()}
          style={{ flex: '1 1 320px', padding: 10, border: '1.5px solid var(--border)', borderRadius: 8, fontFamily: 'monospace', fontSize: '.86rem', color: 'var(--text-soft)', background: 'var(--bg)' }}
        />
        <button className="btn btn-primary" onClick={handleCopy}>Copier le lien</button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [statutBreakdown, setStatutBreakdown] = useState({});
  const [latest, setLatest] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const entityKeys = Object.keys(ENTITIES);
      const results = await Promise.all(
        entityKeys.map(async (key) => {
          const table = ENTITIES[key].table;
          const [{ count: total }, { count: last30 }, { data: statuts }] = await Promise.all([
            supabase.from(table).select('id', { count: 'exact', head: true }),
            supabase.from(table).select('id', { count: 'exact', head: true }).gte('created_at', THIRTY_DAYS_AGO),
            supabase.from(table).select('statut'),
          ]);
          return { key, table, total: total ?? 0, last30: last30 ?? 0, statuts: statuts ?? [] };
        })
      );

      if (cancelled) return;

      const kpiData = {};
      const breakdown = {};
      results.forEach((r) => {
        kpiData[r.key] = { total: r.total, last30: r.last30 };
        const counts = {};
        r.statuts.forEach((row) => { counts[row.statut] = (counts[row.statut] || 0) + 1; });
        breakdown[r.key] = counts;
      });

      setKpis(kpiData);
      setStatutBreakdown(breakdown);

      // 5 dernieres soumissions tous types confondus
      const recents = await Promise.all(
        entityKeys.map(async (key) => {
          const cfg = ENTITIES[key];
          const { data } = await supabase.from(cfg.table).select('*').order('created_at', { ascending: false }).limit(5);
          return (data || []).map((row) => ({ ...row, __entity: key }));
        })
      );
      const merged = recents.flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
      if (!cancelled) {
        setLatest(merged);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="admin-content"><LoadingSpinner /></div>
      </>
    );
  }

  const nameOf = (row, key) => row.nom_complet || row.nom || '—';

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="admin-content">

        <div className="kpi-grid">
          {Object.entries(ENTITIES).map(([key, cfg]) => (
            <div key={key} className="kpi-card">
              <div className="kpi-label">{cfg.labelPlural}</div>
              <div className="kpi-value">{kpis[key].total}</div>
              <div className="kpi-sub"><strong>+{kpis[key].last30}</strong> sur les 30 derniers jours</div>
            </div>
          ))}
        </div>

        <ShareDossierLink />

        <div className="modules-grid">
          <PresenceModule />
          <ApprovalModule />
        </div>

        <div className="card card-pad" style={{ marginBottom: 24 }}>
          <div className="section-title">Répartition par statut</div>
          <div className="statut-breakdown-grid">
            {Object.entries(ENTITIES).map(([key, cfg]) => (
              <div key={key}>
                <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--text-soft)', marginBottom: 8 }}>{cfg.labelPlural}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {cfg.statutOptions.map((s) => (
                    <span key={s} className={`badge badge-${{ nouveau: 'gold', en_cours: 'navy', traite: 'green', repondu: 'green' }[s]}`}>
                      {STATUT_LABELS[s]} · {statutBreakdown[key]?.[s] || 0}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-pad" style={{ paddingBottom: 0 }}>
            <div className="section-title">Dernières soumissions</div>
          </div>
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr><th>Type</th><th>Nom</th><th>Statut</th><th>Reçu</th></tr>
              </thead>
              <tbody>
                {latest.map((row) => (
                  <tr key={`${row.__entity}-${row.id}`} onClick={() => navigate(`/${ENTITIES[row.__entity].route}/${row.id}`)}>
                    <td>{ENTITIES[row.__entity].label}</td>
                    <td>{nameOf(row)}</td>
                    <td><StatusBadge statut={row.statut} /></td>
                    <td>{formatRelative(row.created_at)}</td>
                  </tr>
                ))}
                {latest.length === 0 && <tr><td colSpan={4} className="table-empty">Aucune soumission pour l'instant.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
