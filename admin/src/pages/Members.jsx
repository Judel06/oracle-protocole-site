import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { logActivity } from '../utils/logActivity';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';

const NIVEAU_LABELS = {
  niveau_1: 'Niveau 1 – Accès Total',
  niveau_2: 'Niveau 2 – Zone Officielle',
  niveau_3: 'Niveau 3 – Zone Générale',
};

const EMPTY_FORM = { nom_complet: '', niveau_accreditation: 'niveau_2', affectation_defaut: '', telephone: '', email: '' };

/**
 * Annuaire permanent des membres du protocole (actif/inactif), reutilisable
 * d'un evenement a l'autre. Distinct du suivi "present/non arrive" par
 * evenement, gere dans le module Presence du Dashboard.
 */
export default function Members() {
  const { showToast } = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [filter, setFilter] = useState('actif');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('membres_protocole').select('*').order('nom_complet', { ascending: true });
    setMembers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.nom_complet.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('membres_protocole').insert({
      nom_complet: form.nom_complet.trim(),
      niveau_accreditation: form.niveau_accreditation,
      affectation_defaut: form.affectation_defaut.trim() || null,
      telephone: form.telephone.trim() || null,
      email: form.email.trim() || null,
    });
    setSaving(false);
    if (error) { showToast("L'ajout du membre a échoué.", 'error'); return; }
    await logActivity('membre_ajoute', { nom: form.nom_complet.trim() });
    setForm(EMPTY_FORM);
    setShowForm(false);
    showToast('Membre ajouté à l\'annuaire.');
    load();
  };

  const toggleStatut = async (member) => {
    const nextStatut = member.statut === 'actif' ? 'inactif' : 'actif';
    setTogglingId(member.id);
    const { error } = await supabase.from('membres_protocole').update({ statut: nextStatut }).eq('id', member.id);
    setTogglingId(null);
    if (error) { showToast('Le changement de statut a échoué.', 'error'); return; }
    await logActivity('membre_statut_change', { membre_id: member.id, nom: member.nom_complet, nouveau_statut: nextStatut });
    showToast(nextStatut === 'actif' ? `${member.nom_complet} réactivé.` : `${member.nom_complet} désactivé.`);
    load();
  };

  const filtered = members.filter((m) => filter === 'tous' || m.statut === filter);

  return (
    <>
      <PageHeader
        title="Membres du Protocole"
        actions={<button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>+ Ajouter un membre</button>}
      />
      <div className="admin-content">

        {showForm && (
          <div className="card card-pad" style={{ marginBottom: 20, maxWidth: 640 }}>
            <div className="section-title">Nouveau membre</div>
            <form onSubmit={handleAdd}>
              <div className="form-grid">
                <div className="field">
                  <label>Nom complet</label>
                  <input type="text" required value={form.nom_complet} onChange={(e) => setForm((p) => ({ ...p, nom_complet: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Niveau d'accréditation</label>
                  <select value={form.niveau_accreditation} onChange={(e) => setForm((p) => ({ ...p, niveau_accreditation: e.target.value }))}>
                    {Object.entries(NIVEAU_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Affectation habituelle</label>
                  <input type="text" placeholder="Ex. Accueil VIP" value={form.affectation_defaut} onChange={(e) => setForm((p) => ({ ...p, affectation_defaut: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Téléphone</label>
                  <input type="tel" value={form.telephone} onChange={(e) => setForm((p) => ({ ...p, telephone: e.target.value }))} />
                </div>
              </div>
              <div className="field" style={{ maxWidth: 300 }}>
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Ajout…' : 'Ajouter à l\'annuaire'}</button>
            </form>
          </div>
        )}

        <div className="filters-bar">
          <div className="filter-field">
            <label>Statut</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="actif">Actifs</option>
              <option value="inactif">Inactifs</option>
              <option value="tous">Tous</option>
            </select>
          </div>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Nom</th><th>Niveau</th><th>Affectation habituelle</th><th>Contact</th><th>Statut</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} style={{ cursor: 'default' }}>
                    <td><strong>{m.nom_complet}</strong></td>
                    <td>{NIVEAU_LABELS[m.niveau_accreditation]}</td>
                    <td>{m.affectation_defaut || '—'}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--text-soft)' }}>{[m.telephone, m.email].filter(Boolean).join(' · ') || '—'}</td>
                    <td><span className={`badge ${m.statut === 'actif' ? 'badge-green' : 'badge-gray'}`}>{m.statut === 'actif' ? 'Actif' : 'Inactif'}</span></td>
                    <td>
                      <button className="btn btn-outline btn-sm" disabled={togglingId === m.id} onClick={() => toggleStatut(m)}>
                        {m.statut === 'actif' ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="table-empty">Aucun membre.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </>
  );
}
