import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import RoleBadge from '../components/RoleBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { MODULES, ACTIONS, DG, DG_ONLY_MODULES, ROLE_COLORS } from '../config/permissions';
import { logActivity } from '../utils/logActivity';
import { formatDateTime } from '../utils/format';

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

export default function Roles() {
  const { adminProfile, roleCatalog, delegatedFrom, isRealDG, reloadGovernance } = useAuth();
  const { showToast } = useToast();

  const [selected, setSelected] = useState(DG);
  const [draft, setDraft] = useState({}); // permissions du role selectionne en cours d'edition
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('blue');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [plafond, setPlafond] = useState('');
  const [delegations, setDelegations] = useState([]);
  const [delegation, setDelegation] = useState({ to_role: '', ends_at: '', motif: '' });

  const role = useMemo(() => roleCatalog.find((r) => r.key === selected), [roleCatalog, selected]);
  const isLocked = selected === DG;

  useEffect(() => { setDraft(role?.permissions || {}); }, [role]);

  const loadExtras = async () => {
    const [{ data: cfg }, { data: dels }] = await Promise.all([
      supabase.from('admin_config').select('plafond_paiement').eq('id', 1).maybeSingle(),
      supabase.from('delegations').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    if (cfg) setPlafond(String(cfg.plafond_paiement));
    setDelegations(dels || []);
  };
  useEffect(() => { loadExtras(); }, []);

  const toggle = (module, action) => {
    setDraft((d) => {
      const list = new Set(d[module] || []);
      if (list.has(action)) list.delete(action);
      else list.add(action);
      // Toute autre action suppose de pouvoir voir le module.
      if (action !== 'voir' && list.has(action)) list.add('voir');
      if (action === 'voir' && !list.has('voir')) list.clear();
      return { ...d, [module]: [...list] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const clean = Object.fromEntries(Object.entries(draft).filter(([m, a]) => a.length && !DG_ONLY_MODULES.includes(m)));
    const { error } = await supabase.from('roles').update({ permissions: clean }).eq('key', selected);
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    await logActivity('role_permissions_update', { module: 'roles', role_modifie: selected });
    await reloadGovernance();
    showToast('Permissions enregistrées.');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const key = slug(newLabel);
    if (!key || roleCatalog.some((r) => r.key === key)) { showToast('Ce nom de rôle existe déjà ou est invalide.', 'error'); return; }
    const { error } = await supabase.from('roles').insert({ key, label: newLabel.trim(), color: newColor, permissions: {}, is_system: false });
    if (error) { showToast(error.message, 'error'); return; }
    await logActivity('role_cree', { module: 'roles', role_cree: key });
    await reloadGovernance();
    setNewLabel('');
    setSelected(key);
    showToast('Rôle créé. Cochez ses permissions puis enregistrez.');
  };

  const handleDelete = async () => {
    const { count } = await supabase.from('admin_users').select('id', { count: 'exact', head: true }).contains('roles', [deleteTarget.key]);
    if (count) { showToast(`Impossible : ${count} utilisateur(s) ont encore ce rôle.`, 'error'); setDeleteTarget(null); return; }
    const { error } = await supabase.from('roles').delete().eq('key', deleteTarget.key);
    if (error) { showToast(error.message, 'error'); return; }
    await logActivity('role_supprime', { module: 'roles', role_supprime: deleteTarget.key });
    await reloadGovernance();
    setSelected(DG);
    setDeleteTarget(null);
  };

  const savePlafond = async () => {
    const value = Number(plafond);
    if (!Number.isFinite(value) || value < 0) { showToast('Montant invalide.', 'error'); return; }
    const { error } = await supabase.from('admin_config').update({ plafond_paiement: value }).eq('id', 1);
    if (error) { showToast(error.message, 'error'); return; }
    await logActivity('plafond_paiement_update', { module: 'paiements', plafond: value });
    showToast('Plafond enregistré.');
  };

  const handleDelegate = async (e) => {
    e.preventDefault();
    const ends = new Date(delegation.ends_at);
    if (!(ends > new Date())) { showToast('La date de fin doit être dans le futur.', 'error'); return; }
    const { error } = await supabase.from('delegations').insert({
      delegated_by: adminProfile.id, to_role: delegation.to_role, ends_at: ends.toISOString(), motif: delegation.motif.trim() || null,
    });
    if (error) { showToast(error.message, 'error'); return; }
    await logActivity('delegation_creee', { module: 'roles', vers_role: delegation.to_role, jusqu_au: ends.toISOString(), motif: delegation.motif.trim() || null });
    setDelegation({ to_role: '', ends_at: '', motif: '' });
    await Promise.all([loadExtras(), reloadGovernance()]);
    showToast('Délégation activée.');
  };

  const revokeDelegation = async (d) => {
    const { error } = await supabase.from('delegations').update({ revoked_at: new Date().toISOString() }).eq('id', d.id);
    if (error) { showToast(error.message, 'error'); return; }
    await logActivity('delegation_revoquee', { module: 'roles', vers_role: d.to_role });
    await Promise.all([loadExtras(), reloadGovernance()]);
  };

  const activeDelegation = (d) => !d.revoked_at && new Date(d.ends_at) > new Date();
  const delegable = roleCatalog.filter((r) => r.key !== DG);

  return (
    <>
      <PageHeader title="Rôles et permissions" />
      <div className="admin-content">

        {delegatedFrom.length > 0 && (
          <div className="auth-error" style={{ background: '#F6EBC8', color: 'var(--gold-dark)', marginBottom: 18 }}>
            Vous exercez actuellement les pouvoirs du Directeur Général par délégation (jusqu'au {formatDateTime(delegatedFrom[0].ends_at)}).
          </div>
        )}

        <div className="role-tabs">
          {roleCatalog.map((r) => (
            <button key={r.key} type="button" className={`role-tab${r.key === selected ? ' active' : ''}`} onClick={() => setSelected(r.key)}>
              <RoleBadge role={r} />
            </button>
          ))}
        </div>

        {role && (
          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div className="section-title" style={{ margin: 0 }}>Matrice de {role.label}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!role.is_system && <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(role)}>Supprimer ce rôle</button>}
                {!isLocked && <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>}
              </div>
            </div>
            {isLocked && <p className="field-hint">Le Directeur Général a accès à tout, sans restriction. Sa matrice ne peut pas être modifiée.</p>}
            <div className="table-wrap">
              <table className="perm-matrix">
                <thead>
                  <tr><th>Module</th>{ACTIONS.map((a) => <th key={a.key}>{a.label}</th>)}</tr>
                </thead>
                <tbody>
                  {MODULES.map((m) => {
                    const dgOnly = DG_ONLY_MODULES.includes(m.key);
                    return (
                      <tr key={m.key}>
                        <td>{m.label}{dgOnly && <span className="field-hint"> (réservé au DG)</span>}</td>
                        {ACTIONS.map((a) => (
                          <td key={a.key}>
                            <input
                              type="checkbox"
                              aria-label={`${a.label} ${m.label}`}
                              checked={isLocked || (!dgOnly && Boolean(draft[m.key]?.includes(a.key)))}
                              disabled={isLocked || dgOnly}
                              onChange={() => toggle(m.key, a.key)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="field-hint" style={{ marginTop: 10 }}>
              « Supprimer » = archiver (réversible). La suppression définitive reste réservée au Directeur Général. Les permissions d'un utilisateur à plusieurs rôles s'additionnent.
            </p>
          </div>
        )}

        <div className="card card-pad" style={{ marginBottom: 24, maxWidth: 520 }}>
          <div className="section-title">Créer un rôle personnalisé</div>
          <form onSubmit={handleCreate}>
            <div className="form-grid">
              <div className="field">
                <label>Nom du rôle</label>
                <input required maxLength={60} value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
              </div>
              <div className="field">
                <label>Couleur</label>
                <select value={newColor} onChange={(e) => setNewColor(e.target.value)}>
                  {ROLE_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-navy">Créer le rôle</button>
          </form>
        </div>

        <div className="card card-pad" style={{ marginBottom: 24, maxWidth: 520 }}>
          <div className="section-title">Plafond de paiement de la Trésorerie</div>
          <p className="field-hint" style={{ marginTop: -6 }}>Au-delà de ce montant, un paiement part en validation chez le Directeur Général.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="number" min="0" step="1" value={plafond} onChange={(e) => setPlafond(e.target.value)} style={{ flex: 1, padding: 10, border: '1.5px solid var(--border)', borderRadius: 8 }} />
            <button className="btn btn-primary" onClick={savePlafond}>Enregistrer</button>
          </div>
        </div>

        {isRealDG && (
          <div className="card card-pad" style={{ maxWidth: 720 }}>
            <div className="section-title">Délégation temporaire de mes pouvoirs</div>
            <form onSubmit={handleDelegate}>
              <div className="form-grid">
                <div className="field">
                  <label>Déléguer au rôle</label>
                  <select required value={delegation.to_role} onChange={(e) => setDelegation({ ...delegation, to_role: e.target.value })}>
                    <option value="">Choisir…</option>
                    {delegable.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Date de fin (obligatoire)</label>
                  <input type="datetime-local" required value={delegation.ends_at} onChange={(e) => setDelegation({ ...delegation, ends_at: e.target.value })} />
                </div>
                <div className="field">
                  <label>Motif</label>
                  <input value={delegation.motif} onChange={(e) => setDelegation({ ...delegation, motif: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-navy">Activer la délégation</button>
            </form>

            {delegations.length > 0 && (
              <div className="table-wrap" style={{ marginTop: 18 }}>
                <table className="data-table">
                  <thead><tr><th>Rôle</th><th>Jusqu'au</th><th>Motif</th><th>État</th><th></th></tr></thead>
                  <tbody>
                    {delegations.map((d) => (
                      <tr key={d.id} style={{ cursor: 'default' }}>
                        <td><RoleBadge role={roleCatalog.find((r) => r.key === d.to_role) || { label: d.to_role }} /></td>
                        <td>{formatDateTime(d.ends_at)}</td>
                        <td>{d.motif || '—'}</td>
                        <td><span className={`badge ${activeDelegation(d) ? 'badge-green' : 'badge-red'}`}>{d.revoked_at ? 'Révoquée' : activeDelegation(d) ? 'Active' : 'Expirée'}</span></td>
                        <td>{activeDelegation(d) && <button className="btn btn-danger btn-sm" onClick={() => revokeDelegation(d)}>Révoquer</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Supprimer ce rôle ?"
        message={`Le rôle « ${deleteTarget?.label} » sera supprimé. Impossible s'il est encore attribué à un utilisateur.`}
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
