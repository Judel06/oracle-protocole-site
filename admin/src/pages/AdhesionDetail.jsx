import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  STATUT_ADHESION_LABELS, STATUT_ADHESION_COLORS,
  DISPONIBILITE_LABELS, NIVEAU_ACCREDITATION_LABELS,
} from '../config/adhesionLabels';
import { formatDate, formatDateTime } from '../utils/format';
import { logActivity } from '../utils/logActivity';
import { useToast } from '../context/ToastContext';

function initials(nom) {
  if (!nom) return '?';
  return nom.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export default function AdhesionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [row, setRow] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [cvUrl, setCvUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showAccept, setShowAccept] = useState(false);
  const [showRefuse, setShowRefuse] = useState(false);
  const [niveau, setNiveau] = useState('niveau_2');
  const [affectation, setAffectation] = useState('');
  const [motifRefus, setMotifRefus] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingToRoster, setAddingToRoster] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('candidatures_adhesion').select('*').eq('id', id).single();
    if (!error) {
      setRow(data);
      setNiveau(data.niveau_accreditation_assigne || 'niveau_2');
      setAffectation(data.affectation_assignee || '');
      setMotifRefus(data.motif_refus || '');

      if (data.photo_storage_path) {
        const { data: signed } = await supabase.storage.from('candidatures-adhesion').createSignedUrl(data.photo_storage_path, 3600);
        setPhotoUrl(signed?.signedUrl || null);
      } else {
        setPhotoUrl(null);
      }
      if (data.cv_storage_path) {
        const { data: signed } = await supabase.storage.from('candidatures-adhesion').createSignedUrl(data.cv_storage_path, 3600);
        setCvUrl(signed?.signedUrl || null);
      } else {
        setCvUrl(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const markEnCoursExamen = async () => {
    const { error } = await supabase.from('candidatures_adhesion').update({ statut: 'en_cours_examen' }).eq('id', id);
    if (error) { showToast('Le changement de statut a échoué.', 'error'); return; }
    await logActivity('adhesion_statut_change', { record_id: id, nouveau_statut: 'en_cours_examen' });
    showToast('Candidature marquée en cours d\'examen.');
    load();
  };

  const confirmAccept = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('candidatures_adhesion').update({
      statut: 'acceptee',
      niveau_accreditation_assigne: niveau,
      affectation_assignee: affectation.trim() || null,
      motif_refus: null,
      decide_par_email: user?.email || null,
      decide_le: new Date().toISOString(),
    }).eq('id', id);
    setSaving(false);
    if (error) { showToast("L'acceptation a échoué.", 'error'); return; }
    await logActivity('adhesion_acceptee', { record_id: id, niveau, affectation: affectation.trim() || null });
    showToast('Candidature acceptée.');
    setShowAccept(false);
    load();
  };

  const confirmRefuse = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('candidatures_adhesion').update({
      statut: 'refusee',
      motif_refus: motifRefus.trim() || null,
      decide_par_email: user?.email || null,
      decide_le: new Date().toISOString(),
    }).eq('id', id);
    setSaving(false);
    if (error) { showToast('Le refus a échoué.', 'error'); return; }
    await logActivity('adhesion_refusee', { record_id: id, motif: motifRefus.trim() || null });
    showToast('Candidature refusée.');
    setShowRefuse(false);
    load();
  };

  const addToRoster = async () => {
    setAddingToRoster(true);
    const { data: inserted, error } = await supabase.from('membres_protocole').insert({
      nom_complet: row.nom_complet,
      niveau_accreditation: row.niveau_accreditation_assigne || 'niveau_2',
      affectation_defaut: row.affectation_assignee || null,
      telephone: row.telephone || null,
      email: row.email || null,
      statut: 'actif',
    }).select('id').single();

    if (error || !inserted) { setAddingToRoster(false); showToast("L'ajout à l'annuaire a échoué.", 'error'); return; }

    const { error: linkError } = await supabase.from('candidatures_adhesion').update({ membre_protocole_id: inserted.id }).eq('id', id);
    setAddingToRoster(false);
    if (linkError) { showToast("L'ajout a réussi mais la liaison a échoué.", 'error'); return; }
    await logActivity('adhesion_ajoutee_annuaire', { record_id: id, membre_id: inserted.id });
    showToast('Membre ajouté à l\'annuaire du protocole.');
    load();
  };

  if (loading) return (<><PageHeader title="Fiche candidature" /><div className="admin-content"><LoadingSpinner /></div></>);
  if (!row) return (<><PageHeader title="Fiche candidature" /><div className="admin-content">Introuvable. <Link to="/adhesions">← Retour à la liste</Link></div></>);

  const decisionTaken = row.statut === 'acceptee' || row.statut === 'refusee';

  return (
    <>
      <PageHeader title="Fiche candidature" actions={<button className="btn btn-outline no-print" onClick={() => window.print()}>Imprimer / Exporter PDF</button>} />
      <div className="admin-content">
        <Link to="/adhesions" className="no-print" style={{ fontSize: '.86rem', color: 'var(--text-soft)', display: 'inline-block', marginBottom: 16 }}>← Retour aux candidatures d'adhésion</Link>

        <div className="adhesion-fiche-header">
          {photoUrl ? (
            <img className="adhesion-fiche-photo" src={photoUrl} alt="" />
          ) : (
            <div className="adhesion-fiche-photo-placeholder">{initials(row.nom_complet)}</div>
          )}
          <div>
            <h2>{row.nom_complet}</h2>
            <div className="domaine">{row.domaine_interet}</div>
            <span className={`badge badge-${STATUT_ADHESION_COLORS[row.statut] || 'navy'}`}>{STATUT_ADHESION_LABELS[row.statut] || row.statut}</span>
            <span style={{ marginLeft: 10, fontSize: '.82rem', color: 'var(--text-soft)' }}>Reçue le {formatDate(row.created_at)}</span>
          </div>
        </div>

        <div className="detail-grid">
          <div>
            <div className="card card-pad">

              <div className="detail-group">
                <h3>Coordonnées</h3>
                <div className="detail-row"><span className="k">Email</span><span className="v">{row.email}</span></div>
                <div className="detail-row"><span className="k">Téléphone</span><span className="v">{row.telephone}</span></div>
                <div className="detail-row"><span className="k">Ville</span><span className="v">{row.ville || '—'}</span></div>
                <div className="detail-row"><span className="k">Date de naissance</span><span className="v">{formatDate(row.date_naissance)}</span></div>
              </div>

              <div className="detail-group">
                <h3>Formation et expérience</h3>
                {row.formation ? <div className="detail-longtext" style={{ marginBottom: 12 }}>{row.formation}</div> : <div className="detail-row"><span className="k">Formation</span><span className="v">—</span></div>}
                {row.experience_pertinente ? <div className="detail-longtext">{row.experience_pertinente}</div> : <div className="detail-row"><span className="k">Expérience pertinente</span><span className="v">—</span></div>}
              </div>

              <div className="detail-group">
                <h3>Langues et disponibilités</h3>
                <div className="detail-row"><span className="k">Langues</span><span className="v">{row.langues?.length ? row.langues.join(', ') : '—'}{row.langue_autre_precision ? ` (${row.langue_autre_precision})` : ''}</span></div>
                <div className="detail-row"><span className="k">Disponibilité</span><span className="v">{DISPONIBILITE_LABELS[row.disponibilite] || row.disponibilite}</span></div>
              </div>

              <div className="detail-group" style={{ marginBottom: row.cv_storage_path ? 26 : 0 }}>
                <h3>Motivation</h3>
                <div className="detail-longtext">{row.lettre_motivation || 'Aucune lettre de motivation fournie.'}</div>
              </div>

              {row.cv_storage_path && (
                <div className="detail-group" style={{ marginBottom: 0 }}>
                  <h3>Curriculum vitae</h3>
                  <div className="detail-row">
                    <span className="k">Fichier</span>
                    <span className="v">{cvUrl ? <a href={cvUrl} target="_blank" rel="noreferrer">{row.cv_nom_fichier || 'Télécharger le CV'}</a> : (row.cv_nom_fichier || '—')}</span>
                  </div>
                </div>
              )}

              {decisionTaken && (
                <div className="detail-group" style={{ marginTop: 26, marginBottom: 0 }}>
                  <h3>Décision</h3>
                  <div className="detail-row"><span className="k">Traité par</span><span className="v">{row.decide_par_email || '—'}</span></div>
                  <div className="detail-row"><span className="k">Le</span><span className="v">{formatDateTime(row.decide_le)}</span></div>
                  {row.statut === 'acceptee' && (
                    <>
                      <div className="detail-row"><span className="k">Niveau assigné</span><span className="v">{NIVEAU_ACCREDITATION_LABELS[row.niveau_accreditation_assigne] || '—'}</span></div>
                      <div className="detail-row"><span className="k">Affectation</span><span className="v">{row.affectation_assignee || '—'}</span></div>
                    </>
                  )}
                  {row.statut === 'refusee' && row.motif_refus && (
                    <div className="detail-longtext" style={{ marginTop: 10 }}>{row.motif_refus}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="no-print">
            <div className="card card-pad">
              <div className="section-title">Actions</div>

              {!decisionTaken && (
                <>
                  {row.statut === 'nouvelle' && (
                    <button className="btn btn-outline btn-block" style={{ marginBottom: 12 }} onClick={markEnCoursExamen}>
                      Marquer en cours d'examen
                    </button>
                  )}

                  {!showAccept && !showRefuse && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setShowAccept(true); setShowRefuse(false); }}>✓ Accepter</button>
                      <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowRefuse(true); setShowAccept(false); }}>✕ Refuser</button>
                    </div>
                  )}

                  {showAccept && (
                    <div style={{ marginTop: 6 }}>
                      <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 }}>Niveau d'accréditation</label>
                      <select value={niveau} onChange={(e) => setNiveau(e.target.value)} style={{ width: '100%', padding: 10, border: '1.5px solid var(--border)', borderRadius: 8, marginBottom: 12 }}>
                        {Object.entries(NIVEAU_ACCREDITATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 }}>Affectation</label>
                      <input type="text" placeholder="Ex. Accueil VIP" value={affectation} onChange={(e) => setAffectation(e.target.value)} style={{ width: '100%', padding: 10, border: '1.5px solid var(--border)', borderRadius: 8, marginBottom: 12 }} />
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} disabled={saving} onClick={confirmAccept}>{saving ? 'Enregistrement…' : 'Confirmer l\'acceptation'}</button>
                        <button className="btn btn-outline" onClick={() => setShowAccept(false)}>Annuler</button>
                      </div>
                    </div>
                  )}

                  {showRefuse && (
                    <div style={{ marginTop: 6 }}>
                      <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 }}>Motif du refus (optionnel)</label>
                      <textarea rows={4} value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)} style={{ width: '100%', padding: 10, border: '1.5px solid var(--border)', borderRadius: 8, marginBottom: 12, resize: 'vertical' }} />
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} disabled={saving} onClick={confirmRefuse}>{saving ? 'Enregistrement…' : 'Confirmer le refus'}</button>
                        <button className="btn btn-outline" onClick={() => setShowRefuse(false)}>Annuler</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {row.statut === 'acceptee' && (
                <div style={{ marginTop: decisionTaken ? 0 : 16 }}>
                  {row.membre_protocole_id ? (
                    <p className="field-hint" style={{ marginTop: 0 }}>✓ Déjà ajouté à l'annuaire des membres du protocole.</p>
                  ) : (
                    <button className="btn btn-primary btn-block" disabled={addingToRoster} onClick={addToRoster}>
                      {addingToRoster ? 'Ajout…' : "Ajouter à l'annuaire des membres"}
                    </button>
                  )}
                </div>
              )}

              {decisionTaken && (
                <button
                  className="btn btn-outline btn-block"
                  style={{ marginTop: 14 }}
                  onClick={markEnCoursExamen}
                >
                  Réexaminer (revenir en cours d'examen)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
