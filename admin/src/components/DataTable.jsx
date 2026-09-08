import StatusBadge from './StatusBadge';
import LoadingSpinner from './LoadingSpinner';
import { formatDate, formatDateTime } from '../utils/format';

/**
 * Tableau generique : colonnes configurables, tri, etats de chargement/vide.
 * La pagination est geree par le parent (voir Pagination.jsx) puisqu'elle
 * s'appuie sur une requete serveur (Supabase .range()).
 */
export default function DataTable({ columns, rows, loading, sortKey, sortDir, onSort, onRowClick, emptyLabel = 'Aucun résultat.' }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.sortable ? 'sortable' : ''}
                onClick={col.sortable ? () => onSort(col.key) : undefined}
              >
                {col.label}
                {col.sortable && sortKey === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={columns.length} className="table-loading"><LoadingSpinner /></td></tr>
          )}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={columns.length} className="table-empty">{emptyLabel}</td></tr>
          )}
          {!loading && rows.map((row) => (
            <tr key={row.id} onClick={() => onRowClick?.(row)}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.badge ? (
                    <StatusBadge statut={row[col.key]} />
                  ) : col.isDate ? (
                    formatDate(row[col.key])
                  ) : col.isDateTime ? (
                    formatDateTime(row[col.key])
                  ) : col.format ? (
                    col.format(row[col.key], row)
                  ) : (
                    row[col.key] ?? '—'
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
