import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import { STATUT_CANDIDAT_LABELS, STATUT_CANDIDAT_COLORS } from '../config/candidatsLabels';
import { exportToCsv } from '../utils/csvExport';
import { logActivity } from '../utils/logActivity';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';

const PAGE_SIZE = 20;

const COLUMNS = [
  { key: 'nom_complet', label: 'Nom', format: (_, r) => [r.prenom, r.nom].filter(Boolean).join(' ') || '—' },
  { key: 'ville', label: 'Ville' },
  { key: 'langues', label: 'Langues', format: (v) => Array.isArray(v) ? v.map((l) => l.langue).filter(Boolean).join(', ') || '—' : '—' },
  { key: 'vehicule', label: 'Véhicule', format: (v) => v === true ? 'Oui' : v === false ? 'Non' : '—' },
  { key: 'statut', label: 'Statut', format: (v) => <span className={`badge badge-${STATUT_CANDIDAT_COLORS[v] || 'navy'}`}>{STATUT_CANDIDAT_LABELS[v] || v}</span> },
  { key: 'submitted_at', label: 'Soumis le', format: (v) => formatDate(v) },
];

const CSV_COLUMNS = [
  { key: 'numero_membre', label: 'N° membre' },
  { key: 'prenom', label: 'Prénom' }, { key: 'nom', label: 'Nom' },
  { key: 'email', label: 'Email' }, { key: 'telephone', label: 'Téléphone' },
  { key: 'ville', label: 'Ville' }, { key: 'pays', label: 'Pays' },
  { key: 'statut', label: 'Statut' }, { key: 'niveau_protocolaire', label: 'Niveau' },
  { key: 'disponibilite_niveau', label: 'Disponibilité' }, { key: 'vehicule', label: 'Véhicule' },
  { key: 'submitted_at', label: 'Soumis le' },
];

export default function Candidatures() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [exporting, setExporting] = useState(false);

  const buildQuery = useCallback((countOnly = false) => {
    let query = supabase.from('candidats').select('*', countOnly ? { count: 'exact', head: true } : { count: 'exact' })
      .eq('brouillon', false);

    if (search.trim()) {
      const like = `%${search.trim()}%`;
      query = query.or(`prenom.ilike.${like},nom.ilike.${like},email.ilike.${like},ville.ilike.${like}`);
    }
    if (filters.statut) query = query.eq('statut', filters.statut);
    if (filters.ville) query = query.ilike('ville', `%${filters.ville}%`);
    if (filters.vehicule) query = query.eq('vehicule', filters.vehicule === 'oui');
    if (filters.experience) query = query.eq('experience_protocole', filters.experience === 'oui');
    if (filters.disponibilite_niveau) query = query.eq('disponibilite_niveau', filters.disponibilite_niveau);

    return query;
  }, [search, filters]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count } = await buildQuery()
      .order('submitted_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    setRows(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [buildQuery, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filters]);

  const handleExport = async () => {
    setExporting(true);
    const { data, error } = await buildQuery().order('submitted_at', { ascending: false });
    setExporting(false);
    if (error) { showToast("L'export a échoué.", 'error'); return; }
    exportToCsv(CSV_COLUMNS, data || [], `candidatures-${new Date().toISOString().slice(0, 10)}`);
    await logActivity('export_csv', { table: 'candidats', count: data?.length || 0 });
    showToast(`${data?.length || 0} ligne(s) exportée(s).`);
  };

  return (
    <>
      <PageHeader
        title="Candidatures & Membres"
        actions={
          <>
            <Link to="/candidatures/recherche-mission" className="btn btn-navy">Trouver des membres pour une mission</Link>
            <button className="btn btn-outline" onClick={handleExport} disabled={exporting}>{exporting ? 'Export…' : 'Exporter en CSV'}</button>
          </>
        }
      />
      <div className="admin-content">

        <div className="filters-bar">
          <div className="filter-field search-field">
            <label>Recherche</label>
            <input type="text" placeholder="Nom, email, ville…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="filter-field">
            <label>Statut</label>
            <select value={filters.statut || ''} onChange={(e) => setFilters((p) => ({ ...p, statut: e.target.value }))}>
              <option value="">Tous</option>
              {Object.entries(STATUT_CANDIDAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>Ville</label>
            <input type="text" value={filters.ville || ''} onChange={(e) => setFilters((p) => ({ ...p, ville: e.target.value }))} />
          </div>
          <div className="filter-field">
            <label>Véhicule</label>
            <select value={filters.vehicule || ''} onChange={(e) => setFilters((p) => ({ ...p, vehicule: e.target.value }))}>
              <option value="">Indifférent</option><option value="oui">Oui</option><option value="non">Non</option>
            </select>
          </div>
          <div className="filter-field">
            <label>Expérience protocole</label>
            <select value={filters.experience || ''} onChange={(e) => setFilters((p) => ({ ...p, experience: e.target.value }))}>
              <option value="">Indifférent</option><option value="oui">Oui</option><option value="non">Non</option>
            </select>
          </div>
          <div className="filter-field">
            <label>Disponibilité</label>
            <select value={filters.disponibilite_niveau || ''} onChange={(e) => setFilters((p) => ({ ...p, disponibilite_niveau: e.target.value }))}>
              <option value="">Toutes</option>
              <option value="Temps plein">Temps plein</option>
              <option value="Temps partiel">Temps partiel</option>
              <option value="Occasionnel / sur demande">Occasionnel</option>
            </select>
          </div>
        </div>

        <DataTable columns={COLUMNS} rows={rows} loading={loading} onRowClick={(row) => navigate(`/candidatures/${row.id}`)} emptyLabel="Aucune candidature ne correspond à ces critères." />
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      </div>
    </>
  );
}
