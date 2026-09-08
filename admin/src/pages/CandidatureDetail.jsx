import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { STATUT_CANDIDAT_LABELS } from '../config/candidatsLabels';
import { formatDate, formatDateTime } from '../utils/format';
import { logActivity } from '../utils/logActivity';
import { useToast } from '../context/ToastContext';

const DOC_TYPE_LABELS = {
  cv: 'CV', photo_portrait: 'Photo portrait', photo_pied: 'Photo pied',
  certificat: 'Certificat', diplome: 'Diplôme', portfolio: 'Portfolio',
};

const yn = (v) => v === true ? 'Oui' : v === false ? 'Non' : '—';
const listOrDash = (arr, fmt = (x) => x) => Array.isArray(arr) && arr.length ? arr.map(fmt).join(', ') : '—';

export default function CandidatureDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [row, setRow] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [docUrls, setDocUrls] = useState({});
  const [references, setReferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [niveauProtocolaire, setNiveauProtocolaire] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNiveau, setSavingNiveau] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [{ data: candidat, error }, { data: docs }, { data: refs }] = await Promise.all([
        supabase.from('candidats').select('*').eq('id', id).single(),
        supabase.from('candidat_documents').select('*').eq('candidat_id', id).order('uploaded_at', { ascending: false }),
        supabase.from('candidat_references').select('*').eq('candidat_id', id),
      ]);
      if (cancelled) return;
      if (!error) {
        setRow(candidat);
        setNotes(candidat.notes_internes || '');
        setNiveauProtocolaire(candidat.niveau_protocolaire || '');
      }
      setDocuments(docs || []);
      setReferences(refs || []);
      setLoading(false);

      if (docs?.length) {
        const entries = await Promise.all(docs.map(async (d) => {
          const { data } = await supabase.storage.from('candidats-documents').createSignedUrl(d.storage_path, 3600);
          return [d.id, data?.signedUrl || null];
        }));
        if (!cancelled) setDocUrls(Object.fromEntries(entries));
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleStatusChange = async (newStatut) => {
    const previous = row.statut;
    setSavingStatus(true);
    setRow((r) => ({ ...r, statut: newStatut }));
    const { error } = await supabase.from('candidats').update({ statut: newStatut }).eq('id', id);
    setSavingStatus(false);
    if (error) {
      setRow((r) => ({ ...r, statut: previous }));
      showToast('Le changement de statut a échoué.', 'error');
      return;
    }
    await logActivity('statut_change', { table: 'candidats', record_id: id, ancien_statut: previous, nouveau_statut: newStatut });
    showToast('Statut mis à jour.');
  };

  const handleSaveNiveau = async () => {
    setSavingNiveau(true);
    const { error } = await supabase.from('candidats').update({ niveau_protocolaire: niveauProtocolaire || null }).eq('id', id);
    setSavingNiveau(false);
    if (error) { showToast("L'enregistrement du niveau a échoué.", 'error'); return; }
    await logActivity('niveau_protocolaire_update', { table: 'candidats', record_id: id });
    showToast('Niveau protocolaire enregistré.');
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const { error } = await supabase.from('candidats').update({ notes_internes: notes }).eq('id', id);
    setSavingNotes(false);
    if (error) { showToast("L'enregistrement des notes a échoué.", 'error'); return; }
    await logActivity('notes_update', { table: 'candidats', record_id: id });
    showToast('Notes internes enregistrées.');
  };

  if (loading) return (<><PageHeader title="Fiche candidat" /><div className="admin-content"><LoadingSpinner /></div></>);
  if (!row) return (<><PageHeader title="Fiche candidat" /><div className="admin-content">Introuvable. <Link to="/candidatures">← Retour à la liste</Link></div></>);

  const displayName = [row.civilite, row.prenom, row.nom].filter(Boolean).join(' ') || row.email;

  return (
    <>
      <PageHeader title="Fiche candidat" />
      <div className="admin-content">
        <Link to="/candidatures" style={{ fontSize: '.86rem', color: 'var(--text-soft)', display: 'inline-block', marginBottom: 16 }}>← Retour aux candidatures</Link>

        <div className="detail-header">
          <div>
            <h2 style={{ color: 'var(--navy)', marginBottom: 6 }}>{displayName}</h2>
            <span style={{ fontSize: '.84rem', color: 'var(--text-soft)' }}>
              {row.numero_membre ? `${row.numero_membre} · ` : ''}Soumis le {formatDateTime(row.submitted_at)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {savingStatus && <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
            <select className="status-select" value={row.statut || ''} onChange={(e) => handleStatusChange(e.target.value)} disabled={savingStatus}>
              {Object.entries(STATUT_CANDIDAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="detail-grid">
          <div>

            <div className="card card-pad">
              <div className="detail-group">
                <h3>Identité & contact</h3>
                <div className="detail-row"><span className="k">Date de naissance</span><span className="v">{formatDate(row.date_naissance)}</span></div>
                <div className="detail-row"><span className="k">Genre</span><span className="v">{row.genre || '—'}</span></div>
                <div className="detail-row"><span className="k">Nationalité</span><span className="v">{row.nationalite || '—'}</span></div>
                <div className="detail-row"><span className="k">Téléphone</span><span className="v">{row.telephone || '—'}</span></div>
                <div className="detail-row"><span className="k">WhatsApp</span><span className="v">{row.whatsapp || '—'}</span></div>
                <div className="detail-row"><span className="k">Courriel</span><span className="v">{row.email || '—'}</span></div>
                <div className="detail-row"><span className="k">Adresse</span><span className="v">{[row.adresse, row.ville, row.code_postal, row.pays].filter(Boolean).join(', ') || '—'}</span></div>
                <div className="detail-row"><span className="k">Contact d'urgence</span><span className="v">{[row.contact_urgence_nom, row.contact_urgence_lien].filter(Boolean).join(' — ') || '—'}{row.contact_urgence_telephone ? ` · ${row.contact_urgence_telephone}` : ''}</span></div>
              </div>

              <div className="detail-group">
                <h3>Profil professionnel</h3>
                <div className="detail-row"><span className="k">Poste actuel</span><span className="v">{row.poste_actuel || '—'}</span></div>
                <div className="detail-row"><span className="k">Employeur</span><span className="v">{row.employeur_actuel || '—'}</span></div>
                <div className="detail-row"><span className="k">Domaine d'activité</span><span className="v">{row.domaine_activite || '—'}</span></div>
                <div className="detail-row"><span className="k">Niveau de formation</span><span className="v">{row.niveau_formation || '—'}</span></div>
                <div className="detail-row"><span className="k">Diplômes</span><span className="v">{listOrDash(row.diplomes, (d) => d.intitule || d.nom || JSON.stringify(d))}</span></div>
                <div className="detail-row"><span className="k">Certifications</span><span className="v">{listOrDash(row.certifications, (c) => c.intitule || c.nom || JSON.stringify(c))}</span></div>
                <div className="detail-row"><span className="k">Années d'expérience</span><span className="v">{row.annees_experience ?? '—'}</span></div>
                <div className="detail-row"><span className="k">Portfolio</span><span className="v">{row.portfolio_url || '—'}</span></div>
                <div className="detail-row"><span className="k">LinkedIn</span><span className="v">{row.linkedin_url || '—'}</span></div>
              </div>

              <div className="detail-group">
                <h3>Expérience protocole / événementiel</h3>
                <div className="detail-row"><span className="k">Expérience protocole</span><span className="v">{yn(row.experience_protocole)}</span></div>
                <div className="detail-row"><span className="k">Types d'événements</span><span className="v">{listOrDash(row.types_evenements)}</span></div>
                <div className="detail-row"><span className="k">Volume d'événements</span><span className="v">{row.volume_evenements || '—'}</span></div>
                <div className="detail-row"><span className="k">Publics servis</span><span className="v">{listOrDash(row.publics_serves)}</span></div>
                <div className="detail-row"><span className="k">Rôles tenus</span><span className="v">{listOrDash(row.roles_tenus)}</span></div>
                {row.responsabilites && <div className="detail-longtext" style={{ marginTop: 8 }}>{row.responsabilites}</div>}
              </div>

              <div className="detail-group">
                <h3>Compétences ORACLE</h3>
                {row.competences && Object.keys(row.competences).length ? (
                  Object.entries(row.competences).map(([k, v]) => (
                    <div className="detail-row" key={k}><span className="k">{k}</span><span className="v">{v}/5</span></div>
                  ))
                ) : <div className="detail-row"><span className="v">—</span></div>}
                <div className="detail-row"><span className="k">Capacité rapport post-événement</span><span className="v">{row.capacite_rapport_post_evenement ?? '—'}/5</span></div>
              </div>

              <div className="detail-group">
                <h3>Langues</h3>
                <div className="detail-row"><span className="k">Langues parlées</span><span className="v">{listOrDash(row.langues, (l) => `${l.langue} (${l.niveau})`)}</span></div>
                <div className="detail-row"><span className="k">Accueil en langue étrangère</span><span className="v">{yn(row.accueil_langue_etrangere)}</span></div>
              </div>

              <div className="detail-group">
                <h3>Disponibilité</h3>
                <div className="detail-row"><span className="k">Niveau</span><span className="v">{row.disponibilite_niveau || '—'}</span></div>
                <div className="detail-row"><span className="k">Weekends</span><span className="v">{yn(row.weekends)}</span></div>
                <div className="detail-row"><span className="k">Jours fériés</span><span className="v">{yn(row.jours_feries)}</span></div>
                <div className="detail-row"><span className="k">Dernière minute</span><span className="v">{yn(row.derniere_minute)}</span></div>
                <div className="detail-row"><span className="k">Voyages</span><span className="v">{yn(row.voyages)}</span></div>
                <div className="detail-row"><span className="k">Missions internationales</span><span className="v">{yn(row.missions_internationales)}</span></div>
                <div className="detail-row"><span className="k">Heures/semaine</span><span className="v">{row.heures_semaine ?? '—'}</span></div>
                {row.disponibilite_matrice && Object.keys(row.disponibilite_matrice).length > 0 && (
                  <div className="detail-row"><span className="k">Créneaux</span><span className="v">{Object.entries(row.disponibilite_matrice).filter(([, v]) => v).map(([k]) => k).join(', ') || '—'}</span></div>
                )}
              </div>

              <div className="detail-group">
                <h3>Mobilité</h3>
                <div className="detail-row"><span className="k">Véhicule</span><span className="v">{yn(row.vehicule)}{row.vehicule_details ? ` — ${row.vehicule_details}` : ''}</span></div>
                <div className="detail-row"><span className="k">Permis de conduire</span><span className="v">{yn(row.permis_conduire)}</span></div>
                <div className="detail-row"><span className="k">Autonomie de déplacement</span><span className="v">{row.autonomie_deplacement || '—'}</span></div>
                <div className="detail-row"><span className="k">Zone géographique max</span><span className="v">{row.zone_geo_max || '—'}</span></div>
                <div className="detail-row"><span className="k">Transport de matériel</span><span className="v">{yn(row.transport_materiel)}</span></div>
              </div>

              {!row.prefere_ne_pas_repondre_sante && (row.allergies || row.restrictions_alimentaires || row.amenagements_necessaires) && (
                <div className="detail-group">
                  <h3>Santé & besoins particuliers</h3>
                  <div className="detail-row"><span className="k">Allergies</span><span className="v">{row.allergies || '—'}</span></div>
                  <div className="detail-row"><span className="k">Restrictions alimentaires</span><span className="v">{row.restrictions_alimentaires || '—'}</span></div>
                  <div className="detail-row"><span className="k">Aménagements nécessaires</span><span className="v">{row.amenagements_necessaires || '—'}</span></div>
                </div>
              )}

              <div className="detail-group">
                <h3>Tenue</h3>
                {row.tailles && Object.keys(row.tailles).length ? (
                  Object.entries(row.tailles).map(([k, v]) => (
                    <div className="detail-row" key={k}><span className="k">{k}</span><span className="v">{v || '—'}</span></div>
                  ))
                ) : <div className="detail-row"><span className="v">—</span></div>}
                <div className="detail-row"><span className="k">Préférence de coupe</span><span className="v">{row.preference_coupe || '—'}</span></div>
              </div>

              <div className="detail-group">
                <h3>Présentation professionnelle</h3>
                <div className="detail-row"><span className="k">Aisance tenue formelle</span><span className="v">{row.aisance_tenue_formelle ?? '—'}/5</span></div>
                <div className="detail-row"><span className="k">Endurance</span><span className="v">{row.endurance ?? '—'}/5</span></div>
              </div>

              <div className="detail-group">
                <h3>Image, consentement médias & réseaux</h3>
                <div className="detail-row"><span className="k">Niveau d'autorisation image</span><span className="v">{row.niveau_autorisation_image || '—'}</span></div>
                <div className="detail-row"><span className="k">Consentement photos/vidéos</span><span className="v">{yn(row.consent_photos_videos)}</span></div>
                <div className="detail-row"><span className="k">Consentement communications marketing</span><span className="v">{yn(row.consent_communications_marketing)}</span></div>
                <div className="detail-row"><span className="k">Aisance RP / caméra</span><span className="v">{row.aisance_rp_camera ?? '—'}/5</span></div>
                {row.liens_reseaux_sociaux && Object.keys(row.liens_reseaux_sociaux).length > 0 && (
                  <div className="detail-row"><span className="k">Réseaux sociaux</span><span className="v">{Object.entries(row.liens_reseaux_sociaux).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ') || '—'}</span></div>
                )}
              </div>

              <div className="detail-group">
                <h3>Rédaction & rapports</h3>
                <div className="detail-row"><span className="k">Auto-évaluation rédaction</span><span className="v">{row.autoeval_redaction ?? '—'}/5</span></div>
                {row.mini_test_reponse && <div className="detail-longtext">{row.mini_test_reponse}</div>}
              </div>

              <div className="detail-group">
                <h3>Outils numériques</h3>
                {row.outils_numeriques && Object.keys(row.outils_numeriques).length ? (
                  Object.entries(row.outils_numeriques).map(([k, v]) => (
                    <div className="detail-row" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
                  ))
                ) : <div className="detail-row"><span className="v">—</span></div>}
              </div>

              <div className="detail-group">
                <h3>Préférences de mission</h3>
                <div className="detail-row"><span className="k">Types de missions souhaitées</span><span className="v">{listOrDash(row.types_missions_souhaitees)}</span></div>
                <div className="detail-row"><span className="k">Rôles préférés</span><span className="v">{listOrDash(row.roles_preferes)}</span></div>
              </div>

              <div className="detail-group">
                <h3>Comportement professionnel</h3>
                {row.comportement && Object.keys(row.comportement).length ? (
                  Object.entries(row.comportement).map(([k, v]) => (
                    <div className="detail-row" key={k}><span className="k">{k}</span><span className="v">{String(v)}</span></div>
                  ))
                ) : <div className="detail-row"><span className="v">—</span></div>}
                <div className="detail-row"><span className="k">Qualité clé protocole</span><span className="v">{row.qualite_cle_protocole || '—'}</span></div>
              </div>

              <div className="detail-group">
                <h3>Éthique & confidentialité</h3>
                <div className="detail-row"><span className="k">Compréhension des règles confirmée</span><span className="v">{yn(row.confirme_comprehension_regles)}</span></div>
                <div className="detail-row"><span className="k">Déclaration d'engagement</span><span className="v">{yn(row.declaration_engagement)}</span></div>
              </div>

              <div className="detail-group">
                <h3>Motivation</h3>
                {row.motivation_pourquoi_oracle && <><span className="k" style={{ display: 'block', marginBottom: 6 }}>Pourquoi ORACLE</span><div className="detail-longtext" style={{ marginBottom: 14 }}>{row.motivation_pourquoi_oracle}</div></>}
                {row.motivation_differenciation && <><span className="k" style={{ display: 'block', marginBottom: 6 }}>Ce qui le/la différencie</span><div className="detail-longtext" style={{ marginBottom: 14 }}>{row.motivation_differenciation}</div></>}
                {row.motivation_contribution && <><span className="k" style={{ display: 'block', marginBottom: 6 }}>Contribution envisagée</span><div className="detail-longtext" style={{ marginBottom: 14 }}>{row.motivation_contribution}</div></>}
                {row.motivation_projection_3ans && <><span className="k" style={{ display: 'block', marginBottom: 6 }}>Projection à 3 ans</span><div className="detail-longtext">{row.motivation_projection_3ans}</div></>}
              </div>

              <div className="detail-group">
                <h3>Formation</h3>
                {row.formation_disponibilite && Object.keys(row.formation_disponibilite).length ? (
                  Object.entries(row.formation_disponibilite).map(([k, v]) => (
                    <div className="detail-row" key={k}><span className="k">{k}</span><span className="v">{String(v)}</span></div>
                  ))
                ) : null}
                <div className="detail-row"><span className="k">Domaines d'intérêt</span><span className="v">{listOrDash(row.formation_domaines_interet)}</span></div>
              </div>

              <div className="detail-group">
                <h3>Références</h3>
                {references.length === 0 && <div className="detail-row"><span className="v">Aucune référence fournie.</span></div>}
                {references.map((r) => (
                  <div className="detail-row" key={r.id}>
                    <span className="k">{r.nom} — {r.fonction}</span>
                    <span className="v">{r.organisation ? `${r.organisation} · ` : ''}{r.telephone || r.email || ''}{r.autorisation_verification ? ' (vérification autorisée)' : ''}</span>
                  </div>
                ))}
              </div>

              <div className="detail-group">
                <h3>Consentement final</h3>
                <div className="detail-row"><span className="k">Politique de confidentialité</span><span className="v">{yn(row.accepte_politique_confidentialite)}</span></div>
                <div className="detail-row"><span className="k">Traitement des données</span><span className="v">{yn(row.accepte_traitement_donnees)}</span></div>
                <div className="detail-row"><span className="k">Conditions de mission</span><span className="v">{yn(row.accepte_conditions_mission)}</span></div>
                <div className="detail-row"><span className="k">Exactitude des informations confirmée</span><span className="v">{yn(row.confirme_exactitude_infos)}</span></div>
                <div className="detail-row"><span className="k">Signature</span><span className="v">{row.signature_nom_complet || '—'}{row.signature_date ? ` · ${formatDateTime(row.signature_date)}` : ''}</span></div>
                {row.signature_image_data && (
                  <div style={{ marginTop: 10, background: 'var(--bg)', borderRadius: 'var(--radius)', padding: 12 }}>
                    <img src={row.signature_image_data} alt="Signature" style={{ maxHeight: 80 }} />
                  </div>
                )}
              </div>

              <div className="detail-group" style={{ marginBottom: 0 }}>
                <h3>Documents</h3>
                {documents.length === 0 && <div className="detail-row"><span className="v">Aucun document déposé.</span></div>}
                {documents.map((d) => (
                  <div className="detail-row" key={d.id}>
                    <span className="k">{DOC_TYPE_LABELS[d.type] || d.type}</span>
                    <span className="v">
                      {docUrls[d.id] ? (
                        <a href={docUrls[d.id]} target="_blank" rel="noreferrer">{d.nom_fichier || 'Télécharger'}</a>
                      ) : (d.nom_fichier || '—')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="card card-pad" style={{ marginBottom: 20 }}>
              <div className="section-title">Évaluation interne</div>
              <div className="detail-row"><span className="k">Évaluation moyenne</span><span className="v">{row.evaluation_moyenne ?? '—'}</span></div>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '.03em', margin: '14px 0 6px' }}>Niveau protocolaire</label>
              <input
                type="text"
                value={niveauProtocolaire}
                onChange={(e) => setNiveauProtocolaire(e.target.value)}
                placeholder="ex. Junior, Confirmé, Senior…"
                style={{ width: '100%', padding: 10, border: '1.5px solid var(--border)', borderRadius: 8, marginBottom: 10 }}
              />
              <button className="btn btn-outline btn-sm" onClick={handleSaveNiveau} disabled={savingNiveau}>
                {savingNiveau ? 'Enregistrement…' : 'Enregistrer le niveau'}
              </button>
            </div>

            <div className="card card-pad">
              <div className="section-title">Notes internes</div>
              <p className="field-hint" style={{ marginTop: -6, marginBottom: 12 }}>Visibles uniquement par l'équipe admin.</p>
              <textarea
                rows={10}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajoutez une note de suivi…"
                style={{ width: '100%', padding: 12, border: '1.5px solid var(--border)', borderRadius: 8, marginBottom: 12, resize: 'vertical' }}
              />
              <button className="btn btn-primary" onClick={handleSaveNotes} disabled={savingNotes}>
                {savingNotes ? 'Enregistrement…' : 'Enregistrer les notes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
