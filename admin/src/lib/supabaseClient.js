import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Erreur volontairement bruyante : mieux vaut un ecran blanc explicite
  // qu'un panneau admin qui semble fonctionner sans etre connecte.
  throw new Error(
    'Supabase non configure : renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (voir .env.example).'
  );
}

export const supabase = createClient(url, anonKey);

/** URL de base pour l'appel aux Edge Functions (invite/revoke). */
export const functionsUrl = `${url}/functions/v1`;
