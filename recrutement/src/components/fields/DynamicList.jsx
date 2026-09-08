/** Liste dynamique de texte libre (diplomes, certifications). */
export default function DynamicList({ value = [], onChange, placeholder }) {
  const update = (i, v) => { const next = [...value]; next[i] = v; onChange(next); };
  const add = () => onChange([...value, '']);
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      {value.map((v, i) => (
        <div key={i} className="dynamic-list-row">
          <input type="text" placeholder={placeholder} value={v} onChange={(e) => update(i, e.target.value)} />
          <button type="button" className="icon-btn" onClick={() => remove(i)}>✕</button>
        </div>
      ))}
      <button type="button" className="btn btn-outline" onClick={add}>+ Ajouter</button>
    </div>
  );
}
