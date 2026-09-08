export default function CheckboxGroup({ options, value = [], onChange }) {
  const toggle = (opt) => {
    const next = value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt];
    onChange(next);
  };
  return (
    <div className="choice-group">
      {options.map((opt) => (
        <label key={opt} className={`choice-option ${value.includes(opt) ? 'selected' : ''}`}>
          <input type="checkbox" checked={value.includes(opt)} onChange={() => toggle(opt)} />
          {opt}
        </label>
      ))}
    </div>
  );
}

/** Variante ou chaque option a une cle distincte de son libelle et stocke un objet {cle: bool}. */
export function CheckboxGroupBool({ options, value = {}, onChange }) {
  const toggle = (key) => onChange({ ...value, [key]: !value[key] });
  return (
    <div className="choice-group">
      {options.map((opt) => (
        <label key={opt.key} className={`choice-option ${value[opt.key] ? 'selected' : ''}`}>
          <input type="checkbox" checked={Boolean(value[opt.key])} onChange={() => toggle(opt.key)} />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
