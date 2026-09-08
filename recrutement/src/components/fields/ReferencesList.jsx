/**
 * Liste de references pro (facultatif). Stockee localement dans formData
 * en attendant la soumission finale, ou l'app les insere une a une dans
 * candidat_references (voir handleSubmit dans Wizard).
 */
export default function ReferencesList({ value = [], onChange }) {
  const update = (i, patch) => { const next = [...value]; next[i] = { ...next[i], ...patch }; onChange(next); };
  const add = () => onChange([...value, { nom: '', fonction: '', organisation: '', telephone: '', email: '', autorisation_verification: false }]);
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      {value.map((ref, i) => (
        <div key={i} className="card-pad" style={{ border: '1.5px solid var(--border)', borderRadius: 6, padding: 16, marginBottom: 14 }}>
          <div className="field-row">
            <input type="text" placeholder="Nom" value={ref.nom} onChange={(e) => update(i, { nom: e.target.value })} />
            <input type="text" placeholder="Fonction" value={ref.fonction} onChange={(e) => update(i, { fonction: e.target.value })} />
          </div>
          <div className="field-row" style={{ marginTop: 10 }}>
            <input type="text" placeholder="Organisation" value={ref.organisation} onChange={(e) => update(i, { organisation: e.target.value })} />
            <input type="tel" placeholder="Téléphone" value={ref.telephone} onChange={(e) => update(i, { telephone: e.target.value })} />
          </div>
          <input type="email" placeholder="Email" value={ref.email} onChange={(e) => update(i, { email: e.target.value })} style={{ marginTop: 10, width: '100%', padding: '11px 13px', border: '1.5px solid var(--border)', borderRadius: 6 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: '.86rem' }}>
            <input type="checkbox" checked={ref.autorisation_verification} onChange={(e) => update(i, { autorisation_verification: e.target.checked })} />
            J'autorise ORACLE à contacter cette référence
          </label>
          <button type="button" className="icon-btn" style={{ marginTop: 10 }} onClick={() => remove(i)}>✕ Retirer</button>
        </div>
      ))}
      <button type="button" className="btn btn-outline" onClick={add}>+ Ajouter une référence</button>
    </div>
  );
}
