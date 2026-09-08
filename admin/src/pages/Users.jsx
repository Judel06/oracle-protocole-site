import { useEffect, useState } from 'react';
import { supabase, functionsUrl } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
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
  const { adminProfile } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('admin');
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
      await callEdgeFunction('admin-invite-user', { email: inviteEmail.trim(), role: inviteRole });
      showToast(`Invitation envoyée à ${inviteEmail.trim()}.`);
      setInviteEmail('');
      await load();
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

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
              <div className="field">
                <label>Rôle</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="admin">Administrateur</option>
                  <option value="editor">Éditeur</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={inviting}>
              {inviting ? 'Envoi…' : "Envoyer l'invitation"}
            </button>
          </form>
        </div>

        <div className="section-title">Comptes ayant accès</div>
        {loading ? <LoadingSpinner /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Email</th><th>Rôle</th><th>Statut</th><th>Ajouté le</th><th></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ cursor: 'default' }}>
                    <td>{u.email}</td>
                    <td style={{ textTransform: 'capitalize' }}>{u.role === 'admin' ? 'Administrateur' : 'Éditeur'}</td>
                    <td><span className={`badge ${u.active ? 'badge-green' : 'badge-red'}`}>{u.active ? 'Actif' : 'Révoqué'}</span></td>
                    <td>{formatDate(u.created_at)}</td>
                    <td>
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
