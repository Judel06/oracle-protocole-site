import { supabase } from '../lib/supabaseClient';

/**
 * Enregistre une action dans le journal d'activite (table activity_log).
 * A appeler apres toute action sensible (creation, modification, validation, suppression, export).
 * Le role de l'auteur est ajoute automatiquement aux details.
 */
export async function logActivity(action, details = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase.from('admin_users').select('roles, role').eq('id', user.id).maybeSingle();
  const roles = profile?.roles?.length ? profile.roles.join(', ') : profile?.role;
  await supabase.from('activity_log').insert({
    admin_id: user.id,
    admin_email: user.email ?? '',
    action,
    details: { ...details, role: roles },
  });
}
