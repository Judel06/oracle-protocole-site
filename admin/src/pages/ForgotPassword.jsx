import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || "L'envoi de l'email a échoué.");
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
        <h2>Mot de passe oublié</h2>
        <p>Recevez un lien de réinitialisation par email.</p>

        {error && <div className="auth-error">{error}</div>}
        {sent && <div className="auth-success">Si un compte existe pour cette adresse, un email vient d'être envoyé.</div>}

        {!sent && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </form>
        )}

        <div className="auth-links">
          <Link to="/login">← Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
}
