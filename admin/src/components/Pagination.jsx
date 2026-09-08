export default function Pagination({ page, pageSize, total, onPageChange }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="pagination">
      <span>{total === 0 ? 'Aucun résultat' : `${from}–${to} sur ${total}`}</span>
      <div className="pagination-btns">
        <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>← Précédent</button>
        <span style={{ padding: '7px 10px' }}>Page {page} / {pageCount}</span>
        <button className="btn btn-outline btn-sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>Suivant →</button>
      </div>
    </div>
  );
}
