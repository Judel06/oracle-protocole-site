export default function ConfirmationScreen({ numeroMembre }) {
  return (
    <main className="wizard-main">
      <div className="confirmation-screen">
        <div className="confirmation-icon">✓</div>
        <h2 className="step-title">Candidature envoyée</h2>
        <p className="step-desc">
          Merci. Votre candidature a bien été reçue par l'équipe ORACLE Protocole & Services.
          Nous l'examinerons avec attention et reviendrons vers vous prochainement.
        </p>
        {numeroMembre && (
          <div className="numero-membre-badge">Référence : {numeroMembre}</div>
        )}
        <p className="field-help">Conservez cette référence pour tout suivi ultérieur de votre dossier.</p>
      </div>
    </main>
  );
}
