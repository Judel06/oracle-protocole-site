export default function LoadingSpinner({ inline = false }) {
  if (inline) return <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />;
  return (
    <div className="center-loading">
      <span className="spinner" />
    </div>
  );
}
