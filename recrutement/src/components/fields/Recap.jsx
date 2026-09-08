export default function Recap({ formData }) {
  const d = formData;
  const row = (k, v) => v ? <div className="recap-row" key={k}><span className="k">{k}</span><span>{v}</span></div> : null;

  return (
    <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 6, padding: 20, marginBottom: 8 }}>
      <div className="recap-section">
        <h4>Identité</h4>
        {row('Nom complet', [d.prenom, d.nom].filter(Boolean).join(' '))}
        {row('Email', d.email)}
        {row('Téléphone', d.telephone)}
        {row('Ville', [d.ville, d.pays].filter(Boolean).join(', '))}
      </div>
      <div className="recap-section">
        <h4>Profil</h4>
        {row('Poste actuel', d.poste_actuel)}
        {row('Expérience protocole', d.experience_protocole ? 'Oui' : 'Non')}
        {row('Années d\'expérience', d.annees_experience)}
      </div>
      <div className="recap-section">
        <h4>Disponibilité & mobilité</h4>
        {row('Niveau', d.disponibilite_niveau)}
        {row('Véhicule', d.vehicule ? 'Oui' : 'Non')}
        {row('Zone de déplacement', d.zone_geo_max)}
      </div>
      <div className="recap-section">
        <h4>Missions souhaitées</h4>
        {row('Catégories', Array.isArray(d.types_missions_souhaitees) ? d.types_missions_souhaitees.join(', ') : '')}
        {row('Rôles préférés', Array.isArray(d.roles_preferes) ? d.roles_preferes.join(', ') : '')}
      </div>
      <p className="field-help" style={{ marginTop: 4 }}>
        Vérifiez ces informations. Vous pourrez revenir en arrière avec le bouton « Précédent » avant de soumettre définitivement.
      </p>
    </div>
  );
}
