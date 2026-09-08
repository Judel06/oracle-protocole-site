const NIVEAUX = ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'];

/** Grille outil -> niveau (select). */
export default function ToolLevelGrid({ items, value = {}, onChange }) {
  return (
    <div>
      {items.map((tool) => (
        <div key={tool} className="rating-row">
          <span className="rating-row-label">{tool}</span>
          <select className="matrix-select" value={value[tool] || 'Débutant'} onChange={(e) => onChange({ ...value, [tool]: e.target.value })}>
            {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}
