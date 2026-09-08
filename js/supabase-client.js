/* =========================================================
   ORACLE — Configuration du client Supabase
   A renseigner : URL du projet + cle publique "anon".
   Ces deux valeurs sont publiques par conception (protegees par les
   policies RLS cote base) et peuvent rester visibles dans le code front.
   ========================================================= */

const SUPABASE_URL = 'https://wnaojfnjnnsfjgjwdosn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduYW9qZm5qbm5zZmpnandkb3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MzU3NzAsImV4cCI6MjEwNDQxMTc3MH0.Jj1UJLgwNp4ATzh3gt0z-0vbfRQha0OeqKYuupF0ee8';

window.supabaseClient = (SUPABASE_URL.includes('VOTRE-PROJET'))
  ? null
  : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (!window.supabaseClient) {
  console.warn('[ORACLE] Supabase non configure : renseignez SUPABASE_URL et SUPABASE_ANON_KEY dans js/supabase-client.js');
}
