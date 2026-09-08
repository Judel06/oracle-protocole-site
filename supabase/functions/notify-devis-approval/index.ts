// Declenchee par le trigger public.notify_devis_approval() des qu'une demande
// de devis passe a "approuve_attente_paiement" ou "refuse". verify_jwt=false :
// authentification via header x-webhook-secret (voir deploiement).
import { corsHeaders } from '../_shared/cors.ts';
import { verifyWebhookSecret } from '../_shared/verifyWebhookSecret.ts';
import { sendEmail } from '../_shared/sendEmail.ts';

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', { dateStyle: 'long' });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!verifyWebhookSecret(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.json();
    const isApproved = payload.type === 'approuve_attente_paiement';
    const services = Array.isArray(payload.services) ? payload.services.join(', ') : (payload.services || '—');

    const subject = isApproved
      ? `Demande approuvée — En attente de paiement — ${payload.organisation || payload.nom_complet}`
      : `Demande refusée — ${payload.organisation || payload.nom_complet}`;

    const commonRows = `
      <tr><td><strong>Client</strong></td><td>${payload.nom_complet}${payload.organisation ? ` (${payload.organisation})` : ''}</td></tr>
      <tr><td><strong>Service(s)</strong></td><td>${services}</td></tr>
      <tr><td><strong>Type d'événement</strong></td><td>${payload.type_evenement || '—'}</td></tr>
      <tr><td><strong>Lieu</strong></td><td>${payload.lieu || '—'}</td></tr>
      <tr><td><strong>Date</strong></td><td>${formatDate(payload.date_evenement)}</td></tr>
      <tr><td><strong>Heure</strong></td><td>${payload.heure_evenement || '—'}</td></tr>
    `;

    const html = isApproved
      ? `
        <h2 style="color:#0D1B2A;">Demande approuvée</h2>
        <p style="color:#2F855A;font-weight:bold;">Ce dossier passe en attente de paiement.</p>
        <table cellpadding="6" style="border-collapse:collapse;">${commonRows}</table>
      `
      : `
        <h2 style="color:#0D1B2A;">Demande refusée</h2>
        <table cellpadding="6" style="border-collapse:collapse;">${commonRows}</table>
        ${payload.motif_refus ? `<p><strong>Motif :</strong> ${payload.motif_refus}</p>` : ''}
      `;

    const text = `${isApproved ? 'DEMANDE APPROUVÉE — En attente de paiement' : 'DEMANDE REFUSÉE'}
Client : ${payload.nom_complet}${payload.organisation ? ` (${payload.organisation})` : ''}
Service(s) : ${services}
Type d'événement : ${payload.type_evenement || '—'}
Lieu : ${payload.lieu || '—'}
Date : ${formatDate(payload.date_evenement)}
Heure : ${payload.heure_evenement || '—'}
${!isApproved && payload.motif_refus ? `Motif : ${payload.motif_refus}` : ''}`;

    await sendEmail({ subject, html, text });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[notify-devis-approval]', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur inconnue' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
