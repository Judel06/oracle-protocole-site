export default function YesNo({ value, onChange }) {
  return (
    <div className="yesno-group">
      <button type="button" className={`yesno-btn ${value === true ? 'active' : ''}`} onClick={() => onChange(true)}>Oui</button>
      <button type="button" className={`yesno-btn ${value === false ? 'active' : ''}`} onClick={() => onChange(false)}>Non</button>
    </div>
  );
}
