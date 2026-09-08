export default function PageHeader({ title, actions }) {
  return (
    <div className="admin-topbar">
      <h1>{title}</h1>
      {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
    </div>
  );
}
