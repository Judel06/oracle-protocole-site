import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import EntityList from './pages/EntityList';
import EntityDetail from './pages/EntityDetail';
import Members from './pages/Members';
import Users from './pages/Users';
import Settings from './pages/Settings';
import ActivityLog from './pages/ActivityLog';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/devis" element={<EntityList entityKey="devis" />} />
        <Route path="/devis/:id" element={<EntityDetail entityKey="devis" />} />
        <Route path="/formations" element={<EntityList entityKey="formations" />} />
        <Route path="/formations/:id" element={<EntityDetail entityKey="formations" />} />
        <Route path="/messages" element={<EntityList entityKey="messages" />} />
        <Route path="/messages/:id" element={<EntityDetail entityKey="messages" />} />
        <Route path="/membres" element={<Members />} />
        <Route path="/utilisateurs" element={<Users />} />
        <Route path="/parametres" element={<Settings />} />
        <Route path="/journal" element={<ActivityLog />} />
      </Route>
    </Routes>
  );
}
