const RESEAUX = [
  { key: 'linkedin', label: 'LinkedIn' }, { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' }, { key: 'x', label: 'X / Twitter' },
];

export default function SocialLinks({ value = {}, onChange }) {
  return (
    <div>
      {RESEAUX.map((r) => (
        <div className="field-block" key={r.key} style={{ marginBottom: 14 }}>
          <input type="text" placeholder={r.label} value={value[r.key] || ''} onChange={(e) => onChange({ ...value, [r.key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}
