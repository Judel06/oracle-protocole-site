function Stars({ value, onChange }) {
  return (
    <div className="rating-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className={`rating-star ${value >= n ? 'active' : ''}`} onClick={() => onChange(n)} aria-label={`${n} sur 5`}>
          {n}
        </button>
      ))}
    </div>
  );
}

/** Grille d'auto-evaluation 1-5 sur une liste d'items -> stocke {item: note}. */
export default function RatingGrid({ items, value = {}, onChange }) {
  return (
    <div>
      {items.map((item) => (
        <div key={item} className="rating-row">
          <span className="rating-row-label">{item}</span>
          <Stars value={value[item] || 0} onChange={(n) => onChange({ ...value, [item]: n })} />
        </div>
      ))}
    </div>
  );
}

export function RatingSingle({ value, onChange }) {
  return <Stars value={value || 0} onChange={onChange} />;
}
