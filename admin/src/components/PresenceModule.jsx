import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { logActivity } from '../utils/logActivity';

const NIVEAU_LABELS = {
  niveau_1: 'Niveau 1 – Accès Total',
  niveau_2: 'Niveau 2 – Zone Officielle',
  niveau_3: 'Niveau 3 – Zone Générale',
};

const EMPTY_ADHOC = { nom_complet: '', niveau_accreditation: 'niveau_2', affectation: '' };

/**
 * Module "Confirmation de presence" du dashboard : liste des membres du
 * protocole affectes a l'evenement actif, avec confirmation d'arrivee.
 * L'ajout se fait soit depuis l'annuaire permanent (membres_protocole,
 * page /membres), soit ponctuellement ("hors annuaire") pour du staff
 * non recurrent. L'envoi de l'email de notification est gere cote base
 * (trigger Postgres sur presence_protocole -> Edge Function notify-presence).
 */
export default function PresenceModule() {
  const { showToast } = useToast();
  const [evenement, setEvenement] = useState(null);
  const [members, setMembers] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);
  const [lieuInput, setLieuInput] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [justUpdatedId, setJustUpdatedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState('roster');
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedRosterId, setSelectedRosterId] = useState('');
  const [rosterNiveau, setRosterNiveau] = useState('niveau_2');
  const [rosterAffectation, setRosterAffectation] = useState('');
  const [adhoc, setAdhoc] = useState(EMPTY_ADHOC);
  const [newEvent, setNewEvent] = useState({ nom: '', date_evenement: '', lieu: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: evt }, { data: rosterData }] = await Promise.all([
      supabase.from('evenements').select('*').eq('actif', true).maybeSingle(),
      supabase.from('membres_protocole').select('*').eq('statut', 'actif').order('nom_complet', { ascending: true }),
    ]);
    setEvenement(evt || null);
    setRoster(rosterData || []);

    if (evt) {
      const { data: rows } = await supabase
        .from('presence_protocole')
        .select('*')
        .eq('evenement_id', evt.id)
        .order('nom_complet', { ascending: true });
      setMembers(rows || []);
    } else {
      setMembers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const presentCount = members.filter((m) => m.statut === 'present').length;
  const totalCount = members.length;
  const progressPct = totalCount ? Math.round((presentCount / totalCount) * 100) : 0;

  const availableRoster = roster.filter((r) => !members.some((m) => m.membre_id === r.id));

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.nom.trim()) return;
    setSaving(true);
    await supabase.from('evenements').update({ actif: false }).eq('actif', true);
    const { error } = await supabase.from('evenements').insert({
      nom: newEvent.nom.trim(),
      date_evenement: newEvent.date_evenement || null,
      lieu: newEvent.lieu.trim() || null,
      actif: true,
    });
    setSaving(false);
    if (error) { showToast("La création de l'événement a échoué.", 'error'); return; }
    setNewEvent({ nom: '', date_evenement: '', lieu: '' });
    setShowEventForm(false);
    showToast('Événement actif créé.');
    load();
  };

  const handlePickRosterMember = (id) => {
    setSelectedRosterId(id);
    const m = roster.find((r) => r.id === id);
    setRosterNiveau(m?.niveau_accreditation || 'niveau_2');
    setRosterAffectation(m?.affectation_defaut || '');
  };

  const handleAddFromRoster = async (e) => {
    e.preventDefault();
    if (!selectedRosterId || !evenement) return;
    const rosterMember = roster.find((r) => r.id === selectedRosterId);
    setSaving(true);
    const { error } = await supabase.from('presence_protocole').insert({
      evenement_id: evenement.id,
      membre_id: rosterMember.id,
      nom_complet: rosterMember.nom_complet,
      niveau_accreditation: rosterNiveau,
      affectation: rosterAffectation.trim() || rosterMember.affectation_defaut || 'Non précisé',
    });
    setSaving(false);
    if (error) { showToast("L'ajout du membre a échoué.", 'error'); return; }
    setSelectedRosterId('');
    setRosterAffectation('');
    setShowAddForm(false);
    showToast(`${rosterMember.nom_complet} ajouté à l'événement.`);
    load();
  };

  const handleAddAdhoc = async (e) => {
    e.preventDefault();
    if (!adhoc.nom_complet.trim() || !adhoc.affectation.trim() || !evenement) return;
    setSaving(true);
    const { error } = await supabase.from('presence_protocole').insert({
      evenement_id: evenement.id,
      nom_complet: adhoc.nom_complet.trim(),
      niveau_accreditation: adhoc.niveau_accreditation,
      affectation: adhoc.affectation.trim(),
    });
    setSaving(false);
    if (error) { showToast("L'ajout du membre a échoué.", 'error'); return; }
    setAdhoc(EMPTY_ADHOC);
    setShowAddForm(false);
    showToast('Membre ajouté à la liste.');
    load();
  };

  const openConfirm = (member) => {
    setConfirmingId(member.id);
    setLieuInput(member.lieu_arrivee || evenement?.lieu || '');
  };

  const handleConfirmArrival = async (member) => {
    setSavingId(member.id);
    const { error } = await supabase
      .from('presence_protocole')
      .update({ statut: 'present', lieu_arrivee: lieuInput.trim() || null, heure_arrivee: new Date().toISOString() })
      .eq('id', member.id);
    setSavingId(null);
    setConfirmingId(null);
    if (error) { showToast("La confirmation de présence a échoué.", 'error'); return; }

    await logActivity('presence_confirmee', { member_id: member.id, nom: member.nom_complet });
    setJustUpdatedId(member.id);
    setTimeout(() => setJustUpdatedId(null), 1200);
    showToast(`Présence confirmée — ${member.nom_complet}`);
    load();
  };

  return (
    <div className="card card-pad module-card">
      <div className="module-header">
        <div>
          <div className="section-title" style={{ marginBottom: 4 }}>Présence Protocole</div>
          {evenement ? (
            <span className="field-hint" style={{ marginTop: 0 }}>{evenement.nom}{evenement.lieu ? ` · ${evenement.lieu}` : ''}</span>
          ) : (
            <span className="field-hint" style={{ marginTop: 0 }}>Aucun événement actif</span>
          )}
        </div>
        {evenement && (
          <button className="btn btn-outline btn-sm" onClick={() => setShowAddForm((v) => !v)}>+ Ajouter un membre</button>
        )}
      </div>

      {evenement && (
        <>
          <div className="presence-summary">
            <span className="presence-count">{presentCount} / {totalCount}</span>
            <span className="field-hint" style={{ margin: 0 }}>membres présents</span>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${progressPct}%` }} /></div>
          </div>

          {showAddForm && (
            <div style={{ marginBottom: 16 }}>
              <div className="add-mode-tabs">
                <button type="button" className={`tab-btn ${addMode === 'roster' ? 'active' : ''}`} onClick={() => setAddMode('roster')}>Depuis l'annuaire</button>
                <button type="button" className={`tab-btn ${addMode === 'adhoc' ? 'active' : ''}`} onClick={() => setAddMode('adhoc')}>Hors annuaire</button>
              </div>

              {addMode === 'roster' ? (
                availableRoster.length === 0 ? (
                  <p className="field-hint">
                    Tous les membres actifs sont déjà sur cette liste, ou aucun membre actif.{' '}
                    <Link to="/membres">Gérer l'annuaire →</Link>
                  </p>
                ) : (
                  <form className="inline-form" onSubmit={handleAddFromRoster}>
                    <select required value={selectedRosterId} onChange={(e) => handlePickRosterMember(e.target.value)}>
                      <option value="">Choisir un membre…</option>
                      {availableRoster.map((r) => <option key={r.id} value={r.id}>{r.nom_complet}</option>)}
                    </select>
                    {selectedRosterId && (
                      <>
                        <select value={rosterNiveau} onChange={(e) => setRosterNiveau(e.target.value)}>
                          {Object.entries(NIVEAU_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <input type="text" placeholder="Affectation pour cet événement" value={rosterAffectation} onChange={(e) => setRosterAffectation(e.target.value)} />
                      </>
                    )}
                    <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !selectedRosterId}>Ajouter</button>
                  </form>
                )
              ) : (
                <form className="inline-form" onSubmit={handleAddAdhoc}>
                  <input type="text" placeholder="Nom complet" required value={adhoc.nom_complet} onChange={(e) => setAdhoc((p) => ({ ...p, nom_complet: e.target.value }))} />
                  <select value={adhoc.niveau_accreditation} onChange={(e) => setAdhoc((p) => ({ ...p, niveau_accreditation: e.target.value }))}>
                    {Object.entries(NIVEAU_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <input type="text" placeholder="Affectation (ex. Accueil VIP)" required value={adhoc.affectation} onChange={(e) => setAdhoc((p) => ({ ...p, affectation: e.target.value }))} />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>Ajouter</button>
                </form>
              )}
            </div>
          )}
        </>
      )}

      {!evenement && !loading && (
        <div className="module-empty">
          <p>Créez un événement pour commencer le suivi de présence.</p>
          {!showEventForm ? (
            <button className="btn btn-primary btn-sm" onClick={() => setShowEventForm(true)}>Créer un événement</button>
          ) : (
            <form className="inline-form" onSubmit={handleCreateEvent}>
              <input type="text" placeholder="Nom de l'événement" required value={newEvent.nom} onChange={(e) => setNewEvent((p) => ({ ...p, nom: e.target.value }))} />
              <input type="date" value={newEvent.date_evenement} onChange={(e) => setNewEvent((p) => ({ ...p, date_evenement: e.target.value }))} />
              <input type="text" placeholder="Lieu" value={newEvent.lieu} onChange={(e) => setNewEvent((p) => ({ ...p, lieu: e.target.value }))} />
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>Créer</button>
            </form>
          )}
        </div>
      )}

      {evenement && (
        <div className="module-list">
          {members.length === 0 && !loading && <p className="field-hint">Aucun membre ajouté pour l'instant.</p>}
          {members.map((m) => (
            <div key={m.id} className={`module-row ${justUpdatedId === m.id ? 'just-updated' : ''}`}>
              <div className="module-row-main">
                <strong>{m.nom_complet}</strong>
                <div className="module-row-meta">
                  <span className="badge badge-navy">{NIVEAU_LABELS[m.niveau_accreditation]}</span>
                  <span className="field-hint" style={{ margin: 0 }}>{m.affectation}</span>
                </div>
              </div>
              <div className="module-row-action">
                {m.statut === 'present' ? (
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-green">● Présent</span>
                    <div className="field-hint" style={{ marginTop: 4 }}>
                      {new Date(m.heure_arrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {m.lieu_arrivee ? ` · ${m.lieu_arrivee}` : ''}
                    </div>
                  </div>
                ) : confirmingId === m.id ? (
                  <div className="confirm-popover">
                    <input type="text" placeholder="Lieu" value={lieuInput} onChange={(e) => setLieuInput(e.target.value)} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setConfirmingId(null)}>Annuler</button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleConfirmArrival(m)} disabled={savingId === m.id}>
                        {savingId === m.id ? '…' : 'Confirmer'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="badge badge-gold" style={{ marginRight: 10 }}>○ Non arrivé</span>
                    <button className="btn btn-primary btn-sm" onClick={() => openConfirm(m)}>Confirmer l'arrivée</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
