import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import { formatDateTime } from '../utils/format';

const PAGE_SIZE = 30;

const ACTION_LABELS = {
  statut_change: 'Changement de statut',
  notes_update: 'Notes internes modifiées',
  export_csv: 'Export CSV',
  parametres_update: 'Paramètres du site modifiés',
  user_invite: 'Utilisateur invité',
  user_revoke: 'Accès révoqué',
};

const COLUMNS = [
  { key: 'created_at', label: 'Date', isDateTime: true },
  { key: 'admin_email', label: 'Auteur' },
  { key: 'action', label: 'Action', format: (v) => ACTION_LABELS[v] || v },
  { key: 'details', label: 'Détail', format: (v) => v ? Object.entries(v).map(([k, val]) => `${k}: ${Array.isArray(val) ? val.join(', ') : val}`).join(' · ') : '—' },
];

export default function ActivityLog() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, count } = await supabase
        .from('activity_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (!cancelled) {
        setRows(data || []);
        setTotal(count || 0);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page]);

  return (
    <>
      <PageHeader title="Journal d'activité" />
      <div className="admin-content">
        <DataTable columns={COLUMNS} rows={rows} loading={loading} emptyLabel="Aucune activité enregistrée." />
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>
    </>
  );
}
