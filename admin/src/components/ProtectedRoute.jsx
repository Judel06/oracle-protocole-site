import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * Bloque l'acces a /admin/* tant que l'utilisateur n'est pas authentifie
 * ET reconnu comme admin actif (voir AuthContext : adminProfile).
 */
export default function ProtectedRoute({ children }) {
  const { session, isAdmin, loading } = useAuth();

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

  return children;
}
