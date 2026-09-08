/**
 * Boite de confirmation generique pour toute action sensible
 * (changement de statut en masse, revocation, export...).
 */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmer', danger = false, busy = false, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onCancel} disabled={busy}>Annuler</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Veuillez patienter…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
