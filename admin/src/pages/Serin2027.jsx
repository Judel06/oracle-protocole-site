import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../utils/logActivity';
import { exportToCsv } from '../utils/csvExport';
import { formatDate, formatDateTime } from '../utils/format';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import SerinDossierPanel from '../components/SerinDossierPanel';
import SerinDecisionModal from '../components/SerinDecisionModal';
import {
  STATUT_SERIN_LABELS, STATUT_SERIN_COLORS, TYPE_SERIN_LABELS, AXES_SERIN_LABELS, BESOINS_SERIN_LABELS,
} from '../config/serinLabels';

const PAGE_SIZE = 25;
const EXPORT_MAX = 5000;

const SORTS = {
  recent: { column: 'created_at', ascending: false },
  ancien: { column: 'created_at', ascending: true },
  nom: { column: 'nom_organisation', ascending: true },
};

const STAT_CARDS = [
  { key: '', label: 'Tous les dossiers', tone: 'navy' },
  { key: 'en_attente', label: STATUT_SERIN_LABELS.en_attente, tone: STATUT_SERIN_COLORS.en_attente },
  { key: 'approuve', label: 'Approuvés', tone: STATUT_SERIN_COLORS.approuve },
  { key: 'rejete', label: 'Rejetés', tone: STATUT_SERIN_COLORS.rejete },
];

const joinLabels = (map) => (v) => (v || []).map((x) => map[x] || x).join('; ');

const CSV_COLUMNS = [
  { key: 'numero_dossier', label: 'N° de dossier' },
  { key: 'created_at', label: 'Soumis le', format: (v) => formatDateTime(v) },
  { key: 'statut', label: 'Statut', format: (v) => STATUT_SERIN_LABELS[v] || v },
  { key: 'nom_organisation', label: 'Organisation' },
  { key: 'secteur_activite', label: 'Secteur' },
  { key: 'type_candidature', label: 'Type', format: (v) => TYPE_SERIN_LABELS[v] || v },
  { key: 'axes_thematiques', label: 'Axes thématiques', format: joinLabels(AXES_SERIN_LABELS) },
  { key: 'nom_representant', label: 'Représentant' },
  { key: 'fonction', label: 'Fonction' },
  { key: 'email', label: 'E-mail' },
  { key: 'telephone', label: 'Téléphone' },
  { key: 'pays', label: 'Pays' },
  { key: 'ville', label: 'Ville' },
  { key: 'nombre_personnes_delegation', label: 'Délégation' },
  { key: 'besoins_specifiques', label: 'Besoins', format: joinLabels(BESOINS_SERIN_LABELS) },
  { key: 'motif_decision', label: 'Motif de la dernière décision' },
];

export default function Serin2027() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ '': 0, en_attente: 0, approuve: 0, rejete: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState(() => new Set());
  const [openId, setOpenId] = useState(null);
  const [batch, setBatch] = useState(null);
  const [version, setVersion] = useState(0);

  const applyFilters = useCallback((query) => {
    // Les virgules et parentheses casseraient la syntaxe .or() de PostgREST.
    const term = search.replace(/[,()%]/g, ' ').trim();
    if (term) {
      const like = `%${term}%`;
      query = query.or(`nom_organisation.ilike.${like},nom_representant.ilike.${like},email.ilike.${like},numero_dossier.ilike.${like}`);
    }
    if (statut) query = query.eq('statut', statut);
    if (dateFrom) query = query.gte('created_at', new Date(`${dateFrom}T00:00:00`).toISOString());
    if (dateTo) {
      const end = new Date(`${dateTo}T00:00:00`);
      end.setDate(end.getDate() + 1);
      query = query.lt('created_at', end.toISOString());
    }
    const { column, ascending } = SORTS[sort];
    return query.order(column, { ascending });
  }, [search, statut, dateFrom, dateTo, sort]);

  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, statut, dateFrom, dateTo, sort]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, count } = await applyFilters(supabase.from('candidatures_serin').select('*', { count: 'exact' }))
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (cancelled) return;
      setRows(data || []);
      setTotal(count || 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [applyFilters, page, version]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const head = (s) => {
        const q = supabase.from('candidatures_serin').select('id', { count: 'exact', head: true });
        return s ? q.eq('statut', s) : q;
      };
      const [all, a, b, c] = await Promise.all([head(''), head('en_attente'), head('approuve'), head('rejete')]);
      if (!cancelled) setCounts({ '': all.count || 0, en_attente: a.count || 0, approuve: b.count || 0, rejete: c.count || 0 });
    })();
    return () => { cancelled = true; };
  }, [version]);

  const refresh = () => { setSelected(new Set()); setVersion((v) => v + 1); };

  const toggleOne = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)));

  const applyBatch = async (motif) => {
    const { data, error } = await supabase.rpc('serin_changer_statut', {
      p_ids: [...selected], p_statut: batch, p_motif: motif,
    });
    if (error) { showToast(error.message || 'Le changement de statut a échoué.', 'error'); return; }
    showToast(`${data} dossier${data > 1 ? 's' : ''} ${STATUT_SERIN_LABELS[batch].toLowerCase()}${data > 1 ? 's' : ''}.`);
    setBatch(null);
    refresh();
  };

  const exportCsv = async () => {
    const { data, error } = await applyFilters(supabase.from('candidatures_serin').select('*')).range(0, EXPORT_MAX - 1);
    if (error) { showToast("L'export a échoué.", 'error'); return; }
    exportToCsv(CSV_COLUMNS, data, `serin-2027-${new Date().toISOString().slice(0, 10)}`);
    await logActivity('export_csv', { section: 'SERIN 2027', lignes: data.length });
  };

  return (
    <>
      <PageHeader
        title="Candidatures SERIN 2027"
        actions={<span className="badge badge-navy">{counts['']} dossier{counts[''] > 1 ? 's' : ''}</span>}
      />
      <div className="admin-content">
        <div className="kpi-grid">
          {STAT_CARDS.map((c) => (
            <button
              key={c.key}
              className={`kpi-card stat-card${statut === c.key ? ' active' : ''}`}
              onClick={() => setStatut(c.key)}
              aria-pressed={statut === c.key}
            >
              <div className="kpi-label">{c.label}</div>
              <div className="kpi-value">{counts[c.key]}</div>
              {c.key && <span className={`badge badge-${c.tone}`}>{STATUT_SERIN_LABELS[c.key]}</span>}
            </button>
          ))}
        </div>

        <div className="filters-bar">
          <div className="filter-field search-field">
            <label htmlFor="serin-search">Recherche</label>
            <input id="serin-search" type="search" placeholder="Nom, e-mail ou n° de dossier…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="filter-field">
            <label htmlFor="serin-from">Soumis du</label>
            <input id="serin-from" type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="filter-field">
            <label htmlFor="serin-to">au</label>
            <input id="serin-to" type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="filter-field">
            <label htmlFor="serin-sort">Tri</label>
            <select id="serin-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">Plus récent</option>
              <option value="ancien">Plus ancien</option>
              <option value="nom">Nom A-Z</option>
            </select>
          </div>
          {can('candidatures', 'exporter') && <button className="btn btn-outline" onClick={exportCsv} disabled={total === 0}>Exporter en CSV</button>}
        </div>

        {selected.size > 0 && (
          <div className="batch-bar" role="region" aria-label="Actions groupées">
            <strong>{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setSelected(new Set())}>Annuler</button>
              {can('candidatures', 'valider') && <><button className="btn btn-danger btn-sm" onClick={() => setBatch('rejete')}>Rejeter</button>
              <button className="btn btn-primary btn-sm" onClick={() => setBatch('approuve')}>Approuver</button></>}
            </div>
          </div>
        )}

        {loading ? <LoadingSpinner /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Tout sélectionner" disabled={rows.length === 0} />
                  </th>
                  <th>N° de dossier</th>
                  <th>Candidat</th>
                  <th>Contact</th>
                  <th>Soumis le</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="table-empty">
                    {counts[''] === 0 ? 'Aucune candidature SERIN 2027 pour l\'instant.' : 'Aucun dossier ne correspond à ces critères.'}
                  </td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => setOpenId(r.id)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} aria-label={`Sélectionner ${r.numero_dossier}`} />
                    </td>
                    <td><strong>{r.numero_dossier}</strong></td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{r.nom_organisation}</div>
                      <div className="field-hint" style={{ margin: 0 }}>{r.nom_representant} · {TYPE_SERIN_LABELS[r.type_candidature] || r.type_candidature}</div>
                    </td>
                    <td>
                      <div>{r.email}</div>
                      <div className="field-hint" style={{ margin: 0 }}>{r.telephone}</div>
                    </td>
                    <td>{formatDate(r.created_at)}</td>
                    <td><span className={`badge badge-${STATUT_SERIN_COLORS[r.statut]}`}>{STATUT_SERIN_LABELS[r.statut]}</span></td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); setOpenId(r.id); }}>Ouvrir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      {openId && <SerinDossierPanel id={openId} onClose={() => setOpenId(null)} onChanged={refresh} />}
      {batch && (
        <SerinDecisionModal statut={batch} count={selected.size} onCancel={() => setBatch(null)} onConfirm={applyBatch} />
      )}
    </>
  );
}
