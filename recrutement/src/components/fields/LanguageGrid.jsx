const NIVEAUX = ['Aucun', 'Notions', 'Intermédiaire', 'Courant', 'Bilingue'];

/** Liste dynamique {langue, comprehension, oral, ecrit}. */
export default function LanguageGrid({ value = [], onChange }) {
  const update = (i, patch) => {
    const next = [...value];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...value, { langue: '', comprehension: 'Intermédiaire', oral: 'Intermédiaire', ecrit: 'Intermédiaire' }]);
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      {value.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="matrix-table">
            <thead><tr><th>Langue</th><th>Compréhension</th><th>Oral</th><th>Écrit</th><th></th></tr></thead>
            <tbody>
              {value.map((row, i) => (
                <tr key={i}>
                  <td><input type="text" placeholder="Ex. Français" value={row.langue} onChange={(e) => update(i, { langue: e.target.value })} style={{ width: 130 }} /></td>
                  {['comprehension', 'oral', 'ecrit'].map((dim) => (
                    <td key={dim}>
                      <select className="matrix-select" value={row[dim]} onChange={(e) => update(i, { [dim]: e.target.value })}>
                        {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                  ))}
                  <td><button type="button" className="icon-btn" onClick={() => remove(i)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="button" className="btn btn-outline" style={{ marginTop: 12 }} onClick={add}>+ Ajouter une langue</button>
    </div>
  );
}
