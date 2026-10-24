// Pastille de couleur d'un role. `role` = ligne de public.roles (ou { key, label, color }).
export default function RoleBadge({ role }) {
  if (!role) return null;
  return <span className={`role-badge role-${role.color || 'navy'}`}>{role.label}</span>;
}
