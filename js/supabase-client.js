/* =========================================================
   ORACLE — Configuration du client Supabase
   A renseigner : URL du projet + cle publique "anon".
   Ces deux valeurs sont publiques par conception (protegees par les
   policies RLS cote base) et peuvent rester visibles dans le code front.
   ========================================================= */

const SUPABASE_URL = 'https://VOTRE-PROJET.supabase.co';
const SUPABASE_ANON_KEY = 'VOTRE_CLE_ANON_PUBLIQUE';

window.supabaseClient = (SUPABASE_URL.includes('VOTRE-PROJET'))
  ? null
  : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (!window.supabaseClient) {
  console.warn('[ORACLE] Supabase non configure : renseignez SUPABASE_URL et SUPABASE_ANON_KEY dans js/supabase-client.js');
}
