import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend,
} from 'chart.js';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import { ENTITIES, STATUT_LABELS } from '../config/entities';
import { formatRelative } from '../utils/format';
import { buildWeeklyBuckets, countByWeek } from '../utils/dateBuckets';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const WEEKS = 8;

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [statutBreakdown, setStatutBreakdown] = useState({});
  const [chartData, setChartData] = useState(null);
  const [latest, setLatest] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const buckets = buildWeeklyBuckets(WEEKS);
      const since = buckets[0].start.toISOString();

      const entityKeys = Object.keys(ENTITIES);
      const results = await Promise.all(
        entityKeys.map(async (key) => {
          const table = ENTITIES[key].table;
          const [{ count: total }, { count: last30 }, { data: statuts }, { data: recentDates }] = await Promise.all([
            supabase.from(table).select('id', { count: 'exact', head: true }),
            supabase.from(table).select('id', { count: 'exact', head: true }).gte('created_at', THIRTY_DAYS_AGO),
            supabase.from(table).select('statut'),
            supabase.from(table).select('created_at').gte('created_at', since),
          ]);
          return { key, table, total: total ?? 0, last30: last30 ?? 0, statuts: statuts ?? [], recentDates: recentDates ?? [] };
        })
      );

      if (cancelled) return;

      const kpiData = {};
      const breakdown = {};
      const series = {};
      results.forEach((r) => {
        kpiData[r.key] = { total: r.total, last30: r.last30 };
        const counts = {};
        r.statuts.forEach((row) => { counts[row.statut] = (counts[row.statut] || 0) + 1; });
        breakdown[r.key] = counts;
        series[r.key] = countByWeek(r.recentDates.map((d) => d.created_at), buckets);
      });

      setKpis(kpiData);
      setStatutBreakdown(breakdown);
      setChartData({
        labels: buckets.map((b) => b.label),
        datasets: [
          { label: 'Devis', data: series.devis, borderColor: '#C9A84C', backgroundColor: '#C9A84C', tension: .3 },
          { label: 'Formations', data: series.formations, borderColor: '#0D1B2A', backgroundColor: '#0D1B2A', tension: .3 },
          { label: 'Messages', data: series.messages, borderColor: '#2F855A', backgroundColor: '#2F855A', tension: .3 },
        ],
      });

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

        <div className="detail-grid">
          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <div className="section-title">Évolution des soumissions (8 dernières semaines)</div>
            {chartData && <Line data={chartData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} />}
          </div>

          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <div className="section-title">Répartition par statut</div>
            {Object.entries(ENTITIES).map(([key, cfg]) => (
              <div key={key} style={{ marginBottom: 16 }}>
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
