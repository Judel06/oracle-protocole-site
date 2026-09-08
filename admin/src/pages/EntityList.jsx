import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import { ENTITIES } from '../config/entities';
import { exportToCsv } from '../utils/csvExport';
import { logActivity } from '../utils/logActivity';
import { useToast } from '../context/ToastContext';

const PAGE_SIZE = 20;

/**
 * Page liste generique, pilotee par la config d'entite (voir config/entities.js).
 * Reutilisee pour /devis, /formations et /messages.
 */
export default function EntityList({ entityKey }) {
  const cfg = ENTITIES[entityKey];
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [exporting, setExporting] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase.from(cfg.table).select('*', { count: 'exact' });

    if (search.trim()) {
      const like = `%${search.trim()}%`;
      const orExpr = cfg.searchFields.map((f) => `${f}.ilike.${like}`).join(',');
      query = query.or(orExpr);
    }
    Object.entries(filters).forEach(([key, value]) => {
      if (!value) return;
      if (key === 'periode_debut') query = query.gte('created_at', value);
      else if (key === 'periode_fin') query = query.lte('created_at', `${value}T23:59:59`);
      else query = query.eq(key, value);
    });

    query = query.order(sortKey, { ascending: sortDir === 'asc' });
    query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (!error) {
      setRows(data || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [cfg.table, cfg.searchFields, search, filters, sortKey, sortDir, page]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { setPage(1); }, [search, filters, entityKey]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let query = supabase.from(cfg.table).select('*');
      if (search.trim()) {
        const like = `%${search.trim()}%`;
        query = query.or(cfg.searchFields.map((f) => `${f}.ilike.${like}`).join(','));
      }
      Object.entries(filters).forEach(([key, value]) => {
        if (!value) return;
        if (key === 'periode_debut') query = query.gte('created_at', value);
        else if (key === 'periode_fin') query = query.lte('created_at', `${value}T23:59:59`);
        else query = query.eq(key, value);
      });
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      exportToCsv(cfg.csvColumns, data || [], `${cfg.route}-${new Date().toISOString().slice(0, 10)}`);
      await logActivity('export_csv', { table: cfg.table, count: data?.length || 0 });
      showToast(`${data?.length || 0} ligne(s) exportée(s).`);
    } catch (err) {
      showToast(err.message || "L'export a échoué.", 'error');
    } finally {
      setExporting(false);
    }
  };

  if (!cfg) return <div className="admin-content">Section inconnue.</div>;

  return (
    <>
      <PageHeader
        title={cfg.labelPlural}
        actions={<button className="btn btn-outline" onClick={handleExport} disabled={exporting}>{exporting ? 'Export…' : 'Exporter en CSV'}</button>}
      />
      <div className="admin-content">

        <div className="filters-bar">
          <div className="filter-field search-field">
            <label>Recherche</label>
            <input
              type="text"
              placeholder="Nom, organisation, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {cfg.filterFields.map((f) => (
            <div className="filter-field" key={f.key}>
              <label>{f.label}</label>
              <select value={filters[f.key] || ''} onChange={(e) => setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))}>
                <option value="">Tous</option>
                {f.options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
          <div className="filter-field">
            <label>Depuis le</label>
            <input type="date" value={filters.periode_debut || ''} onChange={(e) => setFilters((prev) => ({ ...prev, periode_debut: e.target.value }))} />
          </div>
          <div className="filter-field">
            <label>Jusqu'au</label>
            <input type="date" value={filters.periode_fin || ''} onChange={(e) => setFilters((prev) => ({ ...prev, periode_fin: e.target.value }))} />
          </div>
        </div>

        <DataTable
          columns={cfg.listColumns}
          rows={rows}
          loading={loading}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onRowClick={(row) => navigate(`/${cfg.route}/${row.id}`)}
          emptyLabel={`Aucune ${cfg.label.toLowerCase()} ne correspond à ces critères.`}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      </div>
    </>
  );
}
