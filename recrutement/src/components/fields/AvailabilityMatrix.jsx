import { JOURS, PERIODES } from '../../config/steps';

/** Grille jour x periode -> {jour: {periode: bool}}. */
export default function AvailabilityMatrix({ value = {}, onChange }) {
  const toggle = (jour, periode) => {
    const jourData = value[jour] || {};
    onChange({ ...value, [jour]: { ...jourData, [periode]: !jourData[periode] } });
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="matrix-table">
        <thead>
          <tr>
            <th>Jour</th>
            {PERIODES.map((p) => <th key={p.key}>{p.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {JOURS.map((jour) => (
            <tr key={jour}>
              <td>{jour}</td>
              {PERIODES.map((p) => (
                <td key={p.key}>
                  <input
                    type="checkbox" className="matrix-check"
                    checked={Boolean(value[jour]?.[p.key])}
                    onChange={() => toggle(jour, p.key)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
