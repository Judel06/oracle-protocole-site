import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Accessible via le lien recu par email (Supabase place automatiquement
// une session temporaire "recovery" active a l'arrivee sur cette page).
export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => navigate('/', { replace: true }), 1800);
    } catch (err) {
      setError(err.message || 'La mise à jour a échoué.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="mark">O</span>
          <div>
            <strong>ORACLE</strong>
            <span>Panneau d'administration</span>
          </div>
        </div>
        <h2>Nouveau mot de passe</h2>
        <p>Choisissez un mot de passe sécurisé.</p>

        {error && <div className="auth-error">{error}</div>}
        {done && <div className="auth-success">Mot de passe mis à jour. Redirection…</div>}

        {!done && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="password">Nouveau mot de passe</label>
              <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirmer le mot de passe</label>
              <input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
