// Revoque l'acces admin d'un utilisateur (desactive le compte plutot que de le
// supprimer, pour garder l'historique/tracabilite). Reserve aux admins actifs.
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdmin } from '../_shared/verifyAdmin.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { adminClient, callerId, callerEmail } = await verifyAdmin(req);
    const { userId } = await req.json();

    if (!userId || typeof userId !== 'string') {
      return new Response(JSON.stringify({ error: 'Identifiant utilisateur requis.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (userId === callerId) {
      return new Response(JSON.stringify({ error: 'Vous ne pouvez pas révoquer votre propre accès.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: target, error: targetError } = await adminClient
      .from('admin_users')
      .select('email')
      .eq('id', userId)
      .maybeSingle();
    if (targetError || !target) {
      return new Response(JSON.stringify({ error: 'Utilisateur introuvable.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: updateError } = await adminClient
      .from('admin_users')
      .update({ active: false })
      .eq('id', userId);
    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Empeche aussi toute nouvelle connexion du compte cote Supabase Auth
    await adminClient.auth.admin.updateUserById(userId, { ban_duration: '876000h' });

    await adminClient.from('activity_log').insert({
      admin_id: callerId,
      admin_email: callerEmail,
      action: 'user_revoke',
      details: { revoked_user_id: userId, revoked_email: target.email },
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
