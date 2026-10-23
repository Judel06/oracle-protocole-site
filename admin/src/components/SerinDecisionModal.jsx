import { useState } from 'react';

const COPY = {
  approuve: { title: 'Approuver', confirm: 'Approuver', hint: 'Motif (facultatif)' },
  rejete: { title: 'Rejeter', confirm: 'Rejeter', hint: 'Motif du rejet (obligatoire)' },
};

/** Fenetre de confirmation d'un changement de statut ; le rejet exige un motif. */
export default function SerinDecisionModal({ statut, count, onConfirm, onCancel }) {
  const [motif, setMotif] = useState('');
  const [busy, setBusy] = useState(false);
  const copy = COPY[statut];
  const needsMotif = statut === 'rejete';
  const invalid = needsMotif && !motif.trim();

  const submit = async () => {
    setBusy(true);
    await onConfirm(motif.trim() || null);
    setBusy(false);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{copy.title} {count > 1 ? `${count} dossiers` : 'ce dossier'}</h3>
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="serin-motif">{copy.hint}</label>
          <textarea id="serin-motif" rows={4} value={motif} onChange={(e) => setMotif(e.target.value)} autoFocus />
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onCancel} disabled={busy}>Annuler</button>
          <button
            className={`btn ${needsMotif ? 'btn-danger' : 'btn-primary'}`}
            onClick={submit}
            disabled={busy || invalid}
          >
            {busy ? '…' : copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
