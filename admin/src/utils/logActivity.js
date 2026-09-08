import { supabase } from '../lib/supabaseClient';

/**
 * Enregistre une action dans le journal d'activite (table activity_log).
 * A appeler apres toute action sensible (changement de statut, export, etc.).
 */
export async function logActivity(action, details = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('activity_log').insert({
    admin_id: user.id,
    admin_email: user.email ?? '',
    action,
    details,
  });
}
