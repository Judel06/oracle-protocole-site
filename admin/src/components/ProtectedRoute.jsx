import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import MfaGate from './MfaGate';

/**
 * Bloque l'acces a /admin/* tant que l'utilisateur n'est pas authentifie
 * ET reconnu comme admin actif (voir AuthContext : adminProfile), puis tant
 * que la double authentification n'est pas validee (Directeur General).
 */
export default function ProtectedRoute({ children }) {
  const { session, isAdmin, loading, mfaStep } = useAuth();

  if (loading) {
    return (
      <div className="auth-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!session || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  if (mfaStep) return <MfaGate />;

  return children;
}

/** Affiche la page seulement si le compte a la permission (module, action). */
export function RequirePerm({ module, action = 'voir', children }) {
  const { can } = useAuth();
  if (!can(module, action)) {
    return (
      <div className="admin-content">
        <div className="card card-pad" style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
          <div className="section-title">Accès non autorisé</div>
          <p className="field-hint">Votre rôle ne donne pas accès à ce module. Contactez le Directeur Général si vous pensez que c'est une erreur.</p>
        </div>
      </div>
    );
  }
  return children;
}

/** Page reservee au Directeur General (ou a un role qui en a recu la delegation). */
export function RequireDG({ children }) {
  const { isDG } = useAuth();
  return isDG ? children : <RequirePerm module="utilisateurs">{children}</RequirePerm>;
}
