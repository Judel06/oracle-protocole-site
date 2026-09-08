// Invite un nouvel administrateur par email.
// Reserve aux admins actifs (verifie via verifyAdmin, qui utilise service_role
// uniquement a l'interieur de cette fonction — jamais expose au client).
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdmin } from '../_shared/verifyAdmin.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { adminClient, callerId } = await verifyAdmin(req);
    const { email, role } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email requis.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const safeRole = role === 'editor' ? 'editor' : 'admin';

    // 1. Invite via l'API Admin Auth (envoie l'email d'invitation Supabase)
    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email);
    if (inviteError || !invited?.user) {
      return new Response(JSON.stringify({ error: inviteError?.message || 'Invitation impossible.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Enregistre le compte dans admin_users avec le role choisi
    const { error: insertError } = await adminClient.from('admin_users').insert({
      id: invited.user.id,
      email,
      role: safeRole,
      invited_by: callerId,
    });
    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Journal d'activite
    await adminClient.from('activity_log').insert({
      admin_id: callerId,
      admin_email: (await adminClient.auth.admin.getUserById(callerId)).data.user?.email ?? '',
      action: 'user_invite',
      details: { invited_email: email, role: safeRole },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
