import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { logActivity } from '../utils/logActivity';
import { formatDateTime } from '../utils/format';
import LoadingSpinner from './LoadingSpinner';
import SerinDecisionModal from './SerinDecisionModal';
import {
  STATUT_SERIN_LABELS, STATUT_SERIN_COLORS, TYPE_SERIN_LABELS, AXES_SERIN_LABELS, BESOINS_SERIN_LABELS,
} from '../config/serinLabels';

const BUCKET = 'candidatures-serin';
const labelsOf = (map, list) => (list || []).map((v) => map[v] || v).join(', ') || '—';

function Row({ k, v }) {
  return (
    <div className="detail-row">
      <span className="k">{k}</span>
      <span className="v">{v || '—'}</span>
    </div>
  );
}

/** Panneau lateral : fiche complete, pieces jointes, historique, notes et decision. */
export default function SerinDossierPanel({ id, onClose, onChanged }) {
  const { showToast } = useToast();
  const [row, setRow] = useState(null);
  const [history, setHistory] = useState([]);
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: dossier }, { data: hist }] = await Promise.all([
        supabase.from('candidatures_serin').select('*').eq('id', id).single(),
        supabase.from('candidatures_serin_historique').select('*').eq('candidature_id', id).order('created_at', { ascending: false }),
      ]);
      let attachment = null;
      if (dossier?.piece_jointe_path) {
        const [{ data: view }, { data: dl }] = await Promise.all([
          supabase.storage.from(BUCKET).createSignedUrl(dossier.piece_jointe_path, 3600),
          supabase.storage.from(BUCKET).createSignedUrl(dossier.piece_jointe_path, 3600, { download: dossier.piece_jointe_nom || true }),
        ]);
        attachment = { view: view?.signedUrl, download: dl?.signedUrl, nom: dossier.piece_jointe_nom };
      }
      if (cancelled) return;
      setRow(dossier);
      setNotes(dossier?.notes_internes || '');
      setHistory(hist || []);
      setFile(attachment);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, reloadKey]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !decision) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, decision]);

  const changeStatut = async (statut, motif) => {
    const { error } = await supabase.rpc('serin_changer_statut', { p_ids: [id], p_statut: statut, p_motif: motif });
    if (error) { showToast(error.message || 'Le changement de statut a échoué.', 'error'); return; }
    showToast(`Dossier ${STATUT_SERIN_LABELS[statut].toLowerCase()}.`);
    setDecision(null);
    setReloadKey((k) => k + 1);
    onChanged();
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    const { error } = await supabase.from('candidatures_serin').update({ notes_internes: notes.trim() || null }).eq('id', id);
    setSavingNotes(false);
    if (error) { showToast("L'enregistrement des notes a échoué.", 'error'); return; }
    await logActivity('notes_update', { dossier: row.numero_dossier });
    showToast('Notes enregistrées.');
  };

  // Le titre de la page devient le nom du fichier propose par "Enregistrer au format PDF".
  const exportPdf = () => {
    const previous = document.title;
    document.title = row.numero_dossier;
    window.print();
    document.title = previous;
  };

  const isImage = file?.nom && /\.(jpe?g|png)$/i.test(file.nom);
  const isPdf = file?.nom && /\.pdf$/i.test(file.nom);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Fiche de dossier">
        <div className="drawer-head">
          <div>
            <div className="drawer-kicker">{row?.numero_dossier || 'Dossier'}</div>
            <h2>{row?.nom_organisation || '…'}</h2>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {loading || !row ? <LoadingSpinner /> : (
          <div className="drawer-body">
            <div className="drawer-status">
              <span className={`badge badge-${STATUT_SERIN_COLORS[row.statut]}`}>{STATUT_SERIN_LABELS[row.statut]}</span>
              <span className="field-hint" style={{ margin: 0 }}>Soumis le {formatDateTime(row.created_at)}</span>
            </div>

            <div className="detail-group">
              <h3>Candidat</h3>
              <Row k="Organisation" v={row.nom_organisation} />
              <Row k="Secteur" v={row.secteur_activite} />
              <Row k="Type" v={TYPE_SERIN_LABELS[row.type_candidature] || row.type_candidature} />
              <Row k="Axes thématiques" v={labelsOf(AXES_SERIN_LABELS, row.axes_thematiques)} />
              <Row k="Représentant" v={row.nom_representant} />
              <Row k="Fonction" v={row.fonction} />
              <Row k="E-mail" v={row.email} />
              <Row k="Téléphone" v={row.telephone} />
              <Row k="Localisation" v={`${row.ville}, ${row.pays}`} />
              <Row k="Délégation" v={row.nombre_personnes_delegation ? `${row.nombre_personnes_delegation} personne(s)` : null} />
              <Row k="Besoins" v={labelsOf(BESOINS_SERIN_LABELS, row.besoins_specifiques)} />
              {row.besoin_autre_precision && <Row k="Précision" v={row.besoin_autre_precision} />}
            </div>

            <div className="detail-group">
              <h3>Présentation et motivation</h3>
              <div className="detail-longtext">{row.presentation_motivation}</div>
            </div>

            <div className="detail-group">
              <h3>Pièce jointe</h3>
              {!file ? <p className="field-hint">Aucune pièce jointe.</p> : (
                <>
                  {isImage && file.view && <img className="drawer-preview" src={file.view} alt={file.nom} />}
                  {isPdf && file.view && <iframe className="drawer-preview drawer-preview-pdf" src={file.view} title={file.nom} />}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <span className="field-hint" style={{ margin: 0, flex: 1 }}>{file.nom}</span>
                    {file.download && <a className="btn btn-outline btn-sm" href={file.download}>Télécharger</a>}
                  </div>
                </>
              )}
            </div>

            <div className="detail-group">
              <h3>Historique du dossier</h3>
              {history.length === 0 ? <p className="field-hint">Aucun changement de statut pour l'instant.</p> : (
                <ol className="timeline">
                  {history.map((h) => (
                    <li key={h.id}>
                      <div>
                        <span className={`badge badge-${STATUT_SERIN_COLORS[h.nouveau_statut]}`}>{STATUT_SERIN_LABELS[h.nouveau_statut]}</span>
                      </div>
                      <div className="timeline-meta">{h.auteur_email} · {formatDateTime(h.created_at)}</div>
                      {h.motif && <div className="timeline-motif">« {h.motif} »</div>}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="detail-group">
              <h3>Notes internes</h3>
              <div className="field">
                <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Visibles uniquement par les administrateurs." />
              </div>
              <button className="btn btn-outline btn-sm" onClick={saveNotes} disabled={savingNotes || notes === (row.notes_internes || '')}>
                {savingNotes ? '…' : 'Enregistrer les notes'}
              </button>
            </div>
          </div>
        )}

        {row && (
          <div className="drawer-foot">
            <button className="btn btn-outline" onClick={exportPdf}>Télécharger en PDF</button>
            <button className="btn btn-outline" disabled={row.statut === 'en_attente'} onClick={() => changeStatut('en_attente', null)}>Mettre en attente</button>
            <button className="btn btn-danger" disabled={row.statut === 'rejete'} onClick={() => setDecision('rejete')}>Rejeter</button>
            <button className="btn btn-primary" disabled={row.statut === 'approuve'} onClick={() => setDecision('approuve')}>Approuver</button>
          </div>
        )}
      </aside>

      {decision && (
        <SerinDecisionModal statut={decision} count={1} onCancel={() => setDecision(null)} onConfirm={(motif) => changeStatut(decision, motif)} />
      )}
    </>
  );
}
