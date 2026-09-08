// Declenchee par le trigger public.notify_presence_confirmed() des qu'un
// membre du protocole passe au statut "present". Envoie un email a
// oracleprotocoleetservices@gmail.com. verify_jwt=false (voir deploiement) :
// l'authentification se fait via le header x-webhook-secret, pas un JWT.
import { corsHeaders } from '../_shared/cors.ts';
import { verifyWebhookSecret } from '../_shared/verifyWebhookSecret.ts';
import { sendEmail } from '../_shared/sendEmail.ts';

const NIVEAU_LABELS: Record<string, string> = {
  niveau_1: 'Niveau 1 – Accès Total',
  niveau_2: 'Niveau 2 – Zone Officielle',
  niveau_3: 'Niveau 3 – Zone Générale',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!verifyWebhookSecret(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.json();
    const niveau = NIVEAU_LABELS[payload.niveau_accreditation] || payload.niveau_accreditation;
    const heure = payload.heure_arrivee
      ? new Date(payload.heure_arrivee).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Port-au-Prince' })
      : '—';

    const subject = `Présence confirmée — ${payload.nom_complet}`;
    const html = `
      <h2 style="color:#0D1B2A;">Confirmation de présence — Protocole ORACLE</h2>
      ${payload.evenement_nom ? `<p><strong>Événement :</strong> ${payload.evenement_nom}</p>` : ''}
      <table cellpadding="6" style="border-collapse:collapse;">
        <tr><td><strong>Membre</strong></td><td>${payload.nom_complet}</td></tr>
        <tr><td><strong>Niveau d'accréditation</strong></td><td>${niveau}</td></tr>
        <tr><td><strong>Affectation</strong></td><td>${payload.affectation}</td></tr>
        <tr><td><strong>Lieu</strong></td><td>${payload.lieu_arrivee || '—'}</td></tr>
        <tr><td><strong>Heure d'arrivée</strong></td><td>${heure}</td></tr>
      </table>
    `;
    const text = `Confirmation de présence — Protocole ORACLE
${payload.evenement_nom ? `Événement : ${payload.evenement_nom}\n` : ''}Membre : ${payload.nom_complet}
Niveau d'accréditation : ${niveau}
Affectation : ${payload.affectation}
Lieu : ${payload.lieu_arrivee || '—'}
Heure d'arrivée : ${heure}`;

    await sendEmail({ subject, html, text });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[notify-presence]', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur inconnue' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
