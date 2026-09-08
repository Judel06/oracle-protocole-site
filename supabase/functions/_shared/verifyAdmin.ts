import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Verifie que le JWT porte par la requete appartient a un admin actif.
 * Retourne { adminClient, callerId, callerEmail } si autorise, sinon lance une erreur.
 * adminClient utilise la cle service_role : reserve a un usage cote fonction, jamais expose.
 */
export async function verifyAdmin(req: Request): Promise<{
  adminClient: SupabaseClient;
  callerId: string;
  callerEmail: string;
}> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) throw new Error('UNAUTHORIZED');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Client "appelant" : verifie le JWT et recupere l'identite (cle anon, RLS active)
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser(jwt);
  if (userError || !userData?.user) throw new Error('UNAUTHORIZED');

  // Client "service" : bypass RLS, utilise uniquement pour verifier le role puis agir
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: adminRow, error: adminError } = await adminClient
    .from('admin_users')
    .select('id, active')
    .eq('id', userData.user.id)
    .eq('active', true)
    .maybeSingle();

  if (adminError || !adminRow) throw new Error('FORBIDDEN');

  return { adminClient, callerId: userData.user.id, callerEmail: userData.user.email ?? '' };
}
