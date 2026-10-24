import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import EntityList from './pages/EntityList';
import EntityDetail from './pages/EntityDetail';
import Members from './pages/Members';
import Candidatures from './pages/Candidatures';
import CandidatureDetail from './pages/CandidatureDetail';
import MissionMatchTool from './pages/MissionMatchTool';
import Serin2027 from './pages/Serin2027';
import Adhesions from './pages/Adhesions';
import AdhesionDetail from './pages/AdhesionDetail';
import Users from './pages/Users';
import Settings from './pages/Settings';
import ActivityLog from './pages/ActivityLog';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute, { RequirePerm, RequireDG } from './components/ProtectedRoute';
import Roles from './pages/Roles';
import Validations from './pages/Validations';

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
        <Route path="/devis" element={<RequirePerm module="devis"><EntityList entityKey="devis" /></RequirePerm>} />
        <Route path="/devis/:id" element={<RequirePerm module="devis"><EntityDetail entityKey="devis" /></RequirePerm>} />
        <Route path="/formations" element={<RequirePerm module="formations"><EntityList entityKey="formations" /></RequirePerm>} />
        <Route path="/formations/:id" element={<RequirePerm module="formations"><EntityDetail entityKey="formations" /></RequirePerm>} />
        <Route path="/messages" element={<RequirePerm module="messages"><EntityList entityKey="messages" /></RequirePerm>} />
        <Route path="/messages/:id" element={<RequirePerm module="messages"><EntityDetail entityKey="messages" /></RequirePerm>} />
        <Route path="/membres" element={<RequirePerm module="membres"><Members /></RequirePerm>} />
        <Route path="/candidatures" element={<RequirePerm module="candidatures"><Candidatures /></RequirePerm>} />
        <Route path="/candidatures/recherche-mission" element={<RequirePerm module="candidatures"><MissionMatchTool /></RequirePerm>} />
        <Route path="/candidatures/:id" element={<RequirePerm module="candidatures"><CandidatureDetail /></RequirePerm>} />
        <Route path="/serin-2027" element={<RequirePerm module="candidatures"><Serin2027 /></RequirePerm>} />
        <Route path="/adhesions" element={<RequirePerm module="adhesions"><Adhesions /></RequirePerm>} />
        <Route path="/adhesions/:id" element={<RequirePerm module="adhesions"><AdhesionDetail /></RequirePerm>} />
        <Route path="/utilisateurs" element={<RequirePerm module="utilisateurs"><Users /></RequirePerm>} />
        <Route path="/parametres" element={<RequirePerm module="parametres"><Settings /></RequirePerm>} />
        <Route path="/roles" element={<RequireDG><Roles /></RequireDG>} />
        <Route path="/validations" element={<RequireDG><Validations /></RequireDG>} />
        <Route path="/journal" element={<RequirePerm module="journal"><ActivityLog /></RequirePerm>} />
      </Route>
    </Routes>
  );
}
