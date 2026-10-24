import { useEffect, useState } from 'react';
import { supabase, functionsUrl } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import RoleBadge from '../components/RoleBadge';
import { DG } from '../config/permissions';
import { logActivity } from '../utils/logActivity';
import { formatDate } from '../utils/format';

async function callEdgeFunction(name, payload) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${functionsUrl}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'La requête a échoué.');
  return json;
}

export default function Users() {
  const { adminProfile, roleCatalog, reloadProfile } = useAuth();
  const [editTarget, setEditTarget] = useState(null); // { user, roles }
  const [savingRoles, setSavingRoles] = useState(false);
  const [inviteRoles, setInviteRoles] = useState([]);
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('admin_users').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviting(true);
    try {
      if (!inviteRoles.length) throw new Error('Choisissez au moins un rôle.');
      const email = inviteEmail.trim();
      // La fonction d'invitation ne connait que admin/editor (colonne historique) ; les vrais roles sont poses ensuite.
      await callEdgeFunction('admin-invite-user', { email, role: inviteRoles.includes(DG) ? 'admin' : 'editor' });
      const { error: roleErr } = await supabase.from('admin_users').update({ roles: inviteRoles }).eq('email', email);
      if (roleErr) throw roleErr;
      await logActivity('user_invite', { module: 'utilisateurs', email, roles: inviteRoles.join(', ') });
      setInviteRoles([]);
      showToast(`Invitation envoyée à ${inviteEmail.trim()}.`);
      setInviteEmail('');
      await load();
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const saveRoles = async () => {
    setSavingRoles(true);
    const { user, roles } = editTarget;
    const { error } = await supabase.from('admin_users').update({ roles, role: roles.includes(DG) ? 'admin' : 'editor' }).eq('id', user.id);
    setSavingRoles(false);
    if (error) { showToast(error.message, 'error'); return; }
    await logActivity('user_roles_update', { module: 'utilisateurs', email: user.email, roles: roles.join(', ') });
    showToast('Rôles mis à jour.');
    setEditTarget(null);
    await load();
    await reloadProfile();
  };

  const toggleRole = (list, key) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  const roleChecks = (list, onChange) => (
    <div className="role-check-list">
      {roleCatalog.map((r) => (
        <label key={r.key}>
          <input type="checkbox" checked={list.includes(r.key)} onChange={() => onChange(toggleRole(list, r.key))} />
          <RoleBadge role={r} />
        </label>
      ))}
    </div>
  );

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await callEdgeFunction('admin-revoke-user', { userId: revokeTarget.id });
      showToast(`Accès révoqué pour ${revokeTarget.email}.`);
      setRevokeTarget(null);
      await load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <>
      <PageHeader title="Utilisateurs admin" />
      <div className="admin-content">

        <div className="card card-pad" style={{ marginBottom: 24, maxWidth: 520 }}>
          <div className="section-title">Inviter un nouvel administrateur</div>
          {inviteError && <div className="auth-error">{inviteError}</div>}
          <form onSubmit={handleInvite}>
            <div className="form-grid">
              <div className="field">
                <label>Email</label>
                <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
            </div>
            <label style={{ fontSize: '.84rem', fontWeight: 600 }}>Rôles (les permissions s'additionnent)</label>
            {roleChecks(inviteRoles, setInviteRoles)}
            <button type="submit" className="btn btn-primary" disabled={inviting}>
              {inviting ? 'Envoi…' : "Envoyer l'invitation"}
            </button>
          </form>
        </div>

        <div className="section-title">Comptes ayant accès</div>
        {loading ? <LoadingSpinner /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Email</th><th>Rôles</th><th>Statut</th><th>Ajouté le</th><th></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ cursor: 'default' }}>
                    <td>{u.email}</td>
                    <td>
                      {(u.roles?.length ? u.roles : [u.role === 'admin' ? DG : 'communication']).map((k) => (
                        <RoleBadge key={k} role={roleCatalog.find((r) => r.key === k) || { label: k }} />
                      ))}
                      {!u.roles?.length && <span className="field-hint"> (à attribuer)</span>}
                    </td>
                    <td><span className={`badge ${u.active ? 'badge-green' : 'badge-red'}`}>{u.active ? 'Actif' : 'Révoqué'}</span></td>
                    <td>{formatDate(u.created_at)}</td>
                    <td>
                      {u.id !== adminProfile?.id && (
                        <button className="btn btn-outline btn-sm" style={{ marginRight: 6 }} onClick={() => setEditTarget({ user: u, roles: u.roles || [] })}>Rôles</button>
                      )}
                      {u.active && u.id !== adminProfile?.id && (
                        <button className="btn btn-danger btn-sm" onClick={() => setRevokeTarget(u)}>Révoquer</button>
                      )}
                      {u.id === adminProfile?.id && <span style={{ fontSize: '.78rem', color: 'var(--text-soft)' }}>Vous</span>}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={5} className="table-empty">Aucun utilisateur.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Rôles de {editTarget.user.email}</h3>
            {roleChecks(editTarget.roles, (roles) => setEditTarget({ ...editTarget, roles }))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setEditTarget(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={saveRoles} disabled={savingRoles}>{savingRoles ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title="Révoquer cet accès ?"
        message={`${revokeTarget?.email} ne pourra plus se connecter au panneau d'administration. Cette action peut être annulée en le réinvitant plus tard.`}
        confirmLabel="Révoquer"
        danger
        busy={revoking}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </>
  );
}
