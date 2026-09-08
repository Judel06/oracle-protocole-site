import { useState } from 'react';
import { uploadCandidatDocument } from '../../lib/uploadDocument';

/**
 * Upload d'un document candidat. Stocke directement dans candidat_documents
 * (table separee) des la selection du fichier — pas besoin de champ dans
 * formData/candidats.
 */
export default function FileUpload({ candidatId, docType, accept = '.pdf,.jpg,.jpeg,.png' }) {
  const [state, setState] = useState('idle'); // idle | uploading | done | error
  const [fileName, setFileName] = useState('');

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !candidatId) return;
    setState('uploading');
    try {
      await uploadCandidatDocument(candidatId, file, docType);
      setFileName(file.name);
      setState('done');
    } catch (err) {
      console.error(err);
      setState('error');
    }
  };

  return (
    <div>
      <label className="file-drop">
        <input type="file" accept={accept} onChange={handleChange} />
        <div className="file-drop-label">
          {state === 'uploading' ? 'Téléversement…' : state === 'error' ? 'Échec — cliquez pour réessayer' : 'Cliquez pour sélectionner un fichier'}
        </div>
      </label>
      {state === 'done' && <div className="file-chip">✓ {fileName}</div>}
    </div>
  );
}
