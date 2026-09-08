import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import Wizard from './components/Wizard';
import ConfirmationScreen from './components/ConfirmationScreen';

const TOKEN_STORAGE_KEY = 'oracle_recrutement_token';

export default function App() {
  const [phase, setPhase] = useState('loading'); // loading | form | submitted | error
  const [candidatId, setCandidatId] = useState(null);
  const [token, setToken] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [numeroMembre, setNumeroMembre] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function bootstrap() {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        const storedToken = urlToken || localStorage.getItem(TOKEN_STORAGE_KEY);

        if (storedToken) {
          const { data, error } = await supabase.rpc('rpc_get_candidat_draft', { p_token: storedToken });
          if (!error && data) {
            setCandidatId(data.id);
            setToken(storedToken);
            setInitialData(data);
            localStorage.setItem(TOKEN_STORAGE_KEY, storedToken);
            setPhase('form');
            return;
          }
        }

        // Aucun brouillon existant/valide : on en cree un nouveau
        const { data, error } = await supabase.rpc('rpc_create_candidat_draft');
        if (error || !data?.[0]) throw error || new Error('Création du brouillon impossible.');
        const { id, resume_token } = data[0];
        setCandidatId(id);
        setToken(resume_token);
        setInitialData({});
        localStorage.setItem(TOKEN_STORAGE_KEY, resume_token);

        const url = new URL(window.location.href);
        url.searchParams.set('token', resume_token);
        window.history.replaceState({}, '', url);

        setPhase('form');
      } catch (err) {
        console.error(err);
        setErrorMsg("Impossible de charger le formulaire. Vérifiez votre connexion et rechargez la page.");
        setPhase('error');
      }
    }
    bootstrap();
  }, []);

  const handleSubmitted = (numero) => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setNumeroMembre(numero);
    setPhase('submitted');
  };

  return (
    <div className="recrutement-shell">
      <header className="recrutement-header">
        <div className="recrutement-header-inner">
          <div className="recrutement-logo">
            <span className="mark">O</span>
            <div>
              <strong>ORACLE</strong>
              <span>Recrutement</span>
            </div>
          </div>
        </div>
      </header>

      {phase === 'loading' && (
        <main className="wizard-main"><p>Chargement du formulaire…</p></main>
      )}

      {phase === 'error' && (
        <main className="wizard-main"><p className="field-error">{errorMsg}</p></main>
      )}

      {phase === 'form' && (
        <Wizard candidatId={candidatId} token={token} initialData={initialData} onSubmitted={handleSubmitted} />
      )}

      {phase === 'submitted' && <ConfirmationScreen numeroMembre={numeroMembre} />}
    </div>
  );
}
