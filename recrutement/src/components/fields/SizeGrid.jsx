/** Grille simple label -> valeur texte (tailles vestimentaires). */
export default function SizeGrid({ items, value = {}, onChange }) {
  return (
    <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr', rowGap: 18 }}>
      {items.map((item) => (
        <div key={item.key}>
          <label className="field-label" style={{ fontWeight: 600, fontSize: '.84rem' }}>{item.label}</label>
          <input type="text" value={value[item.key] || ''} onChange={(e) => onChange({ ...value, [item.key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}
