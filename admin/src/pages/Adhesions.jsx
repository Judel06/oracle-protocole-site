import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import { STATUT_ADHESION_LABELS, STATUT_ADHESION_COLORS } from '../config/adhesionLabels';
import { formatDate } from '../utils/format';

const PAGE_SIZE = 20;

const DOMAINES = [
  'Protocole Officiel & Diplomatique',
  'Étiquette & Formation',
  "Gestion Cérémonielle d'Événements",
  'Conseil & Ingénierie Protocolaire',
  'Image de Marque & Identité Visuelle',
];

function initials(nom) {
  if (!nom) return '?';
  return nom.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export default function Adhesions() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [photoUrls, setPhotoUrls] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('candidatures_adhesion').select('*', { count: 'exact' });

    if (search.trim()) {
      const like = `%${search.trim()}%`;
      query = query.or(`nom_complet.ilike.${like},email.ilike.${like},ville.ilike.${like}`);
    }
    if (filters.statut) query = query.eq('statut', filters.statut);
    if (filters.domaine_interet) query = query.eq('domaine_interet', filters.domaine_interet);
    if (filters.disponibilite) query = query.eq('disponibilite', filters.disponibilite);

    const { data, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    setRows(data || []);
    setTotal(count || 0);
    setLoading(false);

    const withPhoto = (data || []).filter((r) => r.photo_storage_path);
    if (withPhoto.length) {
      const entries = await Promise.all(withPhoto.map(async (r) => {
        const { data: signed } = await supabase.storage.from('candidatures-adhesion').createSignedUrl(r.photo_storage_path, 3600);
        return [r.id, signed?.signedUrl || null];
      }));
      setPhotoUrls(Object.fromEntries(entries));
    } else {
      setPhotoUrls({});
    }
  }, [search, filters, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filters]);

  return (
    <>
      <PageHeader title="Candidatures d'adhésion" />
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
              {Object.entries(STATUT_ADHESION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>Domaine d'intérêt</label>
            <select value={filters.domaine_interet || ''} onChange={(e) => setFilters((p) => ({ ...p, domaine_interet: e.target.value }))}>
              <option value="">Tous</option>
              {DOMAINES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>Disponibilité</label>
            <select value={filters.disponibilite || ''} onChange={(e) => setFilters((p) => ({ ...p, disponibilite: e.target.value }))}>
              <option value="">Toutes</option>
              <option value="temps_plein">Temps plein</option>
              <option value="temps_partiel">Temps partiel</option>
              <option value="ponctuel">Ponctuel</option>
            </select>
          </div>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="adhesion-list">
            {rows.length === 0 && <div className="card card-pad" style={{ textAlign: 'center', color: 'var(--text-soft)' }}>Aucune candidature ne correspond à ces critères.</div>}
            {rows.map((r) => (
              <div className="adhesion-card" key={r.id} onClick={() => navigate(`/adhesions/${r.id}`)}>
                {photoUrls[r.id] ? (
                  <img className="adhesion-avatar" src={photoUrls[r.id]} alt="" />
                ) : (
                  <div className="adhesion-avatar-placeholder">{initials(r.nom_complet)}</div>
                )}
                <div className="adhesion-card-main">
                  <div className="adhesion-card-name">{r.nom_complet}</div>
                  <div className="adhesion-card-domaine">{r.domaine_interet}</div>
                </div>
                <div className="adhesion-card-meta">
                  <span className={`badge badge-${STATUT_ADHESION_COLORS[r.statut] || 'navy'}`}>{STATUT_ADHESION_LABELS[r.statut] || r.statut}</span>
                  <span className="adhesion-card-date">{formatDate(r.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>
    </>
  );
}
